import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planUrbanFabric, riverZ} from '../src/shared/three/urban-fabric';
import {CHARACTER_BOX, CROWD_BODY, CROWD_HEAD} from '../src/shared/characters/CharacterParts';

test('les quartiers sont reproductibles et la graine change réellement le décor', () => {
  const a = planUrbanFabric({parcels: 30, radius: 700});
  assert.deepEqual(a, planUrbanFabric({parcels: 30, radius: 700}));
  assert.notDeepEqual(a, planUrbanFabric({parcels: 30, radius: 700, seed: 91}));
  assert.ok(a.length > 150);
  assert.ok(new Set(a.map((b) => b.yaw.toFixed(2))).size > 20, 'les îlots ne suivent pas tous les mêmes axes');
});

test('le décor respecte le quartier jouable et les berges du fleuve', () => {
  const exclude = {minX: -100, maxX: 100, minZ: -350, maxZ: 150};
  for (const b of planUrbanFabric({exclude, radius: 1600, parcels: 120})) {
    const margin = Math.hypot(b.width / 0.96, b.depth) / 2 + 2;
    assert.ok(b.x + margin <= exclude.minX || b.x - margin >= exclude.maxX || b.z + margin <= exclude.minZ || b.z - margin >= exclude.maxZ);
    assert.ok(Math.abs(b.z - riverZ(b.x)) >= 60 + margin);
    for (const n of Object.values(b)) assert.ok(Number.isFinite(n));
    assert.ok(b.width > 0 && b.depth > 0 && b.height > 0);
  }
});

test('le prolongement de la ville couvre toutes les directions au-delà du décor de rue', () => {
  const items = planUrbanFabric({radius: 2400, parcels: 220});
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    assert.ok(items.some((b) => b.x * sx > 800 && (b.z + 400) * sz > 800));
  }
});

test('les géométries des personnages ont des sommets et normales valides', () => {
  for (const geometry of [CHARACTER_BOX, CROWD_BODY, CROWD_HEAD]) {
    for (const attribute of ['position', 'normal']) {
      const values = geometry.getAttribute(attribute).array;
      assert.ok(values.length > 0);
      for (const n of values) assert.ok(Number.isFinite(n));
    }
    geometry.computeBoundingBox();
    assert.ok(geometry.boundingBox!.max.y > geometry.boundingBox!.min.y);
  }
  assert.ok(Math.abs(CROWD_BODY.boundingBox!.min.y) < 1e-6, 'les pieds restent au niveau du sol');
});
