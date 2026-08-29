/**
 * WebSocket live resume sync — pushes cloud saves to other tabs/devices in real time.
 */
(function () {
  const CLIENT_ID_KEY = 'proresume_client_id';
  let socket = null;
  let resumeId = null;
  let reconnectTimer = null;
  let reconnectDelay = 1000;
  let onRemoteUpdate = null;
  let pingTimer = null;

  function getClientId() {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id && window.crypto?.randomUUID) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id || 'client';
  }

  function wsBaseUrl() {
    const httpBase = (window.PRORESUME_CONFIG?.apiUrl || '').replace(/\/$/, '');
    if (!httpBase) return null;
    const url = new URL(httpBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    return url.toString();
  }

  function clearTimers() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer || !resumeId || !window.ProResumeAPI?.isLoggedIn()) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect(resumeId, onRemoteUpdate);
      reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
    }, reconnectDelay);
  }

  function connect(targetResumeId, callback) {
    onRemoteUpdate = callback;
    resumeId = targetResumeId;

    const token = window.ProResumeAPI?.getToken?.();
    const base = wsBaseUrl();
    if (!token || !base || !resumeId) return;

    disconnect(false);

    const url = `${base}?token=${encodeURIComponent(token)}`;
    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      reconnectDelay = 1000;
      socket.send(JSON.stringify({
        type: 'subscribe',
        resumeId,
        clientId: getClientId()
      }));
      pingTimer = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 45000);
    });

    socket.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === 'resume:updated' && typeof onRemoteUpdate === 'function') {
        onRemoteUpdate(msg);
      }
    });

    socket.addEventListener('close', () => {
      clearTimers();
      socket = null;
      scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      socket?.close();
    });
  }

  function disconnect(clearResume = true) {
    clearTimers();
    if (socket) {
      socket.close();
      socket = null;
    }
    if (clearResume) resumeId = null;
  }

  window.ProResumeRealtime = {
    getClientId,
    connect,
    disconnect,
    isConnected() {
      return socket?.readyState === WebSocket.OPEN;
    }
  };
})();
