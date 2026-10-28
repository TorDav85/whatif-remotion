import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('copy a real base, compile it, keep original audio paths, reject collisions and traversal', () => {
  const cache = path.join(root, '.cache');
  fs.mkdirSync(cache, {recursive: true});
  const fixture = fs.mkdtempSync(path.join(cache, 'project-test-'));
  try {
    fs.cpSync(path.join(root, 'src'), path.join(fixture, 'src'), {recursive: true});
    fs.mkdirSync(path.join(fixture, 'scripts/project'), {recursive: true});
    fs.copyFileSync(path.join(root, 'scripts/project/video.mjs'), path.join(fixture, 'scripts/project/video.mjs'));
    fs.copyFileSync(path.join(root, 'tsconfig.json'), path.join(fixture, 'tsconfig.json'));
    const cli = (...args) => spawnSync(process.execPath, [path.join(fixture, 'scripts/project/video.mjs'), ...args], {encoding: 'utf8'});
    const config = path.join(fixture, 'src/videos/nature-v2/nature.json');
    const original = hash(config);
    const result = cli('copy', 'nature-v2', 'copie-test');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(hash(config), original, 'source was modified');
    const copied = JSON.parse(fs.readFileSync(path.join(fixture, 'src/videos/copie-test/nature.json'), 'utf8'));
    assert.equal(copied.audio.music, 'copie-test.wav');
    assert.equal(copied.audio.voiceDir, 'voice-copie-test');
    assert.equal(copied.audio.voice, false);
    const catalog = path.join(fixture, 'src/videos/catalog.json');
    const entries = JSON.parse(fs.readFileSync(catalog, 'utf8'));
    assert.equal(entries.at(-1).id, 'VideoCopieTest');
    assert.equal(entries.at(-1).output, 'out/copie-test.mp4');
    const compile = spawnSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--project', path.join(fixture, 'tsconfig.json')], {encoding: 'utf8'});
    assert.equal(compile.status, 0, compile.stdout + compile.stderr);
    const savedCatalog = hash(catalog);
    assert.notEqual(cli('copy', 'nature-v2', 'copie-test').status, 0);
    assert.notEqual(cli('copy', 'nature-v2', '../outside').status, 0);
    assert.equal(hash(catalog), savedCatalog);
    assert.equal(cli('sync').status, 0);
  } finally {
    const resolved = path.resolve(fixture);
    assert.equal(path.dirname(resolved), path.resolve(cache));
    assert.ok(path.basename(resolved).startsWith('project-test-'));
    fs.rmSync(resolved, {recursive: true, force: true});
  }
});
