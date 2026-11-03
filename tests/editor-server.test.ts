import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn, type ChildProcess} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {shotFrames} from '../scripts/check/shot-frames.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'city-layouts-'));
const port = 5300 + Math.floor(Math.random() * 600);
const base = `http://127.0.0.1:${port}`;
let server: ChildProcess;

before(async () => {
  server = spawn(process.execPath, ['scripts/project/city-editor.mjs'], {
    env: {...process.env, PORT: String(port), CITY_LAYOUTS_DIR: dir, CITY_EDITOR_NO_BUILD: '1'},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('serveur non démarré')), 15000);
    server.stdout!.on('data', (d) => {
      if (String(d).includes('127.0.0.1')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.on('exit', (code) => reject(new Error(`serveur arrêté (${code})`)));
  });
});
after(() => {
  server?.kill();
  fs.rmSync(dir, {recursive: true, force: true});
});

const put = (name: string, body: string) => fetch(`${base}/api/layouts/${name}`, {method: 'PUT', body, headers: {'Content-Type': 'application/json'}});
const layout = {version: 1, name: 'x', items: [{id: 'a', type: 'tree', x: 1, y: 0, z: 2, ry: 0, props: {}}], camera: {shots: []}};

test('enregistrer puis relire une ville', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/layouts`)).json(), []);
  assert.equal((await put('ma-ville', JSON.stringify(layout))).status, 200);
  const back = await (await fetch(`${base}/api/layouts/ma-ville`)).json();
  assert.equal(back.name, 'ma-ville', 'le nom suit le fichier');
  assert.deepEqual(back.items, layout.items);
  assert.deepEqual(await (await fetch(`${base}/api/layouts`)).json(), ['ma-ville']);
  assert.ok(fs.existsSync(path.join(dir, 'ma-ville.json')));
});

test('noms dangereux ou invalides refusés, rien n’est écrit hors du dossier', async () => {
  for (const name of ['..%2F..%2Fevil', 'Ma%20Ville', '%2E%2E', '-start', 'a'.repeat(60), '%E0%A4%A']) {
    const r = await put(name, JSON.stringify(layout));
    assert.ok(r.status === 400 || r.status === 404, `${name} → ${r.status}`);
  }
  assert.deepEqual(fs.readdirSync(dir).sort(), ['ma-ville.json']);
  assert.ok(!fs.existsSync(path.join(dir, '..', 'evil.json')));
});

test('contenu invalide refusé proprement', async () => {
  assert.equal((await put('cassee', '{pas du json')).status, 400);
  assert.equal((await put('cassee', JSON.stringify({version: 1}))).status, 400);
  assert.equal((await put('cassee', 'null')).status, 400);
  assert.ok(!fs.existsSync(path.join(dir, 'cassee.json')));
});

test('ville absente : 404', async () => {
  assert.equal((await fetch(`${base}/api/layouts/inconnue`)).status, 404);
});

test('npm run stills --shots : une image au milieu de chaque plan', () => {
  const shots = [{name: 'A', duration: 4}, {name: 'B', duration: 2}, {name: 'C', duration: 0}];
  assert.deepEqual(shotFrames({camera: {shots}}, 30), [
    {frame: 60, label: 'A'}, {frame: 150, label: 'B'}, {frame: 182, label: 'C'},
  ]);
  assert.deepEqual(shotFrames({}, 30), []);
});
