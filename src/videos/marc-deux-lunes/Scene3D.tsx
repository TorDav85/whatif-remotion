import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Block, seeded} from '../../assets/kit';
import {Person} from '../../assets/Person';
import {CityBase} from '../../assets/city/CityBase';
import {useGlowTexture} from '../../shared/three/common';
import {SkyDome} from '../../shared/three/SkyDome';
import {EarthGlobe} from '../../shared/three/EarthGlobe';
import {Marc} from '../../shared/characters/Marc';
import {cutsOf, shotAt as shotAtOf, type Shot as ShotOf} from '../../shared/three/shots';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

// ---------- Story clock (s). Mirrored in scripts/audio/marc-deux-lunes.py ----------
/** The second moon lights up in the sky. */
export const APPEAR = 2.4;
export const BIN = 7.2;
/** Nights twice as bright from here. */
export const BRIGHT = 21.4;
export const DOGS = 28.3;
export const TIDE: [number, number] = [33.0, 39.2];
export const ECLIPSES = [41.4, 44.2];
export const PULL: [number, number] = [47.0, 53.6];
export const CRASH = 56.6;
export const RINGS: [number, number] = [60.2, 66.0];
export const LOOK_UP = 68.0;
export const DURATION = 84;

/** World segments: which set is on screen. */
const RULE: [number, number] = [15.2, 21.4];
export const COAST_END = 40.0;
const COAST: [number, number] = [32.4, COAST_END];
const DAY: [number, number] = [40.0, 47.0];
const SPACE: [number, number] = [47.0, 63.6];
export type World = 'street' | 'space' | 'coast';
export const worldAt = (t: number): World =>
  (t >= RULE[0] && t < RULE[1]) || (t >= SPACE[0] && t < SPACE[1]) ? 'space' : t >= COAST[0] && t < COAST[1] ? 'coast' : 'street';
export const isDay = (t: number) => t >= DAY[0] && t < DAY[1];

/** 0..1, how dark the sky is during each eclipse. */
export const eclipseDark = (t: number) => ECLIPSES.reduce((m, at) => Math.max(m, Math.exp(-Math.pow((t - at) / 0.55, 2))), 0);

// ---------- Orbits (space units: Earth radius 1, orbit 5.5, i.e. 384 400 km) ----------
export const ORBIT = 5.5;
export const KM_PER_UNIT = 384400 / ORBIT;
const MOON_R = 0.27;
const CENTER = 1.55;
const GAP0 = 0.44;
/** Angle where the two moons touch (centre distance = two radii). */
const GAP_TOUCH = 2 * Math.asin(MOON_R / ORBIT);
export const gapAt = (t: number) => mix(GAP0, GAP_TOUCH, Math.pow(smooth(PULL[0], CRASH, t), 1.7));
/** Distance between the two moon surfaces, in km. */
export const moonGapKm = (t: number) => Math.max(0, 2 * 384400 * Math.sin(gapAt(t) / 2) - 2 * 1737);
const orbitPos = (a: number): V3 => [ORBIT * Math.cos(a), ORBIT * Math.sin(a), 0];
const moon1Pos = (t: number) => orbitPos(CENTER + gapAt(t) / 2);
const moon2Pos = (t: number) => orbitPos(CENTER - gapAt(t) / 2);
const CONTACT: V3 = orbitPos(CENTER);

/** Debris ring around the Earth, tilted like the equator. */
const RING_IN = 2.0;
const RING_OUT = 3.4;
const RING_TILT = 1.875;
const ringPoint = (r: number, a: number): V3 => [r * Math.cos(a), r * Math.sin(a) * Math.cos(RING_TILT), r * Math.sin(a) * Math.sin(RING_TILT)];

// ---------- Street layout (CityBase, metres; the street runs along z) ----------
const WALK_Y = 0.15;
const MARC_SPOT: V3 = [-6.6, WALK_Y, 0];
const DOOR: V3 = [-8.7, WALK_Y, 0.3];
const BIN_AT: V3 = [-5.5, WALK_Y, -1.6];
const JULIEN_SPOT: V3 = [-7.5, WALK_Y, 0.8];
const MODEL_H = 2.06;
const S = 1.8 / MODEL_H;

/** Sky directions seen from the street (unit vectors). */
const nrm = (x: number, y: number, z: number): V3 => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};
const MOON1_DIR = nrm(-0.06, 0.48, -1);
const MOON2_DIR = nrm(0.2, 0.6, -1);
const SUN_DIR = nrm(0.08, 0.58, -1);
const SKY_D = 420;

