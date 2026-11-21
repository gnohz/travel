import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.writeHead(302, { Location: '/travel/' }); return res.end(); }
  if (url.pathname === '/travel') { res.writeHead(301, { Location: '/travel/' }); return res.end(); }
  if (!url.pathname.startsWith('/travel/')) { res.writeHead(404); return res.end('Not found'); }
  let name;
  try { name = decodeURIComponent(url.pathname.slice('/travel/'.length)); }
  catch { res.writeHead(400); return res.end('Invalid URL'); }
  let path = resolve(root, name);
  if (path !== root && !path.startsWith(root + '/')) { res.writeHead(403); return res.end(); }
  try {
    if ((await stat(path)).isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' }); return res.end(); }
      path = resolve(path, 'index.html');
    }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173/travel/sedona-2026/'));
