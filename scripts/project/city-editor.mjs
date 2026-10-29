// City editor: bundles src/editor with esbuild (watch mode) and serves it on localhost,
// with a tiny API that stores layouts in public/city-layouts/ for Remotion.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, '.cache', 'city-editor');
const layouts = path.join(root, 'public', 'city-layouts');
const port = Number(process.env.PORT ?? 5199);
const NAME = /^[a-z0-9][a-z0-9-]{0,47}$/;

await fs.mkdir(layouts, {recursive: true});
const ctx = await esbuild.context({
  entryPoints: [path.join(root, 'src/editor/main.tsx')],
  outfile: path.join(outDir, 'editor.js'),
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  sourcemap: true,
  target: 'es2020',
  define: {'process.env.NODE_ENV': '"development"'},
  logLevel: 'info',
});
await ctx.watch();

const send = (res, code, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(code, {'Content-Type': type, 'Cache-Control': 'no-store'});
  res.end(body);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return send(res, 200, await fs.readFile(path.join(root, 'src/editor/index.html')), 'text/html; charset=utf-8');
    }
    if (url.pathname === '/editor.js' || url.pathname === '/editor.js.map') {
      return send(res, 200, await fs.readFile(path.join(outDir, path.basename(url.pathname))), 'text/javascript; charset=utf-8');
    }
    if (url.pathname === '/api/layouts' && req.method === 'GET') {
      const files = (await fs.readdir(layouts)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
      return send(res, 200, JSON.stringify(files), 'application/json');
    }
    const match = url.pathname.match(/^\/api\/layouts\/([^/]+)$/);
    if (match) {
      const name = decodeURIComponent(match[1]);
      if (!NAME.test(name)) return send(res, 400, 'Nom invalide');
      const file = path.join(layouts, `${name}.json`);
      if (req.method === 'GET') return send(res, 200, await fs.readFile(file), 'application/json');
      if (req.method === 'PUT') {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 20_000_000) return send(res, 413, 'Fichier trop gros');
        }
        const layout = JSON.parse(body);
        if (!Array.isArray(layout.items)) return send(res, 400, 'Format invalide');
        await fs.writeFile(file, JSON.stringify({...layout, name, version: 1}, null, 1) + '\n', 'utf8');
        return send(res, 200, 'ok');
      }
    }
    send(res, 404, 'Introuvable');
  } catch (error) {
    send(res, error.code === 'ENOENT' ? 404 : 500, String(error.message ?? error));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`\nÉditeur de ville : http://127.0.0.1:${port}\nVilles enregistrées dans public/city-layouts/\n`);
});
