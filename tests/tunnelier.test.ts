import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CUTTERS, TBM, slotAngle} from '../src/assets/holo/Tbm';
import {
  COLLAPSE, DURATION, RESTORE, RING, SEGMENT_TIMES, SHOTS, THRUST, chamberPressure, faceZ, placedSegments, viewAt,
} from '../src/videos/tunnelier/Scene3D';
import narration from '../src/videos/tunnelier/narration.json';

test('tunnelier : molettes sur la roue, voussoirs répartis sur le tour', () => {
  assert.ok(CUTTERS.length > 20);
  assert.ok(CUTTERS.every(([x, y]) => Math.hypot(x, y) < TBM.radius));
  const a = Array.from({length: TBM.segments}, (_, i) => slotAngle(i));
  a.forEach((x, i) => i && assert.ok(Math.abs(x - a[i - 1] - (2 * Math.PI) / TBM.segments) < 1e-9));
});

test('cycle : avance d’un anneau pendant la poussée, puis pose des 7 voussoirs', () => {
  assert.ok(Math.abs(faceZ(THRUST - 0.1)) < 1e-12);
  assert.ok(Math.abs(faceZ(RING) + TBM.ringWidth) < 1e-6, 'avance = largeur d’anneau');
  for (let t = 0; t < DURATION; t += 0.1) assert.ok(faceZ(t + 0.1) <= faceZ(t) + 1e-12, 'jamais en arrière');
  assert.equal(placedSegments(RING), 0);
  assert.equal(placedSegments(SEGMENT_TIMES[SEGMENT_TIMES.length - 1] + 1), TBM.segments);
  assert.ok(SEGMENT_TIMES[SEGMENT_TIMES.length - 1] + 0.5 < 41.2, 'anneau fini avant la question');
});

test('pression : équilibrée hors de la démonstration d’effondrement', () => {
  assert.equal(chamberPressure(COLLAPSE - 1), 1);
  assert.ok(chamberPressure((COLLAPSE + RESTORE) / 2) < 0.3);
  assert.ok(chamberPressure(RESTORE + 1) > 0.999);
});

test('caméra et narration du tunnelier', () => {
  const starts = SHOTS.map((s) => s.from);
  [...starts, DURATION].forEach((s, i, all) => i && assert.ok(s - all[i - 1] <= 8 && s > all[i - 1]));
  for (let f = 0; f < DURATION * 30; f += 5) {
    const v = viewAt(f / 30);
    assert.ok([v.pos.x, v.pos.y, v.pos.z, v.target.x, v.fov].every(Number.isFinite), `frame ${f}`);
  }
  let prev = 0;
  for (const b of narration.beats) {
    assert.ok(b.slot[0] >= prev && b.slot[1] <= narration.duration, b.id);
    prev = b.slot[1];
  }
});

test('tunnelier : ni hasard, ni horloge, ni useFrame', () => {
  const banned = /Math\.random\(|Date\.now\(|performance\.now\(|useFrame\(|requestAnimationFrame\(/;
  for (const f of ['src/videos/tunnelier/Scene3D.tsx', 'src/videos/tunnelier/TextOverlay.tsx', 'src/videos/tunnelier/Tunnelier.tsx', 'src/assets/holo/Tbm.tsx']) {
    assert.ok(!banned.test(fs.readFileSync(f, 'utf8')), f);
  }
});
