import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {AIRFOIL_DEFAULT, airfoilOutline, nacaAt, streamline} from '../src/assets/holo/Airfoil';
import {DURATION, LIFTOFF, RECOVER, RUNWAY, SHOTS, STALL, V_LIFTOFF, planeAt, viewAt} from '../src/videos/avion-portance/Scene3D';
import narration from '../src/videos/avion-portance/narration.json';

test('profil NACA : épaisseur ≈ 13 % de la corde, bords fermés, cambré vers le haut', () => {
  const c = AIRFOIL_DEFAULT.chord;
  let max = 0;
  for (let x = 0; x <= c; x += c / 200) {
    const h = nacaAt(x);
    assert.ok(h.upper >= h.lower - 1e-9);
    max = Math.max(max, h.upper - h.lower);
  }
  assert.ok(Math.abs(max / c - 0.13) < 0.01, `épaisseur ${max / c}`);
  assert.ok(Math.abs(nacaAt(0).upper - nacaAt(0).lower) < 1e-9);
  assert.ok(nacaAt(0.4 * c).camber > 0);
  assert.ok(airfoilOutline().length > 40);
});

test('lignes de courant : au-dessus restent au-dessus, déviées vers le bas derrière l’aile', () => {
  const up = streamline(0.5, 0);
  const lo = streamline(-0.7, 0);
  const c = AIRFOIL_DEFAULT.chord;
  for (const [x, y] of up) if (x >= 0 && x <= c) assert.ok(y > nacaAt(x).upper - 0.3 * c * 0.1);
  assert.ok(up[up.length - 1][1] < up[0][1], 'déflexion vers le bas');
  assert.ok(lo.every(([, y]) => Number.isFinite(y)));
});

test('vol : continu, jamais sous la piste, décolle à la vitesse prévue, décroche puis récupère', () => {
  let prev = planeAt(RUNWAY);
  for (let f = Math.round(RUNWAY * 30) + 1; f < DURATION * 30; f++) {
    const s = planeAt(f / 30);
    assert.ok(s.pos.every(Number.isFinite) && s.pos[1] >= 0, `frame ${f}`);
    assert.ok(Math.hypot(s.pos[1] - prev.pos[1], s.pos[2] - prev.pos[2]) < 4, `saut à la frame ${f}`);
    prev = s;
  }
  assert.equal(planeAt(LIFTOFF - 0.1).pos[1], 0);
  assert.ok(planeAt(LIFTOFF + 1.5).pos[1] > 5);
  assert.ok(Math.abs(planeAt(LIFTOFF).speed - V_LIFTOFF) < 10);
  assert.ok(planeAt(STALL + 0.5).lift < 0.7, 'portance effondrée');
  assert.ok(planeAt(RECOVER + 1).lift >= 1);
  assert.ok(planeAt(RECOVER).pos[1] > 10, 'récupération en l’air');
});

test('portance au sol ∝ v² : à mi-vitesse de décollage, un quart du poids', () => {
  const t = RUNWAY + 0.01;
  const s = planeAt(t);
  assert.ok(Math.abs(s.lift - (s.speed / V_LIFTOFF) ** 2) < 1e-9);
});

test('caméra et narration de l’avion', () => {
  const starts = SHOTS.map((s) => s.from);
  [...starts, DURATION].forEach((s, i, all) => i && assert.ok(s - all[i - 1] <= 8 && s > all[i - 1]));
  for (let f = 0; f < DURATION * 30; f += 5) {
    const v = viewAt(f / 30);
    assert.ok([v.pos.x, v.pos.y, v.pos.z, v.target.x, v.fov].every(Number.isFinite) && v.pos.y > 0.5, `frame ${f}`);
  }
  let prev = 0;
  for (const b of narration.beats) {
    assert.ok(b.slot[0] >= prev && b.slot[1] <= narration.duration, b.id);
    prev = b.slot[1];
  }
});

test('avion : ni hasard, ni horloge, ni useFrame', () => {
  const banned = /Math\.random\(|Date\.now\(|performance\.now\(|useFrame\(|requestAnimationFrame\(/;
  for (const f of ['src/videos/avion-portance/Scene3D.tsx', 'src/videos/avion-portance/TextOverlay.tsx', 'src/videos/avion-portance/AvionPortance.tsx',
    'src/assets/holo/Airliner.tsx', 'src/assets/holo/Airfoil.tsx']) {
    assert.ok(!banned.test(fs.readFileSync(path.join(f), 'utf8')), f);
  }
});
