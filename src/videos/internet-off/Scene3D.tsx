import React, {useMemo} from 'react';
import * as THREE from 'three';
import {smooth} from '../../core/animation';
import {Block, Cyl, PAL, seeded} from '../../assets/kit';
import {Building} from '../../assets/Building';
import {Car} from '../../assets/Car';
import {Tree, Bench, StreetLamp, TrashBin, Crosswalk} from '../../assets/city';
import {CameraRig} from '../../shared/three/common';
import {SkyDome} from '../../shared/three/SkyDome';
import {Actor, faceTo, type Look} from './Actor';

type V3 = [number, number, number];
type V2 = [number, number];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
const mix2 = (a: V2, b: V2, k: number): V2 => [mix(a[0], b[0], k), mix(a[1], b[1], k)];
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
const win = (t: number, a: number, b: number, f = 0.4) => smooth(a - f, a, t) * (1 - smooth(b, b + f, t));

// ---------- Cast ----------
const MARC: Look = {shirt: '#E63946', pants: '#2d3748', skin: '#e8b894', hair: '#3a2a1e'};
const STRANGER: Look = {shirt: '#3f6f8f', pants: '#d9cfb8', skin: '#a8704a', hair: '#1d1612', hairStyle: 'long'};
const LOOKS: Look[] = [
  {shirt: '#c9a46a', pants: '#3a3f47', skin: '#f1c9a5', hair: '#6b4a2c'},
  {shirt: '#7d9a7a', pants: '#2b3a55', skin: '#e8b894', hair: '#c9a46a', hairStyle: 'long'},
  {shirt: '#e8dcc4', pants: '#4a4f57', skin: '#6e4630', hair: '#1d1612'},
  {shirt: '#a85a44', pants: '#2d3748', skin: '#d9a07a', hair: '#8a8a8a', hairStyle: 'chauve'},
  {shirt: '#5e7d6a', pants: '#d9cfb8', skin: '#f1c9a5', hair: '#b0402a', hairStyle: 'long'},
  {shirt: '#d9b46a', pants: '#3a3f47', skin: '#a8704a', hair: '#1d1612'},
  {shirt: '#8a6a8a', pants: '#2b3a55', skin: '#e8b894', hair: '#3a2a1e', hairStyle: 'long'},
  {shirt: '#b8763e', pants: '#4a4f57', skin: '#f1c9a5', hair: '#5a3a22'},
];

// ---------- Camera: one shot per beat, hard cuts hidden by short dips ----------
type Shot = {from: number; p0: V3; p1: V3; t0: V3; t1: V3; fov?: number; orbit?: {c: V3; r: number; y: number; a0: number; a1: number}};

const MAP_C: V3 = [1.2, 0, -38];
const MAP_R = 1.45;
const MAP_PEOPLE = [0.35, 0.35 + Math.PI / 2, 0.35 + Math.PI, 0.35 + 1.5 * Math.PI].map((a, i) => {
  const pos: V2 = [MAP_C[0] + MAP_R * Math.sin(a), MAP_C[2] + MAP_R * Math.cos(a)];
  return {pos, ry: faceTo(pos, [MAP_C[0], MAP_C[2]]), look: i === 0 ? MARC : i === 1 ? STRANGER : LOOKS[i + 2], marc: i === 0};
});
const PHONE_ON_MAP: V3 = [MAP_C[0] + 0.28, 0.02, MAP_C[2] - 0.12];
const marcMap = MAP_PEOPLE[0].pos;
const towardC = new THREE.Vector2(MAP_C[0] - marcMap[0], MAP_C[2] - marcMap[1]).normalize();
const MARC_CLOSE: V3 = [marcMap[0] + towardC.x * 0.95, 1.08, marcMap[1] + towardC.y * 0.95];
const MARC_FACE: V3 = [marcMap[0], 0.95, marcMap[1]];
const FIRE: V3 = [-1.5, 0, -24];
const OPP = 0.35 + Math.PI;
const at = (c: V3, r: number, a: number, y: number): V3 => [c[0] + r * Math.sin(a), y, c[2] + r * Math.cos(a)];

