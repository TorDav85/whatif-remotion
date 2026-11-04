import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {along, arcPoints, catenary, flickerSeed, pulseAt, ringRadius} from '../src/shared/holo/geometry';
import {frNumber, glitchAt} from '../src/shared/holo/HudOverlay';
import {conductorPoints, conductorY, powerLineLayout} from '../src/assets/holo/PowerLine';
import {birdWingTip} from '../src/assets/holo/Bird';
import {BIRD, BIRD_ROT, DURATION, LINE, SHOTS, WING_TIP, viewAt} from '../src/videos/oiseau-haute-tension/Scene3D';
import narration from '../src/videos/oiseau-haute-tension/narration.json';

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

test('chaînette : extrémités exactes, flèche au milieu', () => {
  const pts = catenary([0, 10, -20], [0, 10, 20], 1.5, 40);
  assert.equal(pts.length, 41);
  assert.deepEqual(pts[0], [0, 10, -20]);
  assert.deepEqual(pts[40], [0, 10, 20]);
  assert.ok(close(pts[20][1], 8.5));
  assert.ok(pts.every((p) => p[1] <= 10 + 1e-9));
});

test('arc électrique : déterministe, extrémités fixes, change avec la graine', () => {
  const a = arcPoints([0, 0, 0], [1, 2, 0], 42);
  const b = arcPoints([0, 0, 0], [1, 2, 0], 42);
  const c = arcPoints([0, 0, 0], [1, 2, 0], 43);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.length, 2 ** 5 + 1);
  assert.deepEqual(a[0], [0, 0, 0]);
  assert.deepEqual(a[a.length - 1], [1, 2, 0]);
  assert.equal(flickerSeed(3, 10, 2), flickerSeed(3, 11, 2));
  assert.notEqual(flickerSeed(3, 11, 2), flickerSeed(3, 12, 2));
});

test('impulsions : périodiques dans le temps et le long du câble', () => {
  for (const u of [0, 0.13, 0.5, 0.91]) {
    assert.ok(close(pulseAt(u, 1.2, 8, 0.25), pulseAt(u, 1.2 + 1 / 0.25, 8, 0.25), 1e-6));
    assert.ok(close(pulseAt(u, 0.7, 8, 0.25), pulseAt(u + 1 / 8, 0.7, 8, 0.25), 1e-6));
    const k = pulseAt(u, 0.4, 8, 0.25);
    assert.ok(k >= 0 && k <= 1);
  }
  assert.equal(ringRadius(1, 2, 0, 5, 1, 3), null);
  assert.equal(ringRadius(3, 2, 0, 5, 1, 3), 5);
});

test('point le long d’une polyligne', () => {
  const pts: [number, number, number][] = [[0, 0, 0], [1, 0, 0], [1, 1, 0]];
  assert.deepEqual(along(pts, 0).p, [0, 0, 0]);
  assert.deepEqual(along(pts, 0.75).p, [1, 0.5, 0]);
  assert.deepEqual(along(pts, 1).p, [1, 1, 0]);
});

test('ligne : conducteur continu passant par les pinces', () => {
  const L = powerLineLayout();
  const pts = conductorPoints(L, 0);
  assert.deepEqual(pts[0], [L.phases[0][0], L.phases[0][1], L.pylons[0]]);
  assert.ok(pts.some((p) => close(p[2], 0) && close(p[1], L.phases[0][1])));
  assert.ok(close(conductorY(L, 0, 0), L.phases[0][1]));
  assert.ok(conductorY(L, 0, 23) < L.phases[0][1] - 1);
});

test('oiseau : l’aile ouverte touche le bas de la traverse du pylône', () => {
  assert.ok(Math.abs(WING_TIP[1] - LINE.armY) < 0.01, `pointe d'aile à y=${WING_TIP[1]}`);
  assert.ok(Math.abs(WING_TIP[2]) < 0.25, 'pointe d’aile dans l’épaisseur de la traverse');
  const folded = birdWingTip({open: 0, raise: 1}, 'right', BIRD, BIRD_ROT);
  assert.ok(folded[1] < LINE.armY - 0.2, 'aile repliée loin de la traverse');
});

test('caméra : plans ordonnés, ≤ 8 s, sans NaN sur toute la vidéo', () => {
  const starts = SHOTS.map((s) => s.from);
  assert.equal(starts[0], 0);
  starts.forEach((s, i) => i && assert.ok(s > starts[i - 1]));
  [...starts, DURATION].forEach((s, i, all) => i && assert.ok(s - all[i - 1] <= 8, `plan ${i} trop long`));
  for (let f = 0; f < DURATION * 30; f += 5) {
    const v = viewAt(f / 30);
    assert.ok([v.pos.x, v.pos.y, v.pos.z, v.target.x, v.target.y, v.target.z, v.fov].every(Number.isFinite), `frame ${f}`);
    assert.ok(v.pos.y > 0.3, `caméra sous le sol à la frame ${f}`);
  }
});

test('narration : créneaux ordonnés dans la vidéo, débit tenable', () => {
  let prev = 0;
  for (const b of narration.beats) {
    assert.ok(b.slot[0] >= prev && b.slot[1] > b.slot[0] && b.slot[1] <= narration.duration, b.id);
    const words = b.text.split(/\s+/).length;
    assert.ok(words / (b.slot[1] - b.slot[0]) <= 2.5 * 1.3, `${b.id} : ${words} mots trop serrés`);
    prev = b.slot[1];
  }
});

test('sous-titres : ordonnés, courts', () => {
  const file = path.join('src/videos/oiseau-haute-tension/captions.json');
  if (!fs.existsSync(file)) return;
  const caps = JSON.parse(fs.readFileSync(file, 'utf8')) as {segments: {start: number; end: number; text: string}[]};
  let prev = 0;
  for (const s of caps.segments) {
    assert.ok(s.start >= prev - 1e-6 && s.end > s.start, s.text);
    assert.ok(s.text.length <= 32, `« ${s.text} » trop long`);
    prev = s.end;
  }
});

test('HUD : nombres à la française, glitch borné', () => {
  assert.equal(frNumber(20000), '20 000');
  assert.equal(frNumber(11547.005), '11 547');
  assert.equal(frNumber(0.003, 3), '0,003');
  assert.equal(glitchAt(5, [[4, 6]]), 1);
  assert.equal(glitchAt(7, [[4, 6]]), 0);
});

test('animation pilotée par la frame : ni hasard, ni horloge, ni useFrame', () => {
  const dirs = ['src/shared/holo', 'src/assets/holo', 'src/videos/oiseau-haute-tension'];
  const banned = /Math\.random\(|Date\.now\(|performance\.now\(|useFrame\(|requestAnimationFrame\(/;
  for (const dir of dirs) {
    for (const f of fs.readdirSync(dir).filter((x) => /\.tsx?$/.test(x))) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      assert.ok(!banned.test(src), `${dir}/${f} utilise une source non déterministe`);
    }
  }
});
