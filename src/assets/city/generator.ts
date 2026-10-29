import {PAL, seeded} from '../kit';
import type {CityLayout, LayoutItem} from './registry';

export type GenOptions = {
  seed: number;
  cols: number;
  rows: number;
  blockW: number;
  blockD: number;
  street: number;
  walk: number;
  /** share of blocks turned into squares (0..1) */
  parks: number;
  floorsMin: number;
  floorsMax: number;
  trees: boolean;
  furniture: boolean;
  /** parked-car density (0..1) */
  cars: number;
  /** pedestrians per block */
  people: number;
  eiffel: boolean;
  /** river along the south edge, with quays and the opposite bank */
  seine: boolean;
  bridges: number;
  boats: boolean;
  /** share of row buildings turned into shops (0..1) */
  shops: number;
  /** share of blocks built as 1970s housing (0..1) */
  modern: number;
  /** office towers grouped on the horizon */
  towers: number;
};

export const DEFAULT_GEN: GenOptions = {
  seed: 42, cols: 3, rows: 2, blockW: 40, blockD: 34, street: 10, walk: 3, parks: 0.15,
  floorsMin: 4, floorsMax: 7, trees: true, furniture: true, cars: 0.7, people: 6, eiffel: true,
  seine: true, bridges: 2, boats: true, shops: 0.35, modern: 0.1, towers: 3,
};

const SHOPS = ['boulangerie', 'pharmacie', 'fleuriste', 'librairie', 'epicerie', 'cafe', 'boutique', 'fromagerie'];

const STONES = [PAL.cream, '#e6d9bf', '#dccfb3', '#e8d5b7', '#d6c6a6'];
const AWNINGS = ['#a8322b', '#2b5a8a', '#3a6a4a', '#8a6a2a', '#5a3a5a', null, null];
const CARS = ['#b8322a', '#2b5a8a', '#1d1d1f', '#e8e2d2', '#3f6b4a', '#8a6a2a', '#9aa3ab', '#d9b46a'];
const FOLIAGE = ['#608451', '#567a46', '#6a8d55', '#4f7240'];
const SIDE = 0.15;