export const SHOTS: Shot[] = [
  {from: 0, p0: [2.6, 1.65, 5.5], p1: [2.8, 1.6, 6.3], t0: [5.8, 1.3, -3.5], t1: [5.9, 1.3, -1.5], fov: 55},
  {from: 5, p0: [3.4, 1.7, 6.2], p1: [3.7, 1.65, 5.0], t0: [5.9, 1.35, 0.6], t1: [5.9, 1.35, 0.3], fov: 48},
  {from: 10, p0: [4.6, 0.8, 3.2], p1: [4.9, 0.75, 2.6], t0: [5.9, 1.9, 0.0], t1: [5.9, 2.0, 0.0], fov: 52},
  {from: 15, p0: [0, 6, 14], p1: [0, 22, 18], t0: [0, 0, -10], t1: [0, 0, -14], fov: 55},
  {from: 25, p0: [1.6, 1.6, 4.8], p1: [2.2, 1.55, 4.2], t0: [7.0, 1.3, 0], t1: [6.4, 1.3, 0], fov: 54},
  {from: 28, p0: [-1.2, 1.6, 3.8], p1: [-1.6, 1.55, 3.2], t0: [-6.0, 1.3, -0.9], t1: [-4.6, 1.3, -0.7], fov: 54},
  {from: 31, p0: [0.1, 1.5, 5.6], p1: [0.05, 1.45, 4.5], t0: [0, 1.3, -0.3], t1: [0, 1.32, -0.3], fov: 52},
  {from: 40, p0: [1.6, 1.3, -9.6], p1: [1.9, 1.25, -10.6], t0: [5.6, 0.95, -12], t1: [5.6, 0.95, -12], fov: 48},
  {from: 45, p0: [0, 0, 0], p1: [0, 0, 0], t0: [FIRE[0], 0.75, FIRE[2]], t1: [FIRE[0], 0.75, FIRE[2]], fov: 50, orbit: {c: FIRE, r: 4.8, y: 1.6, a0: 2.7, a1: 3.4}},
  {from: 50, p0: [-2.0, 1.55, -3.8], p1: [-2.6, 1.5, -4.4], t0: [-5.6, 1.35, -6], t1: [-5.6, 1.35, -6], fov: 46},
  {from: 55, p0: [0, 0, 0], p1: [0, 0, 0], t0: [MAP_C[0], 0.5, MAP_C[2]], t1: [MAP_C[0], 0.5, MAP_C[2]], fov: 50, orbit: {c: MAP_C, r: 3.4, y: 2.1, a0: OPP + Math.PI / 4 - 0.35, a1: OPP + Math.PI / 4 + 0.35}},
  {from: 61, p0: MARC_CLOSE, p1: [MARC_CLOSE[0], MARC_CLOSE[1] - 0.05, MARC_CLOSE[2]], t0: MARC_FACE, t1: MARC_FACE, fov: 45},
  {from: 65.5, p0: [MAP_C[0], 2.0, MAP_C[2] + 1.6], p1: [MAP_C[0], 1.7, MAP_C[2] + 1.2], t0: MAP_C, t1: MAP_C, fov: 50},
  {from: 70, p0: at(MAP_C, 2.4, OPP + Math.PI / 4, 1.8), p1: at(MAP_C, 1.5, OPP + Math.PI / 4, 1.15), t0: PHONE_ON_MAP, t1: PHONE_ON_MAP, fov: 50},
  {from: 74, p0: at(MAP_C, 3, OPP, 3), p1: at(MAP_C, 9, OPP, 10), t0: MAP_C, t1: MAP_C, fov: 52},
];
export const CUTS = SHOTS.slice(1).map((s) => s.from);

const shotAt = (t: number) => {
  let i = SHOTS.length - 1;
  while (i > 0 && t < SHOTS[i].from) i--;
  const s = SHOTS[i];
  const end = i + 1 < SHOTS.length ? SHOTS[i + 1].from : 85;
  const k = smooth(s.from, end, t);
  const target = mixV(s.t0, s.t1, k);
  if (s.orbit) {
    const o = s.orbit;
    return {pos: at(o.c, o.r, mix(o.a0, o.a1, k), o.y), target, fov: s.fov ?? 50};
  }
  return {pos: mixV(s.p0, s.p1, k), target, fov: s.fov ?? 50};
};

