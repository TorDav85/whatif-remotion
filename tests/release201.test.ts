import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {cameraSignature, assertCamerasLocked} from '../scripts/export/release-camera-lock.mjs';
import release from '../src/releases/v2-01/catalog.json';

test('la 2.01 couvre vingt films avec des ids et des sorties séparés', () => {
  assert.equal(release.videos.length, 20);
  assert.equal(new Set(release.videos.map((v) => v.id)).size, 20);
  assert.equal(new Set(release.videos.map((v) => v.slug)).size, 20);
  for (const video of release.videos) {
    const source = JSON.parse(fs.readFileSync(video.config, 'utf8'));
    for (const key of ['fps', 'width', 'height', 'duration']) assert.equal(video[key], source[key], `${video.slug}.${key}`);
    assert.notEqual(video.id, video.sourceId);
  }
});

test('le verrou autorise une retouche de lumière et refuse un changement de caméra', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'remotion-release-201-'));
  try {
    fs.mkdirSync(path.join(base, 'src'));
    const file = path.join(base, 'src/Scene.tsx');
    const source = 'export const Scene = () => <><CameraRig position={[1,2,3]} target={[0,1,0]} fov={45}/></>;';
    fs.writeFileSync(file, source);
    const lock = cameraSignature(base);
    assert.ok(Object.keys(lock).length > 0);
    fs.writeFileSync(file, source.replace('</>', '<directionalLight intensity={1.5}/></>'));
    assert.doesNotThrow(() => assertCamerasLocked(base, lock));
    fs.writeFileSync(file, source.replace('[1,2,3]', '[3,2,1]'));
    assert.throws(() => assertCamerasLocked(base, lock), /Caméras modifiées/);
  } finally {
    const target = path.resolve(base), allowed = path.resolve(os.tmpdir()) + path.sep;
    assert.ok(target.startsWith(allowed) && path.basename(target).startsWith('remotion-release-201-'));
    fs.rmSync(target, {recursive: true, force: true});
  }
});
