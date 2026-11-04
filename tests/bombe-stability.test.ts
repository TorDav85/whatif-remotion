import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_CROSSINGS, cityRoadFootprints, debrisVariation, windowDamageAt} from '../src/videos/bombe-nucleaire/stability';

test('les chaussées couvrent les carrefours sans aucune surface superposée', () => {
  const roads = cityRoadFootprints();
  for (const road of roads) {
    assert.ok(road.maxX > road.minX && road.maxZ > road.minZ);
  }
  for (let i = 0; i < roads.length; i++) for (let j = i + 1; j < roads.length; j++) {
    const a = roads[i], b = roads[j];
    const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
    const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
    assert.ok(overlapX <= 1e-9 || overlapZ <= 1e-9, `surfaces ${i} et ${j} superposées`);
  }
  const covered = (x: number, z: number) => roads.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
  for (const z of CITY_CROSSINGS) {
    for (const x of [-600, -100, -57, 0, 57, 100, 600]) assert.ok(covered(x, z));
    for (const x of [-57, 0, 57]) for (const offset of [-6.01, -6, 6, 6.01]) assert.ok(covered(x, z + offset));
  }
  assert.equal(covered(8.1, 8), false, 'la chaussée doit laisser libre l’escalier de l’abri');
});

test('une fenêtre cassée ne se répare pas pendant la progression du souffle', () => {
  for (let b = 0; b < 16; b++) for (let face = 0; face < 4; face++) for (let floor = 0; floor < 6; floor++) {
    for (let col = 0; col < 6; col++) {
      let broken = false;
      const scarHeight = windowDamageAt(0, b, face, floor, col).scarHeight;
      for (let step = 0; step <= 20; step++) {
        const state = windowDamageAt(step / 20, b, face, floor, col);
        if (broken) assert.equal(state.broken, true);
        assert.equal(state.scarHeight, scarHeight);
        broken = state.broken;
      }
    }
  }
});

test('les fragments existants gardent les mêmes variations lorsque leur nombre augmente', () => {
  const first = Array.from({length: 10}, (_, i) => debrisVariation(9, i));
  const later = Array.from({length: 45}, (_, i) => debrisVariation(9, i));
  assert.deepEqual(first, later.slice(0, 10));
  assert.notDeepEqual(debrisVariation(9, 0), debrisVariation(10, 0));
});