// ---------- Sky: day -> golden hour -> dusk -> night ----------
const SKY = [
  {t: 0, top: '#5b8fd1', bottom: '#e9e1cf', sun: '#fff3dc', i: 1.6},
  {t: 38, top: '#6a87bf', bottom: '#f0d2a8', sun: '#ffe2b8', i: 1.5},
  {t: 52, top: '#62679a', bottom: '#f2b47e', sun: '#ffc48a', i: 1.25},
  {t: 66, top: '#2e3460', bottom: '#c97a5e', sun: '#ff9a6a', i: 0.6},
  {t: 70.5, top: '#0b0f22', bottom: '#1d2240', sun: '#6a7cc0', i: 0.15},
];
const skyAt = (t: number) => {
  let i = 0;
  while (i < SKY.length - 2 && t > SKY[i + 1].t) i++;
  const a = SKY[i];
  const b = SKY[i + 1];
  const k = smooth(a.t, b.t, t);
  const c = (x: string, y: string) => new THREE.Color(x).lerp(new THREE.Color(y), k);
  return {top: c(a.top, b.top), bottom: c(a.bottom, b.bottom), sun: c(a.sun, b.sun), intensity: mix(a.i, b.i, k)};
};

// ---------- Scene 1-3 crowd ----------
type Walker = {i: number; side: number; x: number; z0: number; dir: number; v: number; die: number; leave: number; look: Look; ph: number};

const pose = (w: Walker, t: number) => {
  const stop = w.die + 0.8;
  const d = w.v * (Math.min(t, 5) + Math.max(0, Math.min(t, stop) - 5) * 0.5);
  let x = w.x;
  const z = w.z0 + w.dir * d;
  let ry = w.dir > 0 ? Math.PI : 0;
  let walk = t < 5 ? 1 : t < stop ? 0.5 : 0;
  let visible = true;
  if (t > w.leave) {
    const door = w.side * 7.35;
    const k = clamp01((t - w.leave) / (Math.abs(door - w.x) / 1.3));
    x = mix(w.x, door, k);
    walk = k < 1 ? 1 : 0;
    ry = w.side > 0 ? -Math.PI / 2 : Math.PI / 2;
    visible = k < 1;
  }
  const using = t < w.die;
  const phone: 'on' | 'off' = t < 5 ? 'on' : using ? (hash(Math.floor(t * 14) * 13 + w.i * 7) > 0.45 ? 'on' : 'off') : 'off';
  const after = t - w.die;
  const headPitch = using ? -0.55 : mix(-0.55, 0.05, after / 0.6);
  const headYaw = using ? 0 : Math.sin(after * 2.2 + w.ph) * 0.8 * win(t, w.die + 0.4, w.die + 5, 0.6);
  const tap = after > 0.3 && after < 2.6 ? 0.12 * Math.sin(t * 20 + w.ph) : 0;
  const arm = after < 2.6 ? 1.0 + tap : mix(1.0, 0.15, (after - 2.6) / 1.0);
  return {x, z, ry, walk, visible, phone, headPitch, headYaw, arm, glow: phone === 'on' ? 1 : 0};
};

// ---------- Scene 4 entrances ----------
const DOORS: {side: number; z: number}[] = [{side: 1, z: 0}, {side: 1, z: -6}, {side: -1, z: -1}, {side: -1, z: 5}];

type Path = {look: Look; door: V2; mid: V2; end: V2; t0: number; t1: number; t2: number; t3: number; endRy?: number};
const S4_PATHS: Path[] = [
  {look: LOOKS[0], door: [7.3, -6], mid: [5.8, -5.6], end: [4.6, -4.2], t0: 26.8, t1: 28.6, t2: 29.6, t3: 31.0},
  {look: LOOKS[4], door: [7.3, -6], mid: [6.2, -6.4], end: [4.4, -2.6], t0: 27.6, t1: 29.2, t2: 30.0, t3: 31.6},
  {look: LOOKS[2], door: [-7.3, 5], mid: [-5.8, 4.6], end: [-4.4, 2.4], t0: 27.0, t1: 28.8, t2: 29.8, t3: 31.4},
  {look: LOOKS[6], door: [-7.3, 5], mid: [-6.2, 5.4], end: [-4.6, 3.8], t0: 28.0, t1: 29.6, t2: 30.4, t3: 31.8},
];