export const generateCity = (options: Partial<GenOptions> = {}, name = 'ville'): CityLayout => {
  const o = {...DEFAULT_GEN, ...options};
  const r = seeded(o.seed);
  const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)];
  const items: LayoutItem[] = [];
  let n = 0;
  const add = (type: string, x: number, z: number, ry = 0, props: Record<string, unknown> = {}, y = 0) =>
    items.push({id: `${type}-${n++}`, type, x: round(x), y, z: round(z), ry: round(ry), props});

  const pitchX = o.blockW + 2 * o.walk + o.street;
  const pitchZ = o.blockD + 2 * o.walk + o.street;
  const cx = (i: number) => (i - (o.cols - 1) / 2) * pitchX;
  const cz = (j: number) => (j - (o.rows - 1) / 2) * pitchZ;
  const sx = (k: number) => (k - o.cols / 2) * pitchX;
  const sz = (l: number) => (l - o.rows / 2) * pitchZ;
  const half = o.street / 2;
  const parking = half - 0.9;

  // Streets: intersections, then segments between them.
  for (let k = 0; k <= o.cols; k++) for (let l = 0; l <= o.rows; l++) add('intersection', sx(k), sz(l), 0, {width: o.street, depth: o.street});
  for (let k = 0; k <= o.cols; k++) for (let j = 0; j < o.rows; j++) add('road', sx(k), cz(j), 0, {width: o.street, length: pitchZ - o.street});
  for (let l = 0; l <= o.rows; l++) for (let i = 0; i < o.cols; i++) add('road', cx(i), sz(l), Math.PI / 2, {width: o.street, length: pitchX - o.street});

  // Parked and moving cars.
  const parkAlong = (len: number, place: (t: number, s: number) => void) => {
    for (const s of [-1, 1]) for (let t = -len / 2 + 3; t < len / 2 - 3; t += 5.6 + r() * 1.4) if (r() < o.cars) place(t, s);
  };
  for (let k = 0; k <= o.cols; k++) for (let j = 0; j < o.rows; j++) {
    parkAlong(pitchZ - o.street, (t, s) => add('car', sx(k) + s * parking, cz(j) + t, s > 0 ? 0 : Math.PI, {color: pick(CARS), variant: r() > 0.6 ? 'citadine' : r() > 0.9 ? 'utilitaire' : 'berline'}));
    if (r() < o.cars * 0.4) add('car', sx(k) + 1.6, cz(j) + (r() - 0.5) * 10, 0, {color: pick(CARS), variant: r() > 0.8 ? 'taxi' : 'berline'});
  }
  for (let l = 0; l <= o.rows; l++) for (let i = 0; i < o.cols; i++) {
    parkAlong(pitchX - o.street, (t, s) => add('car', cx(i) + t, sz(l) + s * parking, s > 0 ? -Math.PI / 2 : Math.PI / 2, {color: pick(CARS), variant: r() > 0.6 ? 'citadine' : 'berline'}));
  }

  // Traffic lights on the inner intersections.
  for (let k = 1; k < o.cols; k++) for (let l = 1; l < o.rows; l++) {
    add('traffic-light', sx(k) + half + 0.6, sz(l) + half + 0.6, Math.PI, {state: 'green'}, SIDE);
    add('traffic-light', sx(k) - half - 0.6, sz(l) - half - 0.6, 0, {state: 'red'}, SIDE);
  }

  for (let i = 0; i < o.cols; i++) for (let j = 0; j < o.rows; j++) {
    const x = cx(i);
    const z = cz(j);
    const x0 = x - o.blockW / 2;
    const x1 = x + o.blockW / 2;
    const z0 = z - o.blockD / 2;
    const z1 = z + o.blockD / 2;
    add('sidewalk', x, z, 0, {width: o.blockW + 2 * o.walk, depth: o.blockD + 2 * o.walk});
    const roll = r();
    const park = roll < o.parks;
    const modern = !park && roll < o.parks + o.modern;

    if (modern) {
      add('grass', x, z, 0, {width: o.blockW, depth: o.blockD});
      const mw = o.blockW - 4;
      const floors = 7 + Math.floor(r() * 6);
      add('modern-block', x, z0 + 6, 0, {width: mw, depth: 11, floors}, 0.2);
      add('modern-block', x, z1 - 6, Math.PI, {width: mw, depth: 11, floors: floors - 2}, 0.2);
      for (let t = 0; t < 5; t++) add('tree', x - mw / 2 + 4 + t * ((mw - 8) / 4), z + (r() - 0.5) * 3, 0, {height: 6 + r() * 2, seed: Math.floor(r() * 999), foliage: pick(FOLIAGE)}, 0.2);
      add('picnic', x + 4, z, 0.4, {}, 0.2);
    } else if (park) {
      add('grass', x, z, 0, {width: o.blockW, depth: o.blockD});
      add('plaza', x, z, 0, {width: o.blockW, depth: 4});
      add('plaza', x, z, Math.PI / 2, {width: o.blockD, depth: 4});
      add('fountain', x, z, 0, {}, 0.19);
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2 + 0.4;
        add('tree', x + Math.cos(ang) * o.blockW * 0.36, z + Math.sin(ang) * o.blockD * 0.36, 0, {height: 5 + r() * 2.5, seed: Math.floor(r() * 999), foliage: pick(FOLIAGE)}, 0.2);
      }
      for (const s of [-1, 1]) {
        add('bench', x + s * 5, z + 3.2, 0, {}, 0.19);
        add('bench', x + s * 5, z - 3.2, Math.PI, {}, 0.19);
        add('hedge', x + s * (o.blockW / 2 - 1), z, Math.PI / 2, {width: o.blockD - 8}, 0.18);
      }
      add('picnic', x + o.blockW * 0.3, z - o.blockD * 0.28, 0.3, {}, 0.2);
    } else {
      const d = Math.min(12, (o.blockD - 4) / 2, (o.blockW - 4) / 2);
      const make = (bx: number, bz: number, ry: number, width: number, shopOk: boolean) => {
        const floors = o.floorsMin + Math.floor(r() * (o.floorsMax - o.floorsMin + 1));
        if (shopOk && r() < o.shops) {
          // A shop: its front sits on the facade line, slightly shallower than the block row.
          const sd = Math.min(d, 9);
          const back = (d - sd) / 2;
          add('shop', bx - Math.sin(ry) * back, bz - Math.cos(ry) * back, ry,
            {kind: pick(SHOPS), width: round(width), depth: sd, floors: Math.max(1, floors - 3), stone: pick(STONES)}, SIDE);
          return null;
        }
        const b = {width: round(width), depth: d, floors, stone: pick(STONES), awning: pick(AWNINGS), seed: 1 + Math.floor(r() * 998)};
        add('haussmann', bx, bz, ry, b, SIDE);
        return b;
      };
      const flank = (host: Record<string, unknown> | null, bx: number, bz: number, ry: number) => {
        if (host) add('haussmann', bx, bz, ry, {...host, width: d - 0.1, depth: 0.6, awning: null}, SIDE);
      };
      const row = (from: number, to: number, place: (c: number, w: number, inner: boolean) => Record<string, unknown> | null) => {
        const slots: [number, number][] = [];
        fill(r, from, to, (c, w) => slots.push([c, w]));
        return slots.map(([c, w], i) => place(c, w, i > 0 && i < slots.length - 1));
      };
      // North and south rows span the full block width; corner buildings stay Haussmann with windowed flanks.
      for (const [rowZ, ry] of [[z0 + d / 2, 0], [z1 - d / 2, Math.PI]] as const) {
        const built = row(x0, x1, (c, w, inner) => make(c, rowZ, ry, w, inner));
        flank(built[0], x0 + 0.3, rowZ, Math.PI / 2);
        flank(built[built.length - 1], x1 - 0.3, rowZ, -Math.PI / 2);
      }
      // West and east rows fill the remaining depth.
      if (z1 - z0 - 2 * d > 4) {
        row(z0 + d, z1 - d, (c, w) => make(x0 + d / 2, c, Math.PI / 2, w, true));
        row(z0 + d, z1 - d, (c, w) => make(x1 - d / 2, c, -Math.PI / 2, w, true));
      }
    }

    // Sidewalk dressing, side by side: [axis, fixed coordinate, from, to, facing street].
    const curb = o.walk - 0.9;
    const sides: {along: 'x' | 'z'; fixed: number; from: number; to: number; face: number; out: number}[] = [
      {along: 'x', fixed: z0 - curb, from: x0, to: x1, face: 0, out: -1},
      {along: 'x', fixed: z1 + curb, from: x0, to: x1, face: Math.PI, out: 1},
      {along: 'z', fixed: x0 - curb, from: z0, to: z1, face: Math.PI / 2, out: -1},
      {along: 'z', fixed: x1 + curb, from: z0, to: z1, face: -Math.PI / 2, out: 1},
    ];
    const at = (s: typeof sides[number], t: number, inset = 0) =>
      s.along === 'x' ? [t, s.fixed - s.out * inset] as const : [s.fixed - s.out * inset, t] as const;
    sides.forEach((s, si) => {
      const len = s.to - s.from;
      if (o.trees) for (let t = s.from + 4; t < s.to - 3; t += 9) {
        const [px, pz] = at(s, t);
        add('tree', px, pz, 0, {height: 5.2 + r() * 0.8, seed: Math.floor(r() * 999), foliage: pick(FOLIAGE)}, SIDE);
      }
      for (let t = s.from + 8.5; t < s.to - 3; t += 18) {
        const [px, pz] = at(s, t, -0.45);
        add('street-lamp', px, pz, 0, {}, SIDE);
      }
      if (o.furniture) {
        const mid = s.from + len * (0.35 + r() * 0.3);
        const [bx, bz] = at(s, mid, 0.9);
        add(r() > 0.75 && !park ? 'bus-shelter' : 'bench', bx, bz, s.face, {}, SIDE);
        const [tx, tz] = at(s, mid + 3.5, -0.3);
        add('trash-bin', tx, tz, 0, {}, SIDE);
        if (!park && r() > 0.55) {
          const [fx, fz] = at(s, s.from + len * 0.7, o.walk - 1.3);
          add('cafe', fx, fz, 0, {color: pick(['#bb704f', '#8a322b', '#3f6b4a'])}, SIDE);
        }
        if (r() > 0.7) {
          const [hx, hz] = at(s, s.from + 2.2, -0.4);
          add('hydrant', hx, hz, 0, {}, SIDE);
        }
        if (si < 2) for (const end of [s.from - o.walk + 0.6, s.to + o.walk - 0.6]) {
          const [ox, oz] = at(s, end, -0.5);
          add('bollard', ox, oz, 0, {}, SIDE);
        }
      }
      for (let p = 0; p < Math.round(o.people / 4); p++) {
        const t = s.from + r() * len;
        const [px, pz] = at(s, t, 0.3 + r() * (o.walk - 1.2));
        const dir = r() > 0.5 ? 1 : -1;
        const ry = s.along === 'x' ? (dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (dir > 0 ? Math.PI : 0);
        add('person', px, pz, ry, {preset: Math.floor(r() * 6), pose: r() > 0.3 ? 'marche' : 'debout', phase: round(r() * 6.28)}, SIDE);
      }
    });
  }

  const west = sx(0) - half;
  const east = sx(o.cols) + half;
  const span = east - west;
  const mid = (west + east) / 2;

  // The Seine runs behind the district (north, -z): seen from a 3/4 view, the city is in front,
  // then the river and its bridges, then the opposite bank's facades looking back at the camera.
  const north = sz(0) - half;
  let horizon = north;
  if (o.seine) {
    const quay = 8;
    const riverW = 44;
    const q0 = north - quay;
    const zr = q0 - riverW / 2;
    const q1 = zr - riverW / 2;
    const farBank = q1 - quay;
    add('sidewalk', mid, q0 + quay / 2, 0, {width: span + 60, depth: quay});
    add('sidewalk', mid, q1 - quay / 2, 0, {width: span + 60, depth: quay});
    add('water', mid, zr, 0, {width: span + 400, depth: riverW});
    add('road', mid, farBank - half, Math.PI / 2, {width: o.street, length: span + 60});
    for (let x = west - 26; x < east + 26; x += 11) {
      if (o.trees) {
        add('tree', x, q0 + 1.4, 0, {height: 7 + r() * 2, seed: Math.floor(r() * 999), foliage: pick(FOLIAGE)}, SIDE);
        add('tree', x + 5, q1 - 1.4, 0, {height: 7 + r() * 2, seed: Math.floor(r() * 999), foliage: pick(FOLIAGE)}, SIDE);
      }
      if (o.furniture && r() > 0.5) add('bench', x + 5.5, q0 + 2.6, 0, {}, SIDE);
    }
    for (let x = west - 20; x < east + 26; x += 22) add('street-lamp', x, q0 + 0.6, 0, {}, SIDE);
    for (let p = 0; p < Math.round(o.people * 0.8); p++) {
      add('person', west + r() * span, q0 + 3 + r() * 3.5, r() > 0.5 ? Math.PI / 2 : -Math.PI / 2,
        {preset: Math.floor(r() * 6), pose: 'marche', phase: round(r() * 6.28)}, SIDE);
    }
    // Opposite bank: a continuous row of facades looking at the river (and the camera).
    const rowZ = farBank - o.street - o.walk;
    add('sidewalk', mid, rowZ + o.walk / 2 - 6, 0, {width: span + 60, depth: o.walk + 12});
    fill(r, west - 28, east + 28, (c, w) => add('haussmann', c, rowZ - 6, Math.PI,
      {width: round(w), depth: 12, floors: o.floorsMin + Math.floor(r() * (o.floorsMax - o.floorsMin + 1)), stone: pick(STONES), awning: pick(AWNINGS), seed: 1 + Math.floor(r() * 998)}, SIDE));
    // Bridges continue the streets across the river.
    const count = Math.max(0, Math.min(o.cols + 1, o.bridges));
    const step = (o.cols + 1) / Math.max(1, count);
    for (let b = 0; b < count; b++) {
      const k = Math.min(o.cols, Math.round(step / 2 - 0.5 + b * step));
      add('bridge', sx(k), (q0 + farBank) / 2, 0, {length: q0 - farBank, width: o.street + 6, arches: 3});
    }
    if (o.boats) {
      for (let b = 0; b < Math.max(1, o.cols); b++) {
        add('barge', west + 10 + r() * (span - 20), zr + riverW / 2 - 4, Math.PI / 2, {length: 22 + Math.floor(r() * 8)}, -0.6);
      }
      add('tour-boat', mid + (r() - 0.5) * span * 0.5, zr - 6, -Math.PI / 2, {}, -0.6);
    }
    horizon = rowZ - 12;
  }

  // Business district on the horizon.
  for (let t = 0; t < o.towers; t++) {
    const tx = mid + (t - (o.towers - 1) / 2) * 34 + (r() - 0.5) * 10;
    const tz = horizon - 70 - (t % 2) * 40 - r() * 20;
    add('tower', tx, tz, 0, {height: 80 + Math.floor(r() * 100), width: 18 + Math.floor(r() * 10), depth: 18 + Math.floor(r() * 10),
      style: pick(['bandes', 'verre', 'gradins']), color: pick(['#6f8aa8', '#7f99b0', '#5d7590', '#8aa0a8'])});
  }

  // Background landmark, behind the district as seen from the river side (3/4 views).
  if (o.eiffel) add('eiffel', west - 50, horizon - 45, 0.3, {height: 110});
  return {version: 1, name, sky: 'jour', items};
};

const round = (v: number) => Math.round(v * 1000) / 1000;

const fill = (r: () => number, from: number, to: number, place: (center: number, width: number) => void) => {
  const len = to - from;
  const n = Math.max(1, Math.round(len / 12));
  const weights = Array.from({length: n}, () => 0.75 + r() * 0.5);
  const sum = weights.reduce((a, b) => a + b, 0);
  let cursor = from;
  for (const w of weights) {
    const width = (w / sum) * len;
    place(cursor + width / 2, width - 0.05);
    cursor += width;
  }
};
