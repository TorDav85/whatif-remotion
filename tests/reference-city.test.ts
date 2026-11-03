import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {viewAt} from '../src/assets/city/camera';
import {ASSET_BY_TYPE} from '../src/assets/city/registry';
import {REFERENCE_WORLD, generateReferenceWorld, worldItem} from '../src/assets/city/reference/world';
import {PLACES, PLACE_IDS} from '../src/assets/city/reference/places';
import {REFERENCE_SHOTS} from '../src/assets/city/reference/shots';
import {applyVariants, getPlace, interaction, placeShots, resolveEpisodeSet, splitDetail, spot} from '../src/assets/city/reference/episode';
import {buildingAt, buildingBoxes, inZone} from '../src/assets/city/reference/checks';

const FILE = 'public/city-layouts/ville-reference.json';
const ids = new Set(REFERENCE_WORLD.items.map((i) => i.id));
const near = (a: number[], b: number[], d: number) => Math.hypot(a[0] - b[0], a[2] - b[2]) <= d;

test('monde : la régénération donne exactement le fichier figé', () => {
  const onDisk = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  // Compared as JSON, like the freeze script (-0 from the generator is written 0).
  assert.deepEqual(JSON.parse(JSON.stringify(generateReferenceWorld())), onDisk);
  assert.equal(REFERENCE_WORLD.items.length, onDisk.items.length);
});

test('monde : figé en lecture seule, chaque objet existe au catalogue avec un id unique', () => {
  assert.ok(Object.isFrozen(REFERENCE_WORLD) && Object.isFrozen(REFERENCE_WORLD.items[0].props));
  assert.throws(() => { (REFERENCE_WORLD.items[0] as {x: number}).x = 1; }, TypeError);
  assert.equal(ids.size, REFERENCE_WORLD.items.length);
  for (const it of REFERENCE_WORLD.items) assert.ok(ASSET_BY_TYPE[it.type], `type inconnu ${it.type}`);
  assert.equal(REFERENCE_WORLD.camera, undefined, 'les caméras ne vivent pas dans le monde');
});

test('repères urbains présents : fleuve, ponts, tour Eiffel, tours', () => {
  for (const type of ['water', 'bridge', 'eiffel', 'tower']) assert.ok(REFERENCE_WORLD.items.some((i) => i.type === type), type);
});

test('lieux : identifiants stables, objets référencés existants', () => {
  assert.deepEqual(Object.keys(PLACES).sort(), [...PLACE_IDS].sort());
  for (const id of PLACE_IDS) {
    const p = PLACES[id];
    assert.equal(p.id, id);
    assert.ok(ids.has(p.anchor), `${id} : ancre ${p.anchor}`);
    for (const item of p.items) assert.ok(ids.has(item), `${id} : objet ${item}`);
    for (const i of p.interactions) if (i.item) {
      assert.ok(ids.has(i.item), `${id}/${i.id} : objet ${i.item}`);
      // Measured from the centre: a building's front is half its depth away.
      const it = worldItem(i.item);
      assert.ok(near(i.pos, [it.x, 0, it.z], 3 + Number(it.props.depth ?? 0) / 2), `${id}/${i.id} loin de ${i.item}`);
    }
  }
});

test('lieux : points de placement, d’interaction et ancre dans la zone', () => {
  for (const id of PLACE_IDS) {
    const p = PLACES[id];
    assert.ok(inZone(p.zone, p.pos), `${id} : position hors zone`);
    for (const s of p.spots) assert.ok(inZone(p.zone, s.pos), `${id}/${s.id} hors zone ${s.pos}`);
    // A window or a door sits on the zone's wall: a few centimetres of tolerance.
    for (const i of p.interactions) assert.ok(inZone(p.zone, i.pos, 0.3), `${id}/${i.id} hors zone ${i.pos}`);
    assert.equal(new Set(p.spots.map((s) => s.id)).size, p.spots.length, `${id} : spots en double`);
  }
});

test('appartement : bâtiment identifié de la rue, fenêtres sur sa façade, vue vers la place', () => {
  const p = PLACES['appartement-marc'];
  const b = worldItem(p.interior!.building);
  assert.equal(b.type, 'haussmann');
  assert.ok(PLACES['rue-marc'].items.includes(b.id), 'l’immeuble fait partie de rue-marc');
  const facadeZ = b.z - Number(b.props.depth) / 2;
  for (const w of p.interior!.windows) {
    assert.ok(Math.abs(w[2] - facadeZ) < 1e-6, 'fenêtre sur la façade');
    assert.ok(Math.abs(w[0] - b.x) < Number(b.props.width) / 2, 'fenêtre dans la largeur de l’immeuble');
  }
  // The flat looks north (-z), the square is on that side.
  assert.equal(b.ry, 0);
  assert.ok(PLACES['place-centrale'].pos[2] < facadeZ);
  // Floor 3 of a 7-floor building, within its walls.
  assert.ok(p.interior!.floor < Number(b.props.floors));
});

test('identifiant de lieu, de point ou de cadrage inconnu : erreur claire', () => {
  assert.throws(() => getPlace('appartement-julien'), /Lieu inconnu « appartement-julien ».*appartement-marc, rue-marc, place-centrale/);
  assert.throws(() => resolveEpisodeSet({place: 'nulle-part'}), /Lieu inconnu/);
  assert.throws(() => spot('rue-marc', 'toit'), /Point de placement « toit » inconnu/);
  assert.throws(() => interaction('place-centrale', 'statue'), /Point d’interaction « statue »/);
  assert.throws(() => placeShots('rue-marc', {only: ['drone']}), /Cadrage « rue-marc\/drone »/);
  assert.equal(spot('rue-marc', 'porte-immeuble').id, 'porte-immeuble');
});