const walkPath = (p: Path, t: number, target: V2) => {
  const a = smooth(p.t0, p.t1, t);
  const b = smooth(p.t2, p.t3, t);
  const pos = b > 0 ? mix2(p.mid, p.end, b) : mix2(p.door, p.mid, a);
  const moving = (t > p.t0 && t < p.t1) || (t > p.t2 && t < p.t3);
  const dir = b > 0 ? [p.end[0] - p.mid[0], p.end[1] - p.mid[1]] : [p.mid[0] - p.door[0], p.mid[1] - p.door[1]];
  const ry = t > p.t3 ? (p.endRy ?? faceTo(pos, target)) : Math.atan2(-dir[0], -dir[1]);
  const hesitate = t > p.t1 && t < p.t2 ? Math.sin((t - p.t1) * 3) * 0.7 : 0;
  return {pos, ry, walk: moving ? 0.7 : 0, headYaw: hesitate, visible: t >= p.t0};
};

const Door: React.FC<{side: number; z: number; open: number}> = ({side, z, open}) => {
  const x = side * 7.32;
  return (
    <group>
      <Block p={[x + side * 0.03, 1.15, z]} s={[0.04, 2.3, 1.15]} c="#ffcf80" e="#ffcf80" ei={open * 1.1} />
      <Block p={[x - side * 0.02, 2.36, z]} s={[0.12, 0.12, 1.35]} c="#3a2a22" />
      <group position={[x - side * 0.04, 0, z - 0.55]} rotation={[0, -side * 1.4 * open, 0]}>
        <Block p={[0, 1.12, 0.55]} s={[0.06, 2.24, 1.1]} c="#6b3f2a" />
        <Block p={[-side * 0.04, 1.1, 0.95]} s={[0.04, 0.08, 0.08]} c="#d9b46a" metal />
      </group>
    </group>
  );
};

// ---------- Static props ----------
const Phone: React.FC<{p: V3; r?: V3; on?: number}> = ({p, r = [0, 0, 0], on = 0}) => (
  <group position={p} rotation={r}>
    <Block p={[0, 0, 0]} s={[0.075, 0.012, 0.15]} c="#141518" />
    <Block p={[0, 0.008, 0]} s={[0.064, 0.004, 0.13]} c={on > 0 ? '#8fcfff' : '#0b0d10'} e={on > 0 ? '#6cb4ee' : undefined} ei={on * 2.2} />
  </group>
);

const PaperMap: React.FC = () => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 384;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f2e8d0';
    g.fillRect(0, 0, 512, 384);
    g.strokeStyle = '#7fb0c8';
    g.lineWidth = 18;
    g.beginPath();
    g.moveTo(0, 250);
    g.bezierCurveTo(140, 180, 300, 320, 512, 210);
    g.stroke();
    g.strokeStyle = '#c9b48a';
    g.lineWidth = 6;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.moveTo(i * 64, 0);
      g.lineTo(i * 64 + 40, 384);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i * 48);
      g.lineTo(512, i * 48 + 20);
      g.stroke();
    }
    g.fillStyle = '#9cbf8a';
    g.fillRect(300, 60, 120, 80);
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    g.lineWidth = 2;
    [171, 342].forEach((x) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 384); g.stroke(); });
    g.beginPath(); g.moveTo(0, 192); g.lineTo(512, 192); g.stroke();
    g.strokeStyle = '#E63946';
    g.lineWidth = 6;
    g.beginPath(); g.arc(360, 100, 26, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(120, 300, 18, 0, Math.PI * 2); g.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh position={[MAP_C[0], 0.015, MAP_C[2]]} rotation={[-Math.PI / 2, 0, 0.3]}>
      <planeGeometry args={[1.3, 0.95]} />
      <meshStandardMaterial map={tex} roughness={0.95} />
    </mesh>
  );
};

