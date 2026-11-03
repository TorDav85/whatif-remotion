import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CUT_SFX, cutCues, cutLookAt, dipAt, type Cut} from '../src/shared/ui/transitions';
// @ts-expect-error plain ES module, no type declarations
import {renderCues} from '../scripts/audio/sfx/cues.mjs';
// @ts-expect-error plain ES module, no type declarations
import {SFX, SFX_INFO} from '../scripts/audio/sfx/library.mjs';

const cuts: Cut[] = [{at: 2, kind: 'whip'}, {at: 4, kind: 'zoom', x: 300, y: 500}, {at: 6, kind: 'flash'}, {at: 8, kind: 'dip'}, {at: 10, kind: 'cut'}];

test('transitions : rien hors des fenêtres, coupe franche intacte', () => {
  for (const t of [0.5, 3, 5, 7, 9.9, 10, 10.05, 11]) {
    const look = cutLookAt(cuts, t);
    assert.equal(look.transform, 'none', `t=${t}`);
    assert.equal(look.smear + look.blur + look.flash, 0, `t=${t}`);
  }
});

test('whip : filé maximal sur la coupe, de part et d’autre', () => {
  const peak = cutLookAt(cuts, 1.999).smear;
  assert.ok(peak > 50, `filé ${peak}`);
  assert.ok(cutLookAt(cuts, 2.01).smear > 40, 'le plan entrant arrive filé');
  assert.ok(cutLookAt(cuts, 1.9).smear < peak);
});

test('zoom : le plan sortant grossit vers le point choisi, le plan entrant se pose', () => {
  const out = cutLookAt(cuts, 3.99);
  assert.match(out.transform, /scale\((4|5)\.\d+\)/);
  assert.equal(out.origin, '300px 500px');
  assert.ok(out.blur > 15);
  assert.ok(cutLookAt(cuts, 4.01).blur > 10 && cutLookAt(cuts, 4.16).blur < 2);
});

test('flash : blanc sur la coupe, puis s’éteint ; le fondu au noir est inchangé', () => {
  assert.ok(cutLookAt(cuts, 6).flash > 0.99);
  assert.ok(cutLookAt(cuts, 6.15).flash < 0.5);
  assert.equal(dipAt(cuts, 8), 1);
  assert.equal(dipAt([{at: 8, kind: 'cut'}], 8), 0);
});

test('transitions reproductibles et sons associés', () => {
  assert.deepEqual(cutLookAt(cuts, 1.95), cutLookAt(cuts, 1.95));
  const cues = cutCues(cuts);
  assert.deepEqual(cues.map((c) => c.sfx), ['whip', 'zoom', 'hit']);
  assert.ok(cues[0].t < 2 && cues[2].t === 6);
  for (const name of Object.values(CUT_SFX)) assert.ok(SFX[name as string], `son ${name}`);
});

test('effets sonores : chaque effet du catalogue sonne, sans saturer', () => {
  assert.equal(SFX_INFO.length, Object.keys(SFX).length);
  for (const info of SFX_INFO) {
    const s: Float32Array = renderCues({duration: info.seconds + 0.6, cues: [{t: 0.1, sfx: info.name}]});
    let peak = 0;
    for (const v of s) {
      assert.ok(Number.isFinite(v), `${info.name} : valeur invalide`);
      peak = Math.max(peak, Math.abs(v));
    }
    assert.ok(peak > 0.005 && peak < 1, `${info.name} : crête ${peak}`);
  }
});

test('effets sonores : rendu déterministe, effet inconnu refusé', () => {
  const sheet = {duration: 2, cues: [{t: 0.2, sfx: 'hit'}, {t: 0.9, sfx: 'whoosh', gain: 0.5}]};
  assert.deepEqual(Array.from(renderCues(sheet)), Array.from(renderCues(sheet)));
  assert.throws(() => renderCues({duration: 1, cues: [{t: 0, sfx: 'explosion-atomique'}]}), /Effet inconnu « explosion-atomique »/);
});
