import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.js';
import { createRoutes, HttpError } from './routes.js';
import { createGemini } from './gemini.js';

export async function createApp({ dataPath = resolve('data/demo.json'), modelFactory = () => createGemini() } = {}) {
  const store = await createStore(dataPath);
  const route = createRoutes(store, modelFactory);
  const files = { '/': ['index.html','text/html'], '/app.js': ['app.js','text/javascript'], '/styles.css': ['styles.css','text/css'] };
  const server = createServer(async (req, res) => {
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options':'nosniff' }); res.end(JSON.stringify(value)); };
    try {
      const host = req.headers.host;
      if (!/^127\.0\.0\.1:\d+$/.test(host || '')) throw new HttpError(403, 'Use the local app address.');
      const url = new URL(req.url, `http://${host}`);
      if (url.pathname.startsWith('/api/')) {
        let body = {};
        if (req.method === 'POST') {
          if (req.headers.origin && req.headers.origin !== `http://${host}`) throw new HttpError(403, 'Only this local app can send changes.');
          if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'JSON required.');
          let raw = '';
          for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 24000) throw new HttpError(413, 'Message too large.'); }
          try { body = JSON.parse(raw); } catch { throw new HttpError(400, 'Invalid request.'); }
          if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Invalid request.');
        }
        return json(200, await route(req.method, url.pathname, body));
      }
      const file = files[url.pathname];
      if (req.method !== 'GET' || !file) throw new HttpError(404, 'Not found.');
      const content = await readFile(new URL(`../public/${file[0]}`, import.meta.url));
      res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'" });
      res.end(content);
    } catch (error) { json(error.status || 500, { error: error.status ? error.message : 'The local app could not save or complete this request. Please retry.' }); }
  });
  return { server, store };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { server } = await createApp();
    server.listen(3000, '127.0.0.1', () => console.log('Connection Companion: http://127.0.0.1:3000/'));
    server.on('error', () => { console.error('Could not start the local server. Check whether port 3000 is already in use.'); process.exitCode = 1; });
  } catch { console.error('Could not load saved demo data. Existing data has not been erased.'); process.exitCode = 1; }
}
