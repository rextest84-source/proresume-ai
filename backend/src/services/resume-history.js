import { createHash } from 'crypto';
import { query } from '../db.js';

const MAX_VERSIONS_PER_RESUME = 100;

function hashData(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export async function getLatestVersionHash(resumeId) {
  const { rows } = await query(
    `SELECT data FROM resume_versions
     WHERE resume_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [resumeId]
  );
  if (!rows[0]) return null;
  return hashData(rows[0].data);
}

export async function saveResumeVersion({ resumeId, userId, data, title, source = 'auto' }) {
  const nextHash = hashData(data);
  const prevHash = await getLatestVersionHash(resumeId);
  if (prevHash === nextHash) return null;

  const { rows } = await query(
    `INSERT INTO resume_versions (resume_id, user_id, title, data, source)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, resume_id, title, source, created_at`,
    [resumeId, userId, title || 'My Resume', JSON.stringify(data), source]
  );

  await query(
    `DELETE FROM resume_versions
     WHERE resume_id = $1
       AND id NOT IN (
         SELECT id FROM resume_versions
         WHERE resume_id = $1
         ORDER BY created_at DESC
         LIMIT $2
       )`,
    [resumeId, MAX_VERSIONS_PER_RESUME]
  );

  return rows[0];
}

export async function listResumeVersions(resumeId, userId, { limit = 50 } = {}) {
  const { rows } = await query(
    `SELECT v.id, v.title, v.source, v.created_at,
            v.data->>'name' AS preview_name,
            v.data->>'title' AS preview_title
     FROM resume_versions v
     INNER JOIN resumes r ON r.id = v.resume_id
     WHERE v.resume_id = $1 AND r.user_id = $2
     ORDER BY v.created_at DESC
     LIMIT $3`,
    [resumeId, userId, limit]
  );
  return rows;
}

export async function getResumeVersion(versionId, userId) {
  const { rows } = await query(
    `SELECT v.id, v.resume_id, v.title, v.data, v.source, v.created_at
     FROM resume_versions v
     INNER JOIN resumes r ON r.id = v.resume_id
     WHERE v.id = $1 AND r.user_id = $2`,
    [versionId, userId]
  );
  return rows[0] || null;
}
