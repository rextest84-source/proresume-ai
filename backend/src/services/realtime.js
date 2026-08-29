import { WebSocketServer } from 'ws';
import { verifyToken } from '../lib/jwt.js';
import { subscribeResumeSync, publishResumeSync, isRedisConfigured } from './redis.js';
import { query } from '../db.js';

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const resumeRooms = new Map();

/** @type {WeakMap<import('ws').WebSocket, { userId: string, resumeId: string | null, clientId: string | null }>} */
const socketMeta = new WeakMap();

function roomKey(userId, resumeId) {
  return `${userId}:${resumeId}`;
}

function addToRoom(userId, resumeId, ws) {
  const key = roomKey(userId, resumeId);
  if (!resumeRooms.has(key)) resumeRooms.set(key, new Set());
  resumeRooms.get(key).add(ws);
}

function removeFromAllRooms(ws) {
  for (const members of resumeRooms.values()) {
    members.delete(ws);
  }
}

function broadcastLocal(userId, resumeId, payload) {
  const members = resumeRooms.get(roomKey(userId, resumeId));
  if (!members?.size) return;

  const message = JSON.stringify(payload);
  for (const ws of members) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

async function userOwnsResume(userId, resumeId) {
  const { rows } = await query(
    'SELECT id FROM resumes WHERE id = $1 AND user_id = $2',
    [resumeId, userId]
  );
  return Boolean(rows[0]);
}

function sendJson(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function attachRealtimeServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url || '/ws', 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(4401, 'Authentication required');
        return;
      }

      const payload = verifyToken(token);
      socketMeta.set(ws, { userId: payload.sub, resumeId: null, clientId: null });
      sendJson(ws, { type: 'connected', userId: payload.sub });
    } catch {
      ws.close(4401, 'Invalid token');
      return;
    }

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        sendJson(ws, { type: 'error', error: 'Invalid JSON' });
        return;
      }

      const meta = socketMeta.get(ws);
      if (!meta) return;

      if (msg.type === 'subscribe') {
        const resumeId = (msg.resumeId || '').trim();
        const clientId = (msg.clientId || '').trim() || null;
        if (!resumeId) {
          sendJson(ws, { type: 'error', error: 'resumeId is required' });
          return;
        }

        const owns = await userOwnsResume(meta.userId, resumeId);
        if (!owns) {
          sendJson(ws, { type: 'error', error: 'Resume not found' });
          return;
        }

        removeFromAllRooms(ws);
        meta.resumeId = resumeId;
        meta.clientId = clientId;
        addToRoom(meta.userId, resumeId, ws);
        sendJson(ws, { type: 'subscribed', resumeId });
        return;
      }

      if (msg.type === 'ping') {
        sendJson(ws, { type: 'pong', ts: Date.now() });
      }
    });

    ws.on('close', () => removeFromAllRooms(ws));
  });

  subscribeResumeSync((event) => {
    broadcastLocal(event.userId, event.resumeId, {
      type: 'resume:updated',
      resumeId: event.resumeId,
      resume: event.resume,
      clientId: event.clientId || null,
      updatedAt: event.updatedAt
    });
  }).catch((err) => {
    console.warn('Resume sync subscriber failed:', err.message);
  });

  console.log('WebSocket resume sync active on /ws');
  return wss;
}

export async function notifyResumeUpdated({ userId, resumeId, resume, clientId }) {
  const event = {
    userId,
    resumeId,
    resume,
    clientId: clientId || null,
    updatedAt: resume.updated_at || new Date().toISOString()
  };

  const payload = {
    type: 'resume:updated',
    resumeId,
    resume,
    clientId: event.clientId,
    updatedAt: event.updatedAt
  };

  if (isRedisConfigured()) {
    await publishResumeSync(event);
    return;
  }

  broadcastLocal(userId, resumeId, payload);
}

export function getRealtimeStats() {
  let connections = 0;
  for (const members of resumeRooms.values()) {
    connections += members.size;
  }
  return { connections, rooms: resumeRooms.size };
}
