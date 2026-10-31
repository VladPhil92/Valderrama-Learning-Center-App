import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('.');
const allowed = new Set([
  '/index.html', '/styles.css', '/src/app.js', '/src/data.js', '/src/filters.js',
  '/docs/PROTECCION_INFANCIA.md', '/docs/CODIGO_CONDUCTA.md',
  '/docs/REGLAMENTO_INTERNO.md', '/docs/PRIVACIDAD_BORRADOR.md'
]);
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.md':'text/plain; charset=utf-8' };
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const safePath = path === '/' ? '/index.html' : path;
    if (!allowed.has(safePath)) { res.writeHead(404).end('Archivo no encontrado'); return; }
    const body = await readFile(resolve(root, '.' + safePath));
    res.writeHead(200, { 'Content-Type': mime[extname(safePath)], 'X-Content-Type-Options': 'nosniff' }).end(body);
  } catch { res.writeHead(404).end('Archivo no encontrado'); }
}).listen(port, () => console.log(`Valderrama Learning Center en http://localhost:${port}`));
