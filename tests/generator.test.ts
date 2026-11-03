import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateCity, DEFAULT_GEN} from '../src/assets/city/generator';
import {ASSET_BY_TYPE, type LayoutItem} from '../src/assets/city/registry';
import {footprint, surfaceY} from '../src/editor/geometry';

const city = generateCity({}, 'test');
const of = (type: string, items = city.items) => items.filter((i) => i.type === type);

test('même graine → même ville, autre graine → autre ville', () => {
  assert.deepEqual(generateCity({seed: 7}), generateCity({seed: 7}));
  assert.notDeepEqual(generateCity({seed: 7}).items, generateCity({seed: 8}).items);
});

test('chaque objet généré existe dans le catalogue, avec un id unique et des coordonnées valides', () => {
  const ids = new Set<string>();
  for (const it of city.items) {
    assert.ok(ASSET_BY_TYPE[it.type], `type inconnu : ${it.type}`);
    assert.ok(!ids.has(it.id), `id en double : ${it.id}`);
    ids.add(it.id);
    for (const n of [it.x, it.y, it.z, it.ry]) assert.ok(Number.isFinite(n), `${it.id} : ${n}`);
  }
});

test('la ville par défaut contient les ingrédients attendus', () => {
  for (const type of ['haussmann', 'shop', 'road', 'intersection', 'sidewalk', 'water', 'bridge', 'barge', 'tower', 'eiffel', 'tree', 'car', 'person']) {
    assert.ok(of(type).length > 0, `aucun ${type}`);
  }
  assert.equal(of('tower').length, DEFAULT_GEN.towers);
  assert.equal(of('bridge').length, DEFAULT_GEN.bridges);
});

test('les options suppriment bien ce qu’elles désactivent', () => {
  // "trees" only drives street trees: squares and modern blocks keep their own, so turn them off too.
  const bare = generateCity({seine: false, towers: 0, eiffel: false, cars: 0, people: 0, shops: 0, trees: false, parks: 0, modern: 0});
  for (const type of ['water', 'bridge', 'barge', 'tour-boat', 'tower', 'eiffel', 'car', 'person', 'shop', 'tree']) {
    assert.equal(of(type, bare.items).length, 0, `${type} présent alors que désactivé`);
  }
});

test('aucun immeuble n’en chevauche un autre', () => {
  const size = (it: LayoutItem) => {
    const p = {...ASSET_BY_TYPE[it.type].defaults, ...it.props} as Record<string, number>;
    return footprint(it, Number(p.width), Number(p.depth));
  };
  // Corner flanks (depth 0.6) are facades glued inside their host: not separate buildings.
  const buildings = city.items.filter((i) => ['haussmann', 'shop', 'modern-block'].includes(i.type) && Number(i.props.depth ?? 12) > 1);
  const boxes = buildings.map((b) => ({b, f: size(b)}));
  const tol = 0.15;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].f;
      const c = boxes[j].f;
      const overlap = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0) > tol && Math.min(a.z1, c.z1) - Math.max(a.z0, c.z0) > tol;
      assert.ok(!overlap, `${boxes[i].b.id} chevauche ${boxes[j].b.id}`);
    }
  }
});

test('immeubles et magasins sont posés sur un trottoir', () => {
  for (const b of city.items.filter((i) => i.type === 'haussmann' || i.type === 'shop')) {
    assert.equal(b.y, 0.15, `${b.id} n’est pas à hauteur de trottoir`);
    assert.equal(surfaceY(city.items, b.x, b.z), 0.15, `${b.id} n’a pas de trottoir dessous`);
  }
});

test('les voitures restent sur la chaussée', () => {
  for (const c of of('car')) assert.equal(surfaceY(city.items, c.x, c.z), 0, `${c.id} est sur un trottoir`);
});

test('la ville survit à un aller-retour JSON (enregistrement)', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(city)), city);
});

test('les tailles extrêmes du générateur restent valides', () => {
  for (const o of [{cols: 1, rows: 1, blockW: 24, blockD: 24}, {cols: 4, rows: 3, blockW: 80, blockD: 60, street: 20}]) {
    const c = generateCity(o);
    assert.ok(c.items.length > 20);
    assert.ok(c.items.every((i) => [i.x, i.z].every(Number.isFinite)));
  }
});