test('cadrages : plusieurs par lieu, ids uniques, Shot valide', () => {
  const all = PLACE_IDS.flatMap((id) => REFERENCE_SHOTS[id]);
  assert.equal(new Set(all.map((s) => s.id)).size, all.length);
  for (const id of PLACE_IDS) {
    assert.ok(REFERENCE_SHOTS[id].length >= 3, `${id} : au moins 3 cadrages`);
    for (const s of REFERENCE_SHOTS[id]) {
      assert.equal(s.place, id);
      assert.ok(s.id.startsWith(`${id}/`));
      for (const v of [s.from, s.to]) assert.ok(v.fov >= 20 && v.fov <= 90 && v.pos.every(Number.isFinite));
    }
  }
  const extra = {...REFERENCE_SHOTS['rue-marc'][0], id: 'episode/plan'};
  assert.deepEqual(placeShots('rue-marc', {only: ['porte'], extra: [extra]}).map((s) => s.id), ['rue-marc/porte', 'episode/plan']);
});

test('cadrages : caméras hors des bâtiments (sauf intérieur, dans l’appartement)', () => {
  const boxes = buildingBoxes(REFERENCE_WORLD);
  assert.ok(boxes.length > 100);
  for (const id of PLACE_IDS) for (const s of REFERENCE_SHOTS[id]) {
    for (let k = 0; k <= 1; k += 0.125) {
      const {pos} = viewAt(s, k);
      assert.ok(pos[1] >= 0.3, `${s.id} : caméra sous le sol`);
      const inside = buildingAt(boxes, pos);
      if (s.inside) {
        const p = PLACES[id];
        assert.equal(inside?.id, p.interior!.building, `${s.id} : caméra intérieure hors de l’immeuble hôte`);
        assert.ok(inZone(p.zone, pos), `${s.id} : caméra hors de la pièce ${pos}`);
      } else {
        assert.equal(inside, undefined, `${s.id} à k=${k} : caméra dans ${inside?.id}`);
      }
    }
  }
});

test('variantes : nouveau monde, source jamais modifiée, ids invalides refusés', () => {
  const before = JSON.stringify(REFERENCE_WORLD);
  const v = applyVariants(REFERENCE_WORLD, {
    lighting: 'nuit', weather: 'neige',
    damage: [{center: [0, 0], radius: 40, level: 1}],
    changes: [{id: 'fountain-832', props: {flow: 0}}, {id: 'car-332', remove: true}],
    add: [{id: 'episode-cratere', type: 'cone', x: 1, y: 0, z: 1, ry: 0, props: {}}],
  });
  assert.equal(JSON.stringify(REFERENCE_WORLD), before, 'le monde figé est intact');
  assert.equal(v.sky, 'nuit');
  assert.equal(v.items.find((i) => i.id === 'fountain-832')?.props.flow, 0);
  assert.ok(!v.items.some((i) => i.id === 'car-332'));
  assert.ok(v.items.some((i) => i.id === 'episode-cratere'));
  const b = v.items.find((i) => i.id === 'haussmann-894')!;
  assert.ok(Number(b.props.floors) <= 7);
  assert.throws(() => applyVariants(REFERENCE_WORLD, {changes: [{id: 'nope'}]}), /objet « nope » absent/);
  assert.throws(() => applyVariants(REFERENCE_WORLD, {add: [{...worldItem('car-332')}]}), /existe déjà/);
  assert.deepEqual(applyVariants(REFERENCE_WORLD, {damage: [{center: [0, 0], radius: 40, level: 0.7}]}),
    applyVariants(REFERENCE_WORLD, {damage: [{center: [0, 0], radius: 40, level: 0.7}]}), 'dégâts reproductibles');
});

test('niveau de détail : lieu complet, lointain simplifié, repères toujours là', () => {
  for (const id of PLACE_IDS) {
    const set = resolveEpisodeSet({place: id});
    const nearIds = new Set(set.near.map((i) => i.id));
    for (const item of PLACES[id].items) assert.ok(nearIds.has(item), `${id} : ${item} en détail`);
    for (const type of ['eiffel', 'tower', 'water', 'bridge']) assert.ok(set.near.some((i) => i.type === type), `${id} : repère ${type}`);
    assert.ok(set.far.length > 100, `${id} : quartiers lointains simplifiés`);
    assert.ok(set.near.length < REFERENCE_WORLD.items.length * 0.6, `${id} : ${set.near.length} objets en détail`);
    assert.ok(set.far.every((i) => ['haussmann', 'shop', 'modern-block', 'tree', 'car'].includes(i.type)));
  }
  // Even with a tiny radius, the place's own items (the flat's building) stay in full.
  const tiny = resolveEpisodeSet({place: 'appartement-marc', detailRadius: 1});
  assert.ok(tiny.near.some((i) => i.id === 'haussmann-894') && !tiny.far.some((i) => i.id === 'haussmann-894'));
  const all = splitDetail(REFERENCE_WORLD.items, [0, 0], Infinity);
  assert.equal(all.near.length, REFERENCE_WORLD.items.length);
  assert.ok(getPlace('rue-marc').detailRadius > 0);
});