const Fire: React.FC<{t: number}> = ({t}) => (
  <group position={FIRE}>
    {[0, 1.05, 2.1].map((a) => (
      <Cyl key={a} p={[0, 0.08, 0]} rad={0.07} h={0.8} c="#5a3a22" r={[0, a, Math.PI / 2]} />
    ))}
    {Array.from({length: 5}, (_, i) => {
      const ph = i * 1.3;
      const f = 0.75 + 0.25 * Math.sin(t * 13 + ph) * Math.sin(t * 7 + ph * 2);
      return (
        <mesh key={i} position={[Math.sin(ph) * 0.12, 0.25 + f * 0.2, Math.cos(ph) * 0.12]}>
          <coneGeometry args={[0.16 * f, 0.6 * f, 5]} />
          <meshBasicMaterial color={i % 2 ? '#ff8a2a' : '#ffd25a'} />
        </mesh>
      );
    })}
    <pointLight position={[0, 0.7, 0]} color="#ff9a4a" intensity={6 + Math.sin(t * 11) * 1.2} distance={9} decay={1.6} />
  </group>
);

// ---------- Scene ----------
export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const cam = shotAt(t);
  const sky = skyAt(t);
  const lit = smooth(58, 68, t);

  const buildings = useMemo(() => {
    const r = seeded(42);
    const stones = [PAL.cream, '#e0d4ba', '#d8ccb0', '#e8d5b7'];
    const awnings = ['#a8322b', '#2b5a8a', '#3a6a4a', '#8a6a2a', null];
    const out: {x: number; z: number; ry: number; floors: number; width: number; stone: string; awning: string | null; seed: number}[] = [];
    for (const side of [-1, 1]) {
      let z = 22;
      while (z > -62) {
        const w = 10 + r() * 6;
        out.push({x: side * 13.5, z: z - w / 2, ry: side * Math.PI / 2, floors: 4 + Math.floor(r() * 3), width: w,
          stone: stones[Math.floor(r() * stones.length)], awning: awnings[Math.floor(r() * awnings.length)], seed: Math.floor(r() * 1000)});
        z -= w + 0.2;
      }
    }
    return out;
  }, []);

  const parked = useMemo(() => {
    const r = seeded(33);
    const colors = ['#b8322a', '#2b5a8a', '#e8e2d2', '#3f6b4a', '#8a6a2a', '#d9b46a'];
    const out: {x: number; z: number; ry: number; color: string}[] = [];
    for (const side of [-1, 1]) {
      for (let z = 16; z > -56; z -= 6.5 + r() * 2) {
        if (z > -4 && z < 4) continue;
        if (side > 0 && z > 4 && z < 13) continue;
        if (side > 0 && z > -16 && z < -8) continue;
        if (side < 0 && z > -10 && z < -2) continue;
        if (z > -42 && z < -33) continue;
        out.push({x: side * 3.2, z, ry: side > 0 ? 0 : Math.PI, color: colors[Math.floor(r() * colors.length)]});
      }
    }
    return out;
  }, []);

  const crowd = useMemo<Walker[]>(() => {
    const r = seeded(55);
    return Array.from({length: 16}, (_, i) => {
      const side = i % 2 ? 1 : -1;
      return {i, side, x: side * (5.4 + r() * 1.4), z0: side > 0 ? 1 - r() * 15 : 4 - r() * 34, dir: r() > 0.45 ? 1 : -1, v: 1.0 + r() * 0.4,
        die: 5.3 + r() * 4.5, leave: 15.2 + r() * 6, look: LOOKS[i % LOOKS.length], ph: r() * 10};
    });
  }, []);

  const traffic = [
    {x: 2, z0: -46, dir: 1}, {x: 2, z0: -26, dir: 1}, {x: -2, z0: 8, dir: -1}, {x: -2, z0: -8, dir: -1},
  ].map((c, i) => {
    const tt = Math.max(0, Math.min(t, 13) - 9);
    const d = 4 * (Math.min(t, 9) + tt - (tt * tt) / 8);
    return {...c, z: c.z0 + c.dir * d, ry: (c.dir > 0 ? Math.PI : 0) + smooth(10, 13, t) * (i % 2 ? 0.12 : -0.1), spin: d * 3, color: ['#2b5a8a', '#e8e2d2', '#b8322a', '#3f6b4a'][i]};
  });
  const hazard = t > 13 && Math.floor(t * 2.2) % 2 === 0 ? 1.8 : 0;

  // Marc, scenes 1-3: walks with his phone, it dies, he searches for signal, then goes home.
  const marc13 = (() => {
    const w: Walker = {i: 99, side: 1, x: 5.9, z0: -6.72, dir: 1, v: 1.2, die: 6.0, leave: 17, look: MARC, ph: 0};
    const p = pose(w, t);
    const search = smooth(9.2, 10.2, t) * (1 - smooth(13.8, 14.8, t));
    return {...p, arm: mix(p.arm, 2.85 + Math.sin(t * 2.5) * 0.08, search), headPitch: mix(p.headPitch, 0.45, search), headYaw: p.headYaw * (1 - search)};
  })();

  const doorOpen = t < 25 ? 0 : smooth(25.4, 26.6, t);
  const marcS4 = walkPath({look: MARC, door: [7.3, 0], mid: [5.0, 0], end: [0.62, 0], t0: 26.2, t1: 28.0, t2: 29.4, t3: 31.5, endRy: Math.PI / 2}, t, [0, 0]);
  const strS4 = walkPath({look: STRANGER, door: [-7.3, -1], mid: [-5.0, -0.8], end: [-0.58, -0.54], t0: 26.8, t1: 28.6, t2: 29.8, t3: 31.8, endRy: -Math.PI / 2}, t, [0, 0]);
  const shake = t > 35.5 && t < 37.6 ? Math.sin((t - 35.5) * 14) * 0.08 : 0;
  const release = smooth(38.6, 39.5, t);
  const marcArm = (smooth(32, 33.4, t) * 0.6 + smooth(33.8, 34.5, t) * 0.65) * (1 - release) + shake;
  const strArm = smooth(34.5, 35.5, t) * 1.25 * (1 - release) + shake;

  return (
    <>
      <CameraRig position={cam.pos} target={cam.target} fov={cam.fov} />
      <SkyDome top={sky.top} bottom={sky.bottom} />
      <fog attach="fog" args={[`#${sky.bottom.getHexString()}`, 30, 150]} />
      <hemisphereLight color={sky.top} groundColor="#8a7e6a" intensity={0.9 + sky.intensity * 0.4} />
      <directionalLight color={sky.sun} intensity={sky.intensity} position={[30, 40, 25]} />
      <ambientLight intensity={0.25} />

      {/* Ground, road, sidewalks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -20]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#8a8478" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -20]}>
        <planeGeometry args={[8, 100]} />
        <meshStandardMaterial color="#3a3b40" roughness={0.6} />
      </mesh>
      {Array.from({length: 14}, (_, i) => (
        <mesh key={i} position={[0, 0.012, 20 - i * 7]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 3]} />
          <meshBasicMaterial color="#e8e4da" />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 5.75, 0.08, -20]}>
          <boxGeometry args={[3.5, 0.16, 100]} />
          <meshStandardMaterial color={PAL.stone} flatShading roughness={0.8} />
        </mesh>
      ))}
      <group position={[0, 0, 10]}><Crosswalk width={7} /></group>
      <group position={[0, 0, -30]}><Crosswalk width={7} /></group>

      {buildings.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.ry, 0]}>
          <Building floors={b.floors} width={b.width} stone={b.stone} awning={b.awning} lit={lit} seed={b.seed} />
        </group>
      ))}
      {[-1, 1].flatMap((s) => [18, 9, -18, -27, -45, -54].map((z) => (
        <group key={`tr${s}${z}`} position={[s * 4.7, 0, z + (s > 0 ? 0 : 4)]}><Tree height={5} seed={Math.abs(z) + s} /></group>
      )))}
      {[-1, 1].flatMap((s) => [13, -4.5, -21, -36, -50].map((z) => (
        <group key={`lp${s}${z}`} position={[s * 4.4, 0, z]}><StreetLamp lit={lit} /></group>
      )))}
      {parked.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[0, c.ry, 0]}><Car color={c.color} lights={lit * 0.5} /></group>
      ))}
      {DOORS.map((d, i) => <Door key={i} side={d.side} z={d.z} open={doorOpen} />)}

      {/* Easter egg 1: a dead phone dumped in a bin */}
      <group position={[6.6, 0.16, -0.8]}>
        <TrashBin />
        <Phone p={[0.05, 0.98, 0]} r={[0.5, 0.4, 0.9]} />
      </group>

      {/* Scenes 1-3: traffic stops, crowd loses the network and leaves */}
      {t < 25 && traffic.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[0, c.ry, 0]}>
          <Car color={c.color} wheelSpin={c.spin} />
          {[-1, 1].flatMap((sx) => [-2.22, 2.22].map((z) => (
            <Block key={`${sx}${z}`} p={[sx * 0.72, 0.74, z]} s={[0.14, 0.1, 0.04]} c="#ff9a2a" e="#ff9a2a" ei={hazard} />
          )))}
        </group>
      ))}
      {t < 25 && crowd.map((w) => {
        const p = pose(w, t);
        if (!p.visible) return null;
        return (
          <group key={w.i} position={[p.x, 0.16, p.z]} rotation={[0, p.ry, 0]}>
            <Actor look={w.look} walk={p.walk} phase={t * w.v * 5.5 + w.ph} headPitch={p.headPitch} headYaw={p.headYaw}
              armR={[p.arm, 0]} phone={p.phone} glow={p.glow} />
          </group>
        );
      })}
      {t < 25 && marc13.visible && (
        <group position={[marc13.x, 0.16, marc13.z]} rotation={[0, marc13.ry, 0]}>
          <Actor look={MARC} walk={marc13.walk} phase={t * 6.5} headPitch={marc13.headPitch} headYaw={marc13.headYaw}
            armR={[marc13.arm, 0]} phone={marc13.phone} glow={marc13.glow} />
        </group>
      )}

      {/* Scene 4: doors open, people step out, Marc offers his hand */}
      {t >= 25 && t < 40 && (
        <>
          {S4_PATHS.map((p, i) => {
            const s = walkPath(p, t, [0, -0.3]);
            if (!s.visible) return null;
            const onWalk = Math.abs(s.pos[0]) > 4;
            return (
              <group key={i} position={[s.pos[0], onWalk ? 0.16 : 0, s.pos[1]]} rotation={[0, s.ry, 0]}>
                <Actor look={p.look} walk={s.walk} phase={t * 5 + i} headYaw={s.headYaw} smile={smooth(36, 37.5, t) * 0.8} />
              </group>
            );
          })}
          {marcS4.visible && (
            <group position={[marcS4.pos[0], Math.abs(marcS4.pos[0]) > 4 ? 0.16 : 0, marcS4.pos[1]]} rotation={[0, marcS4.ry, 0]}>
              <Actor look={MARC} walk={marcS4.walk} phase={t * 5} headYaw={marcS4.headYaw} armR={[marcArm, -0.05]}
                smile={smooth(34.6, 36, t) + smooth(36.8, 37.6, t) * 0.5} />
            </group>
          )}
          {strS4.visible && (
            <group position={[strS4.pos[0], Math.abs(strS4.pos[0]) > 4 ? 0.16 : 0, strS4.pos[1]]} rotation={[0, strS4.ry, 0]}>
              <Actor look={STRANGER} walk={strS4.walk} phase={t * 5 + 2} headYaw={strS4.headYaw}
                headPitch={-0.18 * win(t, 33.6, 34.8, 0.3)} armR={[strArm, -0.05]} smile={smooth(35.6, 37, t) * 1.2} />
            </group>
          )}
        </>
      )}

      {/* Scene 5a: three strangers on a bench. Easter egg 2: a phone left on the seat */}
      <group position={[5.6, 0.16, -12]} rotation={[0, Math.PI / 2, 0]}>
        <Bench />
        <Phone p={[0.82, 0.49, 0.02]} r={[0, 0.3, 0]} />
        {t >= 40 && t < 45 && [-0.6, 0, 0.6].map((x, i) => (
          <group key={i} position={[x, 0, 0.02]}>
            <Actor look={LOOKS[i + 1]} sit="chair" headYaw={i === 0 ? -0.7 : i === 2 ? 0.7 : Math.sin(t * 1.6) * 0.7}
              armR={[0.55 + 0.25 * Math.sin(t * 3 + i * 2), 0.1]} armL={[0.3, 0]} smile={0.6 + 0.4 * Math.sin(t * 0.9 + i)} />
          </group>
        ))}
      </group>

      {/* Scene 5b: improvised campfire */}
      {t >= 45 && t < 50 && (
        <>
          <Fire t={t} />
          {Array.from({length: 6}, (_, i) => {
            const a = i * (Math.PI / 3) + 0.3;
            const pos: V2 = [FIRE[0] + 1.7 * Math.sin(a), FIRE[2] + 1.7 * Math.cos(a)];
            return (
              <group key={i} position={[pos[0], 0, pos[1]]} rotation={[0, faceTo(pos, [FIRE[0], FIRE[2]]), 0]}>
                <Cyl p={[0, 0.22, 0.02]} rad={0.22} h={0.44} c="#6a4a2a" seg={8} />
                <Actor look={i === 0 ? MARC : LOOKS[i]} sit="chair" armR={[0.5 + 0.2 * Math.sin(t * 2 + i), 0]} armL={[0.4, 0]}
                  headPitch={0.05} smile={1 + 0.6 * Math.max(0, Math.sin(t * 1.3 + i * 1.7))} />
              </group>
            );
          })}
        </>
      )}

      {/* Scene 5c: two people laughing. Easter egg 3: a phone sticking out of a back pocket */}
      {t >= 50 && t < 55 && [[-6.2, -6], [-5.0, -6]].map(([x, z], i) => {
        const other: V2 = i === 0 ? [-5.0, -6] : [-6.2, -6];
        const k = Math.abs(Math.sin(t * 7 + i));
        return (
          <group key={i} position={[x, 0.16, z]} rotation={[0, faceTo([x, z], other), 0]}>
            <Actor look={i === 0 ? LOOKS[5] : LOOKS[7]} bend={-0.18 - k * 0.14} headPitch={0.15 + k * 0.1} smile={2}
              armL={[0.5 + k * 0.3, 0.2]} armR={[i === 0 ? 0.3 : 0.9 + k * 0.2, 0.1]} pocketPhone={i === 1} />
          </group>
        );
      })}

      {/* Scenes 6-7: around a paper map, until a phone lights up */}
      {t >= 55 && (
        <>
          <PaperMap />
          {(() => {
            const on = smooth(70.2, 70.6, t);
            return (
              <>
                <Phone p={PHONE_ON_MAP} r={[0, 0.8, 0]} on={on * 0.6} />
                {on > 0 && <pointLight position={[PHONE_ON_MAP[0], 0.9, PHONE_ON_MAP[2]]} color="#4a90d8" intensity={on * 1.6} distance={3.5} decay={2} />}
              </>
            );
          })()}
          <pointLight position={[MAP_C[0], 2.4, MAP_C[2]]} color="#ffc48a" intensity={2.5 * (1 - smooth(69.5, 70.4, t))} distance={7} decay={1.6} />
          {MAP_PEOPLE.map((m, i) => {
            const freeze = smooth(70.3, 71.0, t);
            const phoneYaw = faceTo(m.pos, [PHONE_ON_MAP[0], PHONE_ON_MAP[2]]) - m.ry;
            const laugh = m.marc ? smooth(61, 61.6, t) * (1 - smooth(65.2, 65.8, t)) : 0;
            const talk = Math.sin(t * 2.2 + i * 1.9);
            return (
              <group key={i} position={[m.pos[0], 0, m.pos[1]]} rotation={[0, m.ry, 0]}>
                <Actor look={m.look} sit="ground"
                  bend={mix(-0.15 + laugh * (0.3 + Math.abs(Math.sin(t * 8)) * 0.1), -0.25, freeze)}
                  headPitch={mix(-0.25 + laugh * 0.35, -0.55, freeze)}
                  headYaw={mix(talk * 0.3 * (1 - laugh), Math.max(-1, Math.min(1, phoneYaw)), freeze)}
                  armR={[mix(i % 2 ? 0.95 + talk * 0.15 : 0.35, 0.25, freeze), 0.05]}
                  armL={[mix(0.3 + laugh * 0.5, 0.25, freeze), 0]}
                  smile={mix(1 + laugh + (talk > 0.6 ? 0.6 : 0), 0, freeze)}
                  glow={smooth(70.3, 70.8, t) * 0.8} />
              </group>
            );
          })}
        </>
      )}
    </>
  );
};
