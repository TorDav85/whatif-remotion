import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS, sampleShots, shiftShot, shotsDuration, shotStarts, trajectory, viewAt, FADE, type Shot, type View} from '../src/assets/city/camera';

const view = (pos: [number, number, number], target: [number, number, number] = [0, 0, 0], fov = 50): View => ({pos, target, fov});
const line = (over: Partial<Shot> = {}): Shot => ({
  id: 'a', name: 'A', duration: 4, path: 'ligne', ease: 'lineaire',
  from: view([0, 10, 40]), to: view([20, 10, 40]), ...over,
});
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const ctx = {cx: 0, cz: 0, size: 120, focus: {x: 10, z: -5, h: 25, r: 7, dx: -1, dz: 0}, street: {x: 31, z: -5}};

test('durée totale et débuts de plans', () => {
  const shots = [line({duration: 4}), line({id: 'b', duration: 2.5}), line({id: 'c', duration: 0})];
  assert.equal(shotsDuration(shots), 4 + 2.5 + 0.1);
  assert.deepEqual(shotStarts(shots), [0, 4, 6.5]);
});

test('un plan démarre sur sa vue de début et finit sur sa vue de fin', () => {
  const s = line();
  assert.deepEqual(sampleShots([s], 0).pos, [0, 10, 40]);
  const end = sampleShots([s], 4).pos;
  assert.ok(dist(end, [20, 10, 40]) < 1e-3, `fin ${end}`);
});

test('pas de saut de caméra à l’intérieur d’un plan', () => {
  const s = line({ease: 'doux', duration: 5});
  let prev = sampleShots([s], 0).pos;
  for (let i = 1; i <= 300; i++) {
    const p = sampleShots([s], (i / 300) * 5).pos;
    assert.ok(dist(p, prev) < 0.25, `saut de ${dist(p, prev).toFixed(3)} m à ${i}`);
    prev = p;
  }
});

test('coupe franche entre deux plans', () => {
  const a = line();
  const b = line({id: 'b', from: view([100, 5, 0]), to: view([100, 5, -10])});
  assert.equal(sampleShots([a, b], 3.99).index, 0);
  assert.equal(sampleShots([a, b], 4.01).index, 1);
  assert.ok(dist(sampleShots([a, b], 4.01).pos, [100, 5, 0]) < 0.2);
});

test('l’orbite garde son rayon et prend le chemin le plus court', () => {
  const r = 30;
  const at = (deg: number) => view([Math.sin((deg * Math.PI) / 180) * r, 12, Math.cos((deg * Math.PI) / 180) * r]);
  const s = line({path: 'orbite', from: at(170), to: at(-170)});
  for (let k = 0; k <= 1; k += 0.1) {
    const p = viewAt(s, k).pos;
    assert.ok(Math.abs(Math.hypot(p[0], p[2]) - r) < 1e-6);
  }
  // Midway it must pass behind (180°), not through the front (0°).
  const mid = viewAt(s, 0.5).pos;
  assert.ok(mid[2] < -29, `milieu ${mid}`);
});

test('fondu au noir autour d’une transition « fondu », rien pour une coupe', () => {
  const a = line();
  const b = line({id: 'b', transition: 'fondu'});
  assert.equal(sampleShots([a, b], 4).fade, 1);
  assert.equal(sampleShots([a, b], 4 + FADE + 0.5).fade, 0);
  assert.ok(sampleShots([a, b], 4 - FADE / 2).fade > 0.4);
  assert.equal(sampleShots([a, line({id: 'c'})], 4).fade, 0);
  assert.equal(sampleShots([b], 0).fade, 0, 'pas de fondu sur le tout premier plan');
});

test('tremblé épaule : reproductible et absent à 0', () => {
  const calm = line();
  const shaky = line({shake: 0.8});
  assert.deepEqual(sampleShots([calm], 1.3).pos, viewAt(calm, 1.3 / 4).pos);
  assert.deepEqual(sampleShots([shaky], 1.3), sampleShots([shaky], 1.3));
  const offset = dist(sampleShots([shaky], 1.3).pos, viewAt(shaky, 1.3 / 4).pos);
  assert.ok(offset > 0 && offset < 0.4, `décalage ${offset}`);
});

test('chaque mouvement du réalisateur donne une caméra valide', () => {
  assert.ok(PRESETS.length >= 14);
  const keys = new Set(PRESETS.map((p) => p.key));
  assert.equal(keys.size, PRESETS.length, 'clés uniques');
  for (const p of PRESETS) {
    const s = {id: p.key, ...p.make(ctx)};
    assert.ok(s.duration > 0, p.key);
    for (const v of [s.from, s.to]) {
      for (const n of [...v.pos, ...v.target, v.fov]) assert.ok(Number.isFinite(n), `${p.key} : ${n}`);
      assert.ok(v.fov >= 10 && v.fov <= 120, `${p.key} fov ${v.fov}`);
      assert.ok(v.pos[1] >= 0.3, `${p.key} caméra sous le sol (${v.pos[1]})`);
      assert.ok(dist(v.pos, v.target) > 0.5, `${p.key} caméra collée à sa cible`);
    }
    assert.equal(trajectory(s, 10).length, 11);
  }
});

test('les plans centrés sur un sujet filment sa façade, du côté où elle regarde', () => {
  // The subject faces -x (dx = -1): cameras must stand on the -x side of it.
  for (const key of ['vertigo', 'tilt', 'pieton', 'epaule', 'contre', 'grue', 'reveal', 'panoramique', 'suivi']) {
    const s = PRESETS.find((p) => p.key === key)!.make(ctx);
    for (const v of [s.from, s.to]) assert.ok(v.pos[0] < ctx.focus.x, `${key} : caméra derrière le sujet (x = ${v.pos[0].toFixed(1)})`);
  }
});

test('effet Vertigo : le sujet garde la même taille à l’écran', () => {
  const p = PRESETS.find((x) => x.key === 'vertigo')!;
  const s = p.make(ctx);
  const size = (v: View) => dist(v.pos, v.target) * Math.tan((v.fov * Math.PI) / 360);
  assert.ok(Math.abs(size(s.from) - size(s.to)) / size(s.from) < 0.03);
  assert.ok(s.to.fov > s.from.fov, 'le champ s’élargit en avançant');
});

test('recadrage : décaler un plan déplace caméra et cible ensemble', () => {
  const s = line({to: view([20, 10, 40], [5, 2, -3], 40)});
  const m = shiftShot(s, 3, -2);
  for (const k of [0, 0.5, 1]) {
    const a = viewAt(s, k);
    const b = viewAt(m, k);
    assert.deepEqual(b.pos.map((x, i) => x - a.pos[i]), [3, 0, -2]);
    assert.deepEqual(b.target.map((x, i) => Math.round((x - a.target[i]) * 1e9) / 1e9), [3, 0, -2]);
    assert.equal(b.fov, a.fov);
  }
  assert.equal(m.id, s.id);
});

test('liste vide : caméra par défaut sans plantage', () => {
  const v = sampleShots([], 3);
  assert.equal(v.fade, 0);
  assert.ok(v.pos.every(Number.isFinite));
});