// ---------- Textures ----------
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/** Full-moon disc for the sky (transparent outside the circle). */
const useMoonDisc = () =>
  useMemo(
    () =>
      canvasTex(256, 256, (g) => {
        const r = seeded(11);
        g.save();
        g.beginPath();
        g.arc(128, 128, 120, 0, Math.PI * 2);
        g.clip();
        const gr = g.createRadialGradient(110, 110, 10, 128, 128, 124);
        gr.addColorStop(0, '#fbf8ef');
        gr.addColorStop(1, '#d8d2c2');
        g.fillStyle = gr;
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = 'rgba(150,146,136,0.55)';
        for (const [x, y, rx, ry] of [[95, 90, 34, 24], [150, 110, 26, 30], [120, 160, 40, 20], [170, 165, 18, 14]]) {
          g.beginPath();
          g.ellipse(x, y, rx, ry, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
        for (let i = 0; i < 26; i++) {
          const x = 20 + r() * 216;
          const y = 20 + r() * 216;
          const s = 3 + r() * 9;
          g.strokeStyle = 'rgba(120,116,108,0.5)';
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(x, y, s, 0, Math.PI * 2);
          g.stroke();
        }
        g.restore();
      }),
    [],
  );

/** Wrapped surface for the moons seen from space. */
const useMoonSurface = () =>
  useMemo(
    () =>
      canvasTex(512, 256, (g) => {
        const r = seeded(17);
        g.fillStyle = '#c4beb2';
        g.fillRect(0, 0, 512, 256);
        for (let i = 0; i < 9; i++) {
          g.fillStyle = 'rgba(128,122,112,0.55)';
          g.beginPath();
          g.ellipse(r() * 512, 50 + r() * 156, 20 + r() * 45, 12 + r() * 30, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
        for (let i = 0; i < 90; i++) {
          const x = r() * 512;
          const y = r() * 256;
          const s = 2 + r() * 8;
          g.fillStyle = 'rgba(100,96,88,0.35)';
          g.beginPath();
          g.arc(x, y, s, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = 'rgba(235,230,220,0.35)';
          g.beginPath();
          g.arc(x - 1, y - 1, s, Math.PI, Math.PI * 1.6);
          g.stroke();
        }
      }),
    [],
  );

/** Dark disc of a moon in front of the Sun. */
const useDarkDisc = () =>
  useMemo(
    () =>
      canvasTex(128, 128, (g) => {
        const gr = g.createRadialGradient(64, 64, 52, 64, 64, 62);
        gr.addColorStop(0, 'rgba(18,18,24,1)');
        gr.addColorStop(1, 'rgba(18,18,24,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 128, 128);
      }),
    [],
  );

/** Concentric bands, mapped by the planar UVs of a ringGeometry. */
const useRingBands = () =>
  useMemo(
    () =>
      canvasTex(512, 512, (g) => {
        const r = seeded(29);
        const inner = (RING_IN / RING_OUT) * 256;
        for (let rad = inner; rad < 256; rad += 1.5) {
          const k = (rad - inner) / (256 - inner);
          const a = (0.25 + 0.55 * r()) * Math.sin(Math.PI * k) ** 0.6 * (r() > 0.93 ? 0.15 : 1);
          const c = Math.round(205 + 40 * r());
          g.strokeStyle = `rgba(${c},${c - 8},${c - 22},${a})`;
          g.lineWidth = 2;
          g.beginPath();
          g.arc(256, 256, rad, 0, Math.PI * 2);
          g.stroke();
        }
      }),
    [],
  );

// ---------- Sky seen from the ground (drawn around the camera, beyond the city) ----------
const at = (cam: THREE.Vector3, dir: V3, d = SKY_D): V3 => [cam.x + dir[0] * d, cam.y + dir[1] * d, cam.z + dir[2] * d];

const SkyMoon: React.FC<{cam: THREE.Vector3; dir: V3; alpha: number; size: number; flash?: number}> = ({cam, dir, alpha, size, flash = 0}) => {
  const disc = useMoonDisc();
  const glow = useGlowTexture();
  if (alpha <= 0.01) return null;
  const p = at(cam, dir);
  return (
    <group position={p}>
      <sprite scale={[size * (5 + 6 * flash), size * (5 + 6 * flash), 1]} renderOrder={1}>
        <spriteMaterial map={glow} color="#cfe0ff" transparent opacity={(0.35 + 0.6 * flash) * alpha} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite scale={[size * 2, size * 2, 1]} renderOrder={2}>
        <spriteMaterial map={disc} transparent opacity={alpha} fog={false} depthWrite={false} />
      </sprite>
    </group>
  );
};

/** The Sun with the two moons crossing it, one per eclipse. */
const SkySun: React.FC<{cam: THREE.Vector3; t: number}> = ({cam, t}) => {
  const glow = useGlowTexture();
  const dark = useDarkDisc();
  const p = at(cam, SUN_DIR);
  const side = new THREE.Vector3(1, 0, 0);
  const up = new THREE.Vector3().crossVectors(side, new THREE.Vector3(...SUN_DIR)).normalize();
  return (
    <group position={p}>
      <sprite scale={[150, 150, 1]} renderOrder={1}>
        <spriteMaterial map={glow} color="#fff4d6" transparent opacity={0.9 - 0.6 * eclipseDark(t)} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite scale={[34, 34, 1]} renderOrder={2}>
        <spriteMaterial map={glow} color="#ffffff" transparent opacity={1} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {ECLIPSES.map((e, i) => {
        const k = (t - e) / 1.6;
        if (Math.abs(k) > 1.4) return null;
        const off = side.clone().multiplyScalar(k * 38).add(up.clone().multiplyScalar((i ? -1 : 1) * 2 * k));
        return (
          <sprite key={i} position={[off.x, off.y, off.z + 1]} scale={[30, 30, 1]} renderOrder={3}>
            <spriteMaterial map={dark} transparent fog={false} depthWrite={false} />
          </sprite>
        );
      })}
    </group>
  );
};

/** The debris ring arching across the night sky. */
const SkyRing: React.FC<{cam: THREE.Vector3; alpha: number}> = ({cam, alpha}) => {
  const bands = useRingBands();
  if (alpha <= 0.01) return null;
  return (
    <mesh position={[cam.x, cam.y - 330, cam.z]} rotation={[-Math.PI / 2 + 0.8, 0, 0.1]} renderOrder={1}>
      <ringGeometry args={[RING_IN * 260, RING_OUT * 260, 160, 1]} />
      <meshBasicMaterial map={bands} transparent opacity={alpha} side={THREE.DoubleSide} fog={false} depthWrite={false} />
    </mesh>
  );
};

// ---------- Street props ----------
const TrashBin: React.FC<{lid: number}> = ({lid}) => (
  <group>
    <Block p={[0, 0.5, 0]} s={[0.6, 1.0, 0.7]} c="#3f6b4a" />
    <group position={[0, 1.0, 0.35]} rotation={[-1.6 * lid, 0, 0]}>
      <Block p={[0, 0.03, -0.36]} s={[0.64, 0.06, 0.74]} c="#2f5a3a" />
    </group>
    {[-0.22, 0.22].map((x) => <Block key={x} p={[x, 0.06, 0.36]} s={[0.08, 0.12, 0.08]} c="#1d1d1f" />)}
  </group>
);

const Bag: React.FC = () => (
  <mesh>
    <icosahedronGeometry args={[0.2, 1]} />
    <meshStandardMaterial color="#1c1d22" roughness={0.4} flatShading />
  </mesh>
);

const Newspaper: React.FC = () => (
  <group position={[0, 1.32, -0.42]} rotation={[-0.25, 0, 0]}>
    <Block p={[-0.17, 0, 0]} s={[0.34, 0.44, 0.01]} r={[0, 0.18, 0]} c="#ece8dc" />
    <Block p={[0.17, 0, 0]} s={[0.34, 0.44, 0.01]} r={[0, -0.18, 0]} c="#ece8dc" />
    <Block p={[-0.17, 0.14, -0.01]} s={[0.26, 0.06, 0.004]} r={[0, 0.18, 0]} c="#2b2b2b" />
    {[0.04, -0.03, -0.1].map((y) => <Block key={y} p={[0.17, y, -0.01]} s={[0.26, 0.02, 0.004]} r={[0, -0.18, 0]} c="#8a8a8a" />)}
  </group>
);

/** Simple block dog, snout raised when it howls. Faces -z. */
const Dog: React.FC<{t: number; howl: number; coat: string; size?: number}> = ({t, howl, coat, size = 1}) => {
  const up = howl * (0.8 + 0.1 * Math.sin(t * 3));
  return (
    <group scale={size}>
      <Block p={[0, 0.42, 0]} s={[0.26, 0.24, 0.62]} c={coat} />
      {[[-0.09, -0.22], [0.09, -0.22], [-0.09, 0.22], [0.09, 0.22]].map(([x, z]) => <Block key={`${x}${z}`} p={[x, 0.17, z]} s={[0.08, 0.32, 0.08]} c={coat} />)}
      <group position={[0, 0.58, -0.3]} rotation={[0.9 * up, 0, 0]}>
        <Block p={[0, 0.06, -0.06]} s={[0.2, 0.2, 0.2]} c={coat} />
        <Block p={[0, 0.02, -0.2]} s={[0.11, 0.1, 0.14]} c={coat} />
        <Block p={[0, 0.05, -0.28]} s={[0.05, 0.04, 0.03]} c="#111" />
        {[-0.07, 0.07].map((x) => <Block key={x} p={[x, 0.2, -0.02]} s={[0.05, 0.1, 0.04]} c="#3a2a1e" />)}
      </group>
      <group position={[0, 0.5, 0.3]} rotation={[-0.8 + 0.2 * Math.sin(t * 9), 0, 0]}>
        <Block p={[0, 0.12, 0]} s={[0.05, 0.25, 0.05]} c={coat} />
      </group>
    </group>
  );
};
const DOGS_AT: {p: V3; yaw: number; coat: string; size: number; delay: number}[] = [
  {p: [-1.3, 0, -2.6], yaw: 0.3, coat: '#c89a5a', size: 1.3, delay: 0},
  {p: [1.6, 0, -4.2], yaw: -0.3, coat: '#3b3430', size: 1.5, delay: 0.7},
  {p: [-3.6, 0, -7.5], yaw: 0.4, coat: '#e8e2d2', size: 1.1, delay: 1.5},
  {p: [3.8, 0, -10], yaw: -0.2, coat: '#7a5a3a', size: 1.4, delay: 0.4},
];

// ---------- Characters over time (street) ----------
type MarcPose = {pos: V3; yaw: number; walk: number; right?: V3; left?: V3; smile: number; cold: number; bag: boolean; paper: boolean};
const marcAt = (t: number): MarcPose => {
  if (t < 5.2) return {pos: MARC_SPOT, yaw: 0, walk: 0, smile: 0, cold: 0.5 * smooth(APPEAR, APPEAR + 0.6, t), bag: false, paper: false};
  if (t < 7.6) {
    // Out of the door with the bag, into the bin.
    const k = smooth(5.2, 6.9, t);
    const pos = mixV(DOOR, [-6.3, WALK_Y, -0.3], k);
    const toss = smooth(6.9, BIN, t);
    return {pos, yaw: mix(-Math.PI / 2 - 0.5, -0.4, smooth(6.6, 7.4, t)), walk: k > 0 && k < 1 ? 1 : 0, smile: 0.3, cold: 0,
      right: [0.32, mix(0.75, 1.3, toss), mix(-0.1, -0.45, toss)], bag: t < BIN, paper: false};
  }
  if (t < 15.2) {
    // Looks up; then points at the sky for Julien.
    const point = smooth(11.0, 11.6, t);
    return {pos: [-6.3, WALK_Y, -0.3], yaw: mix(-0.4, 0, smooth(7.6, 8.4, t)), walk: 0, smile: 0, cold: 0.6,
      right: point > 0.01 ? mixV([0.3, 0.94, 0], [0.28, 2.25, -0.3], point) : undefined, bag: false, paper: false};
  }
  if (t < 27.8) return {pos: MARC_SPOT, yaw: 0, walk: 0, smile: 0.6, cold: 0, right: [0.2, 1.3, -0.36], left: [-0.2, 1.3, -0.36], bag: false, paper: true};
  if (t < 63.6) return {pos: MARC_SPOT, yaw: 0, walk: 0, smile: 0, cold: isDay(t) ? 0.8 : 0.4, bag: false, paper: false};
  // Rings in the sky: amazed, then smug once Julien looks up.
  const smug = smooth(LOOK_UP + 0.6, LOOK_UP + 1.2, t);
  return {pos: MARC_SPOT, yaw: 0, walk: 0, smile: smug, cold: 0.7 * (1 - smug),
    right: smug > 0.01 ? mixV([0.3, 0.94, 0], [-0.2, 1.3, -0.17], smug) : undefined,
    left: smug > 0.01 ? mixV([-0.3, 0.94, 0], [0.2, 1.3, -0.17], smug) : undefined, bag: false, paper: false};
};

type JulienPose = {pos: V3; yaw: number; pose: 'debout' | 'marche' | 'bras-leves'; phase: number; bend: number};
const julienAt = (t: number): JulienPose => {
  if (t < 10.8) return {pos: JULIEN_SPOT, yaw: 0, pose: 'debout', phase: 0, bend: 0};
  if (t < 15.2) return {pos: JULIEN_SPOT, yaw: -0.5, pose: 'debout', phase: 0, bend: 0.06};
  if (t >= 43.0 && t < DAY[1]) return {pos: JULIEN_SPOT, yaw: 0, pose: 'bras-leves', phase: 0, bend: -0.1};
  if (t >= LOOK_UP) return {pos: JULIEN_SPOT, yaw: 0, pose: 'bras-leves', phase: 0, bend: -0.12};
  return {pos: JULIEN_SPOT, yaw: 0, pose: 'debout', phase: 0, bend: 0};
};

// ---------- Coast: Saint-Malo ramparts (metres; the sea is at -z) ----------
const WALL_TOP = 16;
const PLATEAU = 12;
/** Water level above low tide (m): yesterday's high tide was 13 m. */
export const tideAt = (t: number) => 26 * smooth(TIDE[0], TIDE[1], t);
const HOUSES = (() => {
  const r = seeded(31);
  return Array.from({length: 11}, (_, i) => ({x: -55 + i * 10 + r() * 2, w: 8 + r() * 1.5, h: 10 + r() * 6, d: 9 + r() * 3, z: 10 + r() * 6}));
})();

const Coast: React.FC<{t: number}> = ({t}) => {
  const h = tideAt(t);
  const over = Math.max(0, h - WALL_TOP);
  const wave = 0.25 * Math.sin(t * 2.2);
  return (
    <group>
      <group scale={[30, 30, 30]}>
        <SkyDome top={new THREE.Color('#5d93d6')} bottom={new THREE.Color('#e8eef2')} />
      </group>
      <fog attach="fog" args={['#dfe7ec', 120, 600]} />
      <hemisphereLight color="#dbe8f6" groundColor="#7b7466" intensity={1.1} />
      <directionalLight color="#fff1d8" intensity={1.6} position={[40, 60, -50]} />
      <ambientLight intensity={0.2} />
      {/* Sand at low tide */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -150]}><planeGeometry args={[800, 300]} /><meshStandardMaterial color="#cdbb92" roughness={1} /></mesh>
      {/* Granite rampart, with crenellations and a buttress tower */}
      <Block p={[0, WALL_TOP / 2, 3]} s={[140, WALL_TOP, 6]} c="#857d70" />
      {Array.from({length: 35}, (_, i) => <Block key={i} p={[-68 + i * 4, WALL_TOP + 0.6, 0.6]} s={[2.2, 1.2, 1.2]} c="#8c8478" />)}
      {[-1, 1].flatMap((s) => [0.3, 0.55, 0.8].map((y) => <Block key={`${s}${y}`} p={[0, WALL_TOP * y, 0.0 - 0.02]} s={[140, 0.12, 0.05]} c="#6f685d" />))}
      <Block p={[18, 11, -1]} s={[9, 22, 9]} c="#7c7468" />
      <Block p={[18, 23, -1]} s={[10, 2, 10]} c="#6c655a" />
      {/* Old town behind the wall */}
      <Block p={[0, PLATEAU / 2, 20]} s={[140, PLATEAU, 28]} c="#8a8274" />
      {HOUSES.map((b, i) => (
        <group key={i} position={[b.x, PLATEAU, b.z]}>
          <Block p={[0, b.h / 2, 0]} s={[b.w, b.h, b.d]} c={i % 2 ? '#9c9385' : '#a89f90'} />
          <Block p={[0, b.h + 1.6, 0]} s={[b.w * 0.98, 3.2, 3.2]} r={[Math.PI / 4, 0, 0]} c="#3d4550" />
          {[-0.3, 0, 0.3].flatMap((fx) => [0.35, 0.65].map((fy) => (
            <Block key={`${fx}${fy}`} p={[fx * b.w, fy * b.h, -b.d / 2 - 0.02]} s={[1.1, 1.5, 0.05]} c="#2a3038" />
          )))}
          <Block p={[b.w * 0.3, b.h + 3.4, 0]} s={[0.9, 2, 0.9]} c="#7a7266" />
        </group>
      ))}
      {/* Yesterday's high tide: 13 m */}
      <Block p={[0, 13, -0.06]} s={[140, 0.25, 0.05]} c="#F6E05E" e="#F6E05E" ei={0.6} />
      {/* The sea */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, h + wave, -200]}>
        <planeGeometry args={[800, 400]} />
        <meshStandardMaterial color="#2c6a86" roughness={0.25} metalness={0.15} transparent opacity={0.93} />
      </mesh>
      <Block p={[0, h + wave + 0.15, -0.6]} s={[140, 0.35, 1.0]} c="#f2f7f8" o={0.85} />
      {over > 0.05 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, PLATEAU + over * 1.6, 20]}>
          <planeGeometry args={[140, 28]} />
          <meshStandardMaterial color="#2f6e8a" roughness={0.3} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
};

// ---------- Space ----------
const SpaceStars: React.FC<{radius: number}> = ({radius}) => {
  const geo = useMemo(() => {
    const r = seeded(77);
    const pts = new Float32Array(1400 * 3);
    for (let i = 0; i < 1400; i++) {
      const u = r() * 2 - 1;
      const a = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pts.set([s * Math.cos(a), u, s * Math.sin(a)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo} scale={radius}>
      <pointsMaterial color="#ffffff" size={2.2} sizeAttenuation={false} fog={false} />
    </points>
  );
};

const SpaceMoon: React.FC<{p: V3; spin: number}> = ({p, spin}) => {
  const surface = useMoonSurface();
  return (
    <mesh position={p} rotation={[0.2, spin, 0]} scale={MOON_R}>
      <sphereGeometry args={[1, 48, 32]} />
      <meshStandardMaterial map={surface} roughness={1} />
    </mesh>
  );
};

const FRAGMENTS = (() => {
  const r = seeded(43);
  return Array.from({length: 260}, () => {
    const u = r() * 2 - 1;
    const a = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const dir: V3 = [s * Math.cos(a), u, s * Math.sin(a)];
    return {dir, sp: 0.12 + r() * 0.5, size: 0.015 + r() * 0.05, spin: r() * 6, ringR: RING_IN + r() * (RING_OUT - RING_IN), ringA: r() * Math.PI * 2,
      off: [(r() - 0.5) * 0.36, (r() - 0.5) * 0.36, (r() - 0.5) * 0.36] as V3, shade: 0.55 + r() * 0.4};
  });
})();

/** The second moon after the crash: chunks flying apart, then spreading into the ring. */
const Debris: React.FC<{t: number}> = ({t}) => {
  const dt = t - CRASH;
  const settle = smooth(RINGS[0], RINGS[1] - 1.5, t);
  const p2 = moon2Pos(CRASH);
  // Pushed away from the surviving moon.
  const away = new THREE.Vector3(...p2).sub(new THREE.Vector3(...moon1Pos(CRASH))).normalize();
  return (
    <>
      {FRAGMENTS.map((f, i) => {
        const burst: V3 = [
          p2[0] + f.off[0] + (f.dir[0] + away.x * 0.8) * f.sp * dt,
          p2[1] + f.off[1] + (f.dir[1] + away.y * 0.8) * f.sp * dt,
          p2[2] + f.off[2] + (f.dir[2] + away.z * 0.8) * f.sp * dt,
        ];
        const ring = ringPoint(f.ringR, f.ringA + 0.12 * (t - RINGS[0]));
        const c = Math.round(255 * f.shade);
        return (
          <mesh key={i} position={mixV(burst, ring, settle)} rotation={[f.spin * t, f.spin * 0.7 * t, 0]} scale={f.size * (1 - 0.5 * settle)}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={`rgb(${c},${c - 6},${c - 16})`} flatShading roughness={1} />
          </mesh>
        );
      })}
    </>
  );
};

const Space: React.FC<{t: number}> = ({t}) => {
  const glow = useGlowTexture();
  const bands = useRingBands();
  const crashed = t >= CRASH;
  const flash = Math.max(0, 1 - Math.abs(t - CRASH) / 0.5);
  const ring = smooth(RINGS[0] + 1, RINGS[1], t);
  const m1 = crashed ? moon1Pos(CRASH) : moon1Pos(t);
  const m2 = moon2Pos(t);
  const lineLen = ORBIT - 1.05 - MOON_R;
  const grow = Math.max(0.001, smooth(RULE[0] + 0.6, RULE[0] + 2.2, t));
  return (
    <>
      <color attach="background" args={['#03040a']} />
      <SpaceStars radius={300} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[6, 3, 8]} intensity={2.6} />
      <EarthGlobe />
      <mesh scale={1.025}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial color="#7fb2ff" transparent opacity={0.18} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* The shared orbit */}
      <mesh>
        <torusGeometry args={[ORBIT, 0.012, 6, 200]} />
        <meshBasicMaterial color="#9fb6d8" transparent opacity={0.35 * (1 - smooth(CRASH, CRASH + 2, t))} depthWrite={false} />
      </mesh>
      {/* Distance ruler, Earth to the new moon (rule shot only) */}
      {t < RULE[1] && (
        <group rotation={[0, 0, CENTER - GAP0 / 2 - Math.PI / 2]}>
          <mesh position={[0, 1.05 + (lineLen * grow) / 2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, lineLen * grow, 8]} />
            <meshBasicMaterial color="#F6E05E" />
          </mesh>
        </group>
      )}
      <SpaceMoon p={m1} spin={t * 0.05} />
      {!crashed && <SpaceMoon p={m2} spin={1.4 + t * 0.05} />}
      {crashed && <Debris t={t} />}
      {flash > 0 && (
        <sprite position={CONTACT} scale={[3 * flash + 0.5, 3 * flash + 0.5, 1]}>
          <spriteMaterial map={glow} color="#ffd9a0" transparent opacity={flash} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      )}
      {ring > 0.01 && (
        <mesh rotation={[RING_TILT, 0, 0]}>
          <ringGeometry args={[RING_IN, RING_OUT, 160, 1]} />
          <meshBasicMaterial map={bands} transparent opacity={0.9 * ring} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </>
  );
};

// ---------- Camera ----------
const Rig: React.FC<{pos: THREE.Vector3; target: THREE.Vector3; fov: number; near: number}> = ({pos, target, fov, near}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
    camera.fov = fov;
    camera.near = near;
    camera.far = 3000;
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

type View = {pos: THREE.Vector3; target: THREE.Vector3; fov: number; shake?: number};
type Shot = ShotOf<View>;
const skyTarget = (cam: THREE.Vector3, dir: V3, d = 40) => V(cam.x + dir[0] * d, cam.y + dir[1] * d, cam.z + dir[2] * d);
const MOONS_MID = nrm(MOON1_DIR[0] + MOON2_DIR[0], MOON1_DIR[1] + MOON2_DIR[1], MOON1_DIR[2] + MOON2_DIR[2]);

export const SHOTS: Shot[] = [
  // Hook: behind Marc, the street at night, a second moon lights up.
  {from: 0, view: (t, k) => {
    const pos = V(mix(-5.5, -5.7, k), 1.1, mix(5.8, 5.2, k));
    return {pos, target: V(-6.2, 7.0 + 1.0 * k, -30), fov: 52};
  }},
  // Out with the trash.
  {from: 5.0, view: (t, k) => ({pos: V(mix(-3.0, -3.3, k), 1.55, mix(3.0, 2.7, k)), target: V(-7.0, 1.15, -0.4), fov: 50})},
  // His point of view: two moons over the rooftops.
  {from: 8.6, view: (t, k) => {
    const pos = V(-6.2, 1.9, -1.0);
    return {pos, target: skyTarget(pos, MOONS_MID).add(V(0, -6 + 3 * k, 0)), fov: mix(50, 42, k)};
  }},
  // Julien is not convinced.
  {from: 10.8, view: (t, k) => ({pos: V(mix(-6.2, -6.5, k), 1.62, mix(-4.0, -3.6, k)), target: V(-6.9, 1.35, 0.2), fov: 50})},
  // Space: same size, same distance.
  {from: RULE[0], view: (t, k) => ({pos: V(mix(1.2, 0.6, k), mix(2.4, 3.0, k), mix(16.5, 15.0, k)), target: V(0, 4.3, 0), fov: 50})},
  // Reading the paper by moonlight.
  {from: BRIGHT, view: (t, k) => ({pos: V(mix(-6.0, -6.3, k), 1.75, mix(-2.6, -2.2, k)), target: V(-6.6, 1.4, 0), fov: 50})},
  // Dogs howling down the street.
  {from: 27.8, view: (t, k) => ({pos: V(mix(0.6, 0.2, k), 1.6, mix(4.0, 2.5, k)), target: V(0, 8, -40), fov: 55})},
  // Saint-Malo, the next morning.
  {from: COAST[0], view: (t, k) => ({pos: V(mix(-34, -26, k), mix(34, 38, k), mix(-92, -84, k)), target: V(4, 12, 4), fov: 50})},
  // Day 3: the first eclipse, close on the Sun.
  {from: DAY[0], view: (t, k) => {
    const pos = V(-6.2, 1.9, -1.0);
    return {pos, target: skyTarget(pos, SUN_DIR), fov: 24};
  }},
  // The second eclipse, Marc and Julien looking up.
  {from: 43.0, view: (t, k) => {
    const pos = V(mix(-5.6, -5.8, k), 1.1, mix(6.0, 5.4, k));
    return {pos, target: V(-5.2, 9 + k, -30), fov: 54};
  }},
  // Space: the moons drift together.
  {from: PULL[0], view: (t, k) => ({pos: V(mix(0.6, 0.3, k), mix(2.8, 3.6, k), mix(14, 10.5, k)), target: V(0, mix(3.2, 4.4, k), 0), fov: 50})},
  // Close on the contact.
  {from: 54.0, view: (t, k) => ({pos: V(mix(1.5, 2.0, k), mix(5.9, 6.1, k), mix(3.0, 4.3, k)), target: V(...CONTACT), fov: 50,
    shake: Math.max(0, 1 - Math.abs(t - CRASH - 0.3) / 1.2)})},
  // The debris spread into a ring.
  {from: RINGS[0], view: (t, k) => ({pos: V(mix(2.0, 0.6, k), mix(5.0, 3.4, k), mix(6.5, 12.5, k)), target: V(0, mix(4.2, -0.6, k), 0), fov: 50})},
  // Back in the street: rings across the night sky.
  {from: SPACE[1], view: (t, k) => {
    const pos = V(mix(-5.5, -5.8, k), 1.1, mix(6.2, 5.4, k));
    return {pos, target: V(-5.0, 9 + 2 * k, -30), fov: 56};
  }},
  // Julien looks up.
  {from: 67.2, view: (t, k) => ({pos: V(mix(-6.3, -6.6, k), 1.62, mix(-3.9, -3.4, k)), target: V(-7.0, 1.4, 0.3), fov: 50})},
  // Wide: one moon and a ring.
  {from: 74.4, view: (t, k) => {
    const pos = V(mix(-3.0, -2.0, k), mix(1.4, 2.4, k), mix(6.5, 9.5, k));
    return {pos, target: V(-4.0, 14 + 4 * k, -30), fov: 58};
  }},
];
export const CUTS = cutsOf(SHOTS);

const shotAt = (t: number): View => shotAtOf(SHOTS, t, DURATION);

// ---------- Scene ----------
const Street: React.FC<{t: number; view: View}> = ({t, view}) => {
  const day = isDay(t);
  const dark = eclipseDark(t);
  const bright = smooth(BRIGHT, BRIGHT + 1.5, t);
  const m = marcAt(t);
  const j = julienAt(t);
  const appear = smooth(APPEAR - 0.2, APPEAR + 0.5, t);
  const pop = Math.max(0, 1 - Math.abs(t - APPEAR - 0.2) / 0.6);
  const crashed = t >= CRASH;
  const skyTop = day ? new THREE.Color('#5b8fd1').lerp(new THREE.Color('#0d1430'), dark).getStyle() : bright > 0.5 ? '#1d2c58' : '#0e1734';
  const skyBottom = day ? new THREE.Color('#e9e1cf').lerp(new THREE.Color('#3a3550'), dark).getStyle() : bright > 0.5 ? '#3f4c74' : '#26304e';
  const lid = smooth(6.7, 7.0, t) * (1 - smooth(7.3, 7.6, t));
  return (
    <CityBase time={t} seed={42} lit={day ? 0 : 1} traffic={false} crowd={false} fogFar={day ? 420 : 300} focus={view.pos.z - 20}
      skyTop={skyTop} skyBottom={skyBottom}>
      {/* Moonlight, twice as strong once there are two moons */}
      {!day && <directionalLight color="#b9cdf5" intensity={0.35 + 0.35 * appear + 0.9 * bright} position={[-20, 60, -120]} />}
      {!day && <hemisphereLight color="#9fb4e0" groundColor="#2a2a35" intensity={0.15 + 0.45 * bright} />}
      {!day && (
        <>
          <SkyMoon cam={view.pos} dir={MOON1_DIR} alpha={1} size={22} />
          {!crashed && <SkyMoon cam={view.pos} dir={MOON2_DIR} alpha={appear} size={22 * (0.7 + 0.3 * appear + 0.15 * pop)} flash={pop} />}
          {crashed && <SkyRing cam={view.pos} alpha={1} />}
        </>
      )}
      {day && <SkySun cam={view.pos} t={t} />}
      <group position={BIN_AT} rotation={[0, 0.2, 0]}><TrashBin lid={lid} /></group>
      {t >= 27.8 && t < 32.4 && DOGS_AT.map((d, i) => (
        <group key={i} position={d.p} rotation={[0, d.yaw, 0]}>
          <Dog t={t + i} howl={smooth(DOGS + d.delay - 0.2, DOGS + d.delay + 0.3, t)} coat={d.coat} size={d.size} />
        </group>
      ))}
      <group position={m.pos} rotation={[0, m.yaw, 0]}>
        <group scale={S}>
          <Marc t={t} walk={m.walk} cold={m.cold} smile={m.smile} rightHand={m.right} leftHand={m.left} />
          {m.bag && <group position={m.right ?? [0.3, 0.9, 0]}><group position={[0, -0.2, 0]}><Bag /></group></group>}
        </group>
        {m.paper && <Newspaper />}
      </group>
      <group position={j.pos} rotation={[0, j.yaw, 0]}>
        <Person shirt="#3a6fb0" pants="#2f343c" skin="#d9a27c" hair="#1e1712" pose={j.pose} phase={j.phase} bend={j.bend} />
      </group>
    </CityBase>
  );
};

export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const base = shotAt(t);
  const s = base.shake ?? 0;
  const view = s > 0 ? {...base, pos: base.pos.clone().add(V(Math.sin(t * 61) * 0.06 * s, Math.sin(t * 47) * 0.05 * s, 0))} : base;
  const world = worldAt(t);
  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} near={world === 'space' ? 0.01 : 0.05} />
      {world === 'street' && <Street t={t} view={view} />}
      {world === 'space' && <Space t={t} />}
      {world === 'coast' && <Coast t={t} />}
    </>
  );
};
