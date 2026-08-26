import { createServer } from 'http';

/** Minimal HTTP server for Railway health checks on worker/cron services. */
export function startHealthServer({ service, port, getStatus }) {
  const server = createServer(async (req, res) => {
    if (req.url !== '/health' && req.url !== '/health/ready') {
      res.writeHead(404);
      res.end();
      return;
    }

    try {
      const status = await getStatus();
      const ok = req.url === '/health' ? true : status.ready !== false;
      res.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok, service, ...status }));
    } catch (err) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, service, error: err.message }));
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`${service} health listening on port ${port}`);
  });

  return server;
}
