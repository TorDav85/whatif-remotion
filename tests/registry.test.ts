import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {ASSETS, CATEGORIES} from '../src/assets/city/registry';
import {surfaceY} from '../src/editor/geometry';

test('catalogue complet, types uniques et catégories connues', () => {
  assert.ok(ASSETS.length >= 95, `${ASSETS.length} assets seulement`);
  const types = new Set<string>();
  for (const a of ASSETS) {
    assert.ok(!types.has(a.type), `type en double : ${a.type}`);
    types.add(a.type);
    assert.ok(CATEGORIES.includes(a.category), `${a.type} : catégorie inconnue ${a.category}`);
    assert.ok(a.label.trim().length > 0, `${a.type} sans libellé`);
  }
  for (const c of CATEGORIES) assert.ok(ASSETS.some((a) => a.category === c), `catégorie vide : ${c}`);
});

test('chaque réglage est cohérent avec sa valeur par défaut', () => {
  for (const a of ASSETS) {
    for (const p of a.params ?? []) {
      const v = a.defaults?.[p.key];
      if (p.type === 'number') {
        assert.ok(p.min < p.max && p.step > 0, `${a.type}.${p.key} : bornes invalides`);
        if (typeof v === 'number') assert.ok(v >= p.min && v <= p.max, `${a.type}.${p.key} = ${v} hors [${p.min}, ${p.max}]`);
      }
      if (p.type === 'select') {
        assert.ok(p.options.length > 0, `${a.type}.${p.key} sans option`);
        if (v !== undefined) assert.ok(p.options.includes(v as never), `${a.type}.${p.key} = ${v} absent des options`);
      }
      if (p.type === 'color' && typeof v === 'string') assert.match(v, /^#[0-9a-f]{6}$/i, `${a.type}.${p.key}`);
    }
  }
});

test('chaque asset se construit avec ses réglages par défaut', () => {
  for (const a of ASSETS) {
    const el = a.render({...a.defaults, ...(a.lit ? {lit: 0} : {})});
    assert.ok(React.isValidElement(el), `${a.type} ne renvoie pas un élément`);
  }
});

test('hauteur du sol : trottoir, pelouse, chaussée et rotation', () => {
  const items = [
    {id: 's', type: 'sidewalk', x: 0, y: 0, z: 0, ry: 0, props: {width: 10, depth: 4}},
    {id: 'g', type: 'grass', x: 30, y: 0, z: 0, ry: Math.PI / 2, props: {width: 10, depth: 4}},
  ];
  assert.equal(surfaceY(items, 4.9, 1.9), 0.15);
  assert.equal(surfaceY(items, 5.5, 0), 0);
  assert.equal(surfaceY(items, 30, 4.5), 0.2, 'pelouse tournée de 90° : 10 m dans l’axe z');
  assert.equal(surfaceY(items, 34.5, 0), 0);
  assert.equal(surfaceY(items, 0, 0, 's'), 0, 'objet ignoré');
});
