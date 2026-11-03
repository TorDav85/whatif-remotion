import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Block, Cyl, seeded} from '../../assets/kit';
import {Fridge, KitchenCounter, UpperCabinet, InteriorWindow, WallClock, PottedPlant} from '../../assets/interior';
import {Person} from '../../assets/Person';
import {Marc} from '../../shared/characters/Marc';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

// ---------- Story clock (s). Mirrored in scripts/audio/marc-four.py ----------
export const DOOR_CLOSE = 8.0;
/** Each doubling of the temperature (minutes 1 to 5). */
export const MINUTES = [21.0, 32.0, 39.0, 46.4, 57.6];
const KNOCKS = [22.2, 22.6, 23.0, 24.4, 24.8, 25.2];
export const FIRE = 40.2;
export const CRUMBLE = 60.6;
export const DOOR_OPEN = 69.8;
export const SNEEZE = 72.6;
export const DURATION = 84;
export const T0 = 38;

/** Minutes elapsed, continuous (each doubling eases in over 1.2 s). */
export const minuteAt = (t: number) => MINUTES.reduce((n, at) => n + smooth(at, at + 1.2, t), 0);
export const tempAt = (t: number) => (t < 9 ? 20 + 18 * smooth(8.0, 9.0, t) : T0 * Math.pow(2, minuteAt(t)));
/** 0 at 38 °C, 1 at 1216 °C. */
export const heatAt = (t: number) => clamp01(minuteAt(t) / 5);

const MODEL_H = 2.06;
const S = 1.8 / MODEL_H;

// ---------- Oven geometry (metres). Front (door) at z = 0.5, facing -z ----------
const OW = 1.7; // outer width
const OH = 2.6; // outer height
const FRONT = 0.5;
const BACK = 2.0;
const FLOOR = 0.12;
const IN_BACK: V3 = [0, FLOOR, 1.25];
const IN_GLASS: V3 = [0, FLOOR, 0.95];
const OUTSIDE: V3 = [0, 0, -0.5];
const DIAL: V3 = [0.45, 2.78, FRONT - 0.04];

const STEEL = '#b9c0c8';
const ENAMEL = '#2b2522';

export const Oven: React.FC<{t: number; heat: number; door: number}> = ({t, heat, door}) => {
  const glow = 0.4 + 2.6 * heat + 0.15 * Math.sin(t * 9);
  const element = new THREE.Color('#5a2a1a').lerp(new THREE.Color('#ff5a1a'), clamp01(heat * 1.6)).lerp(new THREE.Color('#fff2c0'), clamp01(heat * 2 - 1)).getStyle();
  const cz = (FRONT + BACK) / 2;
  const depth = BACK - FRONT;
  const lightCol = new THREE.Color('#ffb070').lerp(new THREE.Color('#fff0d0'), heat);
  return (
    <group>
      {/* Shell */}
      <Block p={[-OW / 2 + 0.06, OH / 2, cz]} s={[0.12, OH, depth]} c={STEEL} metal />
      <Block p={[OW / 2 - 0.06, OH / 2, cz]} s={[0.12, OH, depth]} c={STEEL} metal />
      <Block p={[0, OH - 0.06, cz]} s={[OW, 0.12, depth]} c={STEEL} metal />
      <Block p={[0, FLOOR / 2, cz]} s={[OW, FLOOR, depth]} c={STEEL} metal />
      <Block p={[0, OH / 2, BACK - 0.06]} s={[OW, OH, 0.12]} c={STEEL} metal />
      {/* Enamel inside */}
      <Block p={[-OW / 2 + 0.125, OH / 2, cz]} s={[0.01, OH - 0.24, depth - 0.1]} c={ENAMEL} />
      <Block p={[OW / 2 - 0.125, OH / 2, cz]} s={[0.01, OH - 0.24, depth - 0.1]} c={ENAMEL} />
      <Block p={[0, OH / 2, BACK - 0.125]} s={[OW - 0.24, OH - 0.24, 0.01]} c={ENAMEL} />
      <Block p={[0, OH - 0.125, cz]} s={[OW - 0.24, 0.01, depth - 0.1]} c={ENAMEL} />
      <Block p={[0, FLOOR + 0.005, cz]} s={[OW - 0.24, 0.01, depth - 0.1]} c="#3a332e" />
      {/* Racks on the side walls */}
      {[0.8, 1.4, 2.0].flatMap((y) => [-1, 1].map((s) => <Block key={`${y}${s}`} p={[s * (OW / 2 - 0.15), y, cz]} s={[0.03, 0.03, depth - 0.2]} c="#8a8f96" metal />))}
      {/* Heating elements, top and bottom */}
      {[OH - 0.2, FLOOR + 0.06].flatMap((y) => [-0.35, 0, 0.35].map((dz) => (
        <Cyl key={`${y}${dz}`} p={[0, y, cz + dz]} rad={0.018} h={OW - 0.3} r={[0, 0, Math.PI / 2]} c={element} e={element} ei={0.3 + 2.5 * heat} />
      )))}
      <pointLight position={[0, OH - 0.45, cz]} intensity={glow} distance={4.5} decay={1.5} color={lightCol} />
      <pointLight position={[0, 0.5, cz - 0.3]} intensity={0.6 + 1.2 * heat} distance={3} decay={1.5} color={lightCol} />
      {/* Control panel above the door */}
      <Block p={[0, OH + 0.18, FRONT + 0.12]} s={[OW, 0.36, 0.28]} c="#2e3238" />
      <group position={DIAL}>
        <Cyl p={[0, 0, 0]} rad={0.11} h={0.05} r={[Math.PI / 2, 0, 0]} c="#d8dce0" metal />
        <group rotation={[0, 0, -heat * Math.PI * 1.5 + 0.75 * Math.PI]}>
          <Block p={[0, 0.06, -0.03]} s={[0.02, 0.09, 0.02]} c="#d8342c" />
        </group>
      </group>
      <Block p={[-0.35, 2.78, FRONT - 0.03]} s={[0.5, 0.16, 0.02]} c="#120808" e="#ff3a10" ei={0.6} />
      {/* Door, hinged on the left edge, swings toward the camera */}
      <group position={[-OW / 2, 0, FRONT]} rotation={[0, door * 1.75, 0]}>
        <group position={[OW / 2, 0, -0.04]}>
          <Block p={[0, 0.17, 0]} s={[OW, 0.14, 0.08]} c={STEEL} metal />
          <Block p={[0, OH - 0.13, 0]} s={[OW, 0.26, 0.08]} c={STEEL} metal />
          {[-1, 1].map((s) => <Block key={s} p={[s * (OW / 2 - 0.12), OH / 2, 0]} s={[0.24, OH, 0.08]} c={STEEL} metal />)}
          <mesh position={[0, (0.24 + OH - 0.26) / 2, 0]}>
            <boxGeometry args={[OW - 0.48, OH - 0.5, 0.02]} />
            <meshStandardMaterial color="#ffd9b0" transparent opacity={0.12 + 0.08 * heat} roughness={0.05} metalness={0.1} depthWrite={false} />
          </mesh>
          <Cyl p={[OW / 2 - 0.12, 1.35, -0.09]} rad={0.025} h={0.9} c="#3a3f47" metal />
        </group>
      </group>
    </group>
  );
};

const Kitchen: React.FC<{t: number; heat: number}> = ({t, heat}) => {
  const wall = new THREE.Color('#dfe6e0').lerp(new THREE.Color('#f0c9a0'), heat * 0.5).getStyle();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#d8d2c4" roughness={0.9} /></mesh>
      {Array.from({length: 20}, (_, i) => <Block key={`x${i}`} p={[-5 + i * 0.5, 0.002, 0]} s={[0.01, 0.004, 10]} c="#b9b2a2" />)}
      {Array.from({length: 20}, (_, i) => <Block key={`z${i}`} p={[0, 0.002, -5 + i * 0.5]} s={[10, 0.004, 0.01]} c="#b9b2a2" />)}
      <mesh position={[0, 1.6, 2.2]} rotation={[0, Math.PI, 0]}><planeGeometry args={[10, 3.2]} /><meshStandardMaterial color={wall} roughness={0.95} /></mesh>
      <mesh position={[-3.2, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[10, 3.2]} /><meshStandardMaterial color={wall} roughness={0.95} /></mesh>
      <mesh position={[3.4, 1.6, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[10, 3.2]} /><meshStandardMaterial color={wall} roughness={0.95} /></mesh>
      <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#f2efe8" roughness={1} /></mesh>
      <group position={[-2.75, 0, 1.85]}><Fridge /></group>
      <group position={[-1.85, 0, 1.88]}><KitchenCounter width={0.9} /></group>
      <group position={[-1.85, 1.6, 2.0]}><UpperCabinet width={0.9} /></group>
      <group position={[2.1, 0.85, 2.18]}><InteriorWindow curtain="#3a7a5a" light={0.5} /></group>
      <group position={[1.15, 2.2, 2.18]}><WallClock time={10 + minuteAt(t) / 60} /></group>
      <group position={[2.9, 0, 1.4]}><PottedPlant size={1.1 - 0.3 * heat} /></group>
    </group>
  );
};

// ---------- Effects ----------
type Pt = {x: number; y: number; z: number; ph: number; sp: number; s: number};
const points = (seed: number, n: number, f: (r: () => number) => Omit<Pt, 'ph' | 'sp' | 's'>) => {
  const r = seeded(seed);
  return Array.from({length: n}, () => ({...f(r), ph: r(), sp: 0.6 + r() * 0.8, s: 0.6 + r() * 0.8}));
};
const BODY_PTS = points(5, 40, (r) => ({x: (r() - 0.5) * 0.5, y: 0.9 + r() * 0.9, z: (r() - 0.5) * 0.3 - 0.1}));
const HEAD_PTS = points(9, 14, (r) => ({x: (r() - 0.5) * 0.25, y: 1.95, z: (r() - 0.5) * 0.2 - 0.1}));
const TORSO_PTS = points(13, 34, (r) => ({x: (r() - 0.5) * 0.5, y: 1.0 + r() * 0.6, z: -0.16 + (r() - 0.5) * 0.06}));

/** Particles that rise from points of Marc's body (model units) and fade. */
const Rising: React.FC<{t: number; pts: Pt[]; amount: number; color: string; size: number; rise: number; opacity?: number; glow?: number}> = ({t, pts, amount, color, size, rise, opacity = 1, glow = 0}) => {
  if (amount <= 0.01) return null;
  return (
    <>
      {pts.map((p, i) => {
        const k = (t * p.sp * 0.5 + p.ph) % 1;
        const s = size * p.s * Math.sin(Math.PI * k) * amount * (1 + k);
        if (s < 0.003) return null;
        return (
          <mesh key={i} position={[p.x * (1 + k * 0.6), p.y + k * rise, p.z]}>
            <icosahedronGeometry args={[s, 1]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} transparent={opacity < 1} opacity={opacity * (1 - k * 0.6)} depthWrite={opacity >= 1} flatShading />
          </mesh>
        );
      })}
    </>
  );
};

/** Flickering flames on his tee-shirt. */
const Flames: React.FC<{t: number; amount: number}> = ({t, amount}) => {
  if (amount <= 0.01) return null;
  return (
    <>
      {TORSO_PTS.map((p, i) => {
        const k = (t * p.sp * 1.6 + p.ph) % 1;
        const h = 0.22 * p.s * amount * (1 - k) * (0.7 + 0.3 * Math.sin(t * 20 + i));
        if (h < 0.01) return null;
        const c = k < 0.3 ? '#fff0a0' : k < 0.6 ? '#ffb020' : '#ff5a10';
        return (
          <mesh key={i} position={[p.x, p.y + k * 0.35 + h / 2, p.z]}>
            <coneGeometry args={[h * 0.35, h, 5]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={2.2} />
          </mesh>
        );
      })}
    </>
  );
};

// ---------- Dust: Marc crumbles from the head down, then the sneeze blows the pile away ----------
const DUST_N = 2600;
const VOLUMES: {c: V3; s: V3}[] = [
  {c: [-0.13, 0.5, 0], s: [0.18, 0.86, 0.18]}, {c: [0.13, 0.5, 0], s: [0.18, 0.86, 0.18]},
  {c: [-0.13, 0.055, -0.055], s: [0.18, 0.11, 0.31]}, {c: [0.13, 0.055, -0.055], s: [0.18, 0.11, 0.31]},
  {c: [0, 1.28, 0], s: [0.49, 0.64, 0.29]}, {c: [0, 1.64, 0], s: [0.16, 0.18, 0.15]},
  {c: [0, 1.84, 0], s: [0.32, 0.4, 0.3]},
  {c: [-0.31, 1.23, 0], s: [0.14, 0.62, 0.14]}, {c: [0.31, 1.23, 0], s: [0.14, 0.62, 0.14]},
];
type Grain = {p: V3; land: V3; blow: V3; t0: number; dur: number; rot: V3; shade: number; size: number};
const GRAINS: Grain[] = (() => {
  const r = seeded(77);
  const weights = VOLUMES.map((v) => v.s[0] * v.s[1] * v.s[2]);
  const total = weights.reduce((a, b) => a + b, 0);
  const out: Grain[] = [];
  for (let i = 0; i < DUST_N; i++) {
    let u = r() * total;
    let vi = 0;
    while (u > weights[vi] && vi < VOLUMES.length - 1) u -= weights[vi++];
    const v = VOLUMES[vi];
    const local: V3 = [v.c[0] + (r() - 0.5) * v.s[0], v.c[1] + (r() - 0.5) * v.s[1], v.c[2] + (r() - 0.5) * v.s[2]];
    const p: V3 = [IN_GLASS[0] + local[0] * S, IN_GLASS[1] + local[1] * S, IN_GLASS[2] + local[2] * S];
    const R = 0.42;
    const rad = Math.sqrt(r()) * R;
    const a = r() * Math.PI * 2;
    const land: V3 = [IN_GLASS[0] + Math.cos(a) * rad, FLOOR + 0.02 + 0.3 * (1 - rad / R) * (0.35 + 0.65 * r()), IN_GLASS[2] + Math.sin(a) * rad * 0.8];
    const blow: V3 = [(r() - 0.5) * 2.4, 0.2 + r() * 1.5, -(0.4 + r() * 1.3)];
    out.push({p, land, blow, t0: CRUMBLE + ((MODEL_H - local[1]) / MODEL_H) * 2.4 + r() * 0.5, dur: 0.6 + r() * 0.5, rot: [r() * 6, r() * 6, r() * 6], shade: r(), size: 0.026 + r() * 0.022});
  }
  return out;
})();
const DUST_GEO = new THREE.BoxGeometry(1, 1, 1);
const CHAR = new THREE.Color('#1f1a17');
const ASH = [new THREE.Color('#5f5a55'), new THREE.Color('#8a847d'), new THREE.Color('#a9a39b'), new THREE.Color('#47423e')];

const Dust: React.FC<{t: number}> = ({t}) => {
  const mesh = useMemo(() => new THREE.InstancedMesh(DUST_GEO, new THREE.MeshStandardMaterial({roughness: 1, flatShading: true}), DUST_N), []);
  const o = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);
  const blowK = smooth(SNEEZE, SNEEZE + 1.4, t);
  GRAINS.forEach((g, i) => {
    const f = clamp01((t - g.t0) / g.dur);
    const fy = f * f; // falls, accelerating
    const fx = 1 - (1 - f) * (1 - f);
    let x = mix(g.p[0], g.land[0], fx);
    let y = mix(g.p[1], g.land[1], fy);
    let z = mix(g.p[2], g.land[2], fx);
    let s = g.size;
    if (blowK > 0) {
      // Blown out of the open oven, then settling slowly while the cloud thins.
      const drift = Math.max(0, t - SNEEZE - 1.4);
      x += g.blow[0] * blowK + Math.sin(t * 0.8 + i) * 0.05 * drift;
      y += g.blow[1] * blowK - Math.min(0.9, drift * 0.12) * g.blow[1] * 0.5;
      z += g.blow[2] * blowK;
      s *= 1 - 0.7 * blowK;
    }
    o.position.set(x, y, z);
    o.rotation.set(g.rot[0] + f * 3, g.rot[1], g.rot[2] + f * 2);
    o.scale.setScalar(s);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    c.copy(CHAR).lerp(ASH[Math.floor(g.shade * ASH.length)], f);
    mesh.setColorAt(i, c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ---------- Characters over time ----------
type MarcPose = {pos: V3; yaw: number; walk: number; right?: V3; left?: V3; cold: number; smile: number; burn: number};
const marcAt = (t: number): MarcPose => {
  const burn = smooth(FIRE, 45.5, t) * 0.55 + smooth(MINUTES[3], MINUTES[3] + 2, t) * 0.45;
  if (t < 5.8) return {pos: OUTSIDE, yaw: 0, walk: 0, cold: 0, smile: 1, burn};
  if (t < 7.3) {
    // Pushed backward into the oven, arms flailing.
    const k = smooth(5.8, 7.2, t);
    const pos: V3 = [0, FLOOR * smooth(6.6, 6.9, t), mix(OUTSIDE[2], IN_BACK[2], k)];
    const flap = Math.sin(t * 18) * 0.15;
    return {pos, yaw: 0, walk: 0.6, cold: 0.6, smile: 0, burn, right: [0.5, 1.6 + flap, -0.1], left: [-0.5, 1.6 - flap, -0.1]};
  }
  if (t < MINUTES[0]) {
    // Relaxed: it's just a warm bath. Hands on his hips.
    const smile = 1 - smooth(18.5, 20.5, t);
    return {pos: IN_BACK, yaw: Math.sin(t * 0.7) * 0.15, walk: 0, cold: 0, smile, burn, right: [0.36, 1.02, 0.05], left: [-0.36, 1.02, 0.05]};
  }
  // From minute 1: at the glass.
  const k = smooth(MINUTES[0], MINUTES[0] + 0.8, t);
  const pos = mixV(IN_BACK, IN_GLASS, k);
  if (t < FIRE) {
    const knock = KNOCKS.reduce((m, at) => Math.max(m, 1 - Math.min(1, Math.abs(t - at) / 0.12)), 0);
    return {pos, yaw: 0, walk: k > 0 && k < 1 ? 1 : 0, cold: 0.7, smile: 0, burn,
      right: [0.24, 1.62, -0.42 - 0.08 * knock], left: t > 27.2 ? [-0.24, 1.55, -0.46] : undefined};
  }
  if (t < MINUTES[3]) {
    // On fire: patting his chest.
    const pat = Math.sin(t * 14);
    return {pos, yaw: 0, walk: 0, cold: 0.9, smile: 0, burn, right: [0.12, 1.25 + 0.06 * pat, -0.22], left: [-0.12, 1.3 - 0.06 * pat, -0.22]};
  }
  // Charred, standing still, until he crumbles.
  return {pos, yaw: 0, walk: 0, cold: 0, smile: 0, burn};
};

type JulienPose = {pos: V3; yaw: number; pose: 'debout' | 'marche' | 'bras-leves'; phase: number; bend: number; dust: number};
const JULIEN_SIDE: V3 = [1.3, 0, 0.0];
const julienAt = (t: number): JulienPose => {
  const dust = smooth(SNEEZE + 0.1, SNEEZE + 1.0, t);
  if (t < 5.8) return {pos: [-0.75, 0, -1.0], yaw: -0.9, pose: 'debout', phase: 0, bend: 0, dust};
  if (t < 7.2) {
    const k = smooth(5.8, 7.0, t);
    return {pos: [mix(-0.75, 0.05, k), 0, mix(-1.0, -0.25, k)], yaw: mix(-0.9, Math.PI, smooth(5.8, 6.2, t)), pose: 'marche', phase: t * 8, bend: 0.25, dust};
  }
  if (t < 8.2) {
    const k = smooth(7.2, 8.1, t);
    return {pos: mixV([0.05, 0, -0.25], JULIEN_SIDE, k), yaw: mix(Math.PI, Math.PI / 2, k), pose: 'marche', phase: t * 8, bend: 0, dust};
  }
  if (t >= 27.4 && t < 31.2) return {pos: JULIEN_SIDE, yaw: Math.sin(t * 6) * 0.25, pose: 'bras-leves', phase: 0, bend: 0, dust};
  if (t >= DOOR_OPEN - 0.6 && t < 74.6) {
    // Opens the door, leans in to look, sneezes.
    const lean = smooth(DOOR_OPEN + 0.8, DOOR_OPEN + 1.6, t) * (1 - smooth(SNEEZE + 0.3, SNEEZE + 1.0, t));
    const jerk = Math.exp(-Math.pow((t - SNEEZE) / 0.12, 2));
    return {pos: [mix(JULIEN_SIDE[0], 0.95, lean), 0, mix(JULIEN_SIDE[2], -0.25, lean)], yaw: Math.PI / 2 + 0.5 * lean, pose: 'debout', phase: 0, bend: 0.25 * lean + 0.35 * jerk, dust};
  }
  return {pos: JULIEN_SIDE, yaw: t > 74.6 ? smooth(74.6, 75.2, t) * 0 : 0, pose: 'debout', phase: 0, bend: 0, dust};
};

/** Bowl of popcorn in Julien's hands, kernels flying to his mouth. */
const Popcorn: React.FC<{t: number}> = ({t}) => (
  <group position={[0, 0.9, -0.28]}>
    <mesh><cylinderGeometry args={[0.16, 0.1, 0.12, 12]} /><meshStandardMaterial color="#d8342c" /></mesh>
    {Array.from({length: 14}, (_, i) => (
      <mesh key={i} position={[Math.cos(i * 2.4) * 0.09, 0.07 + (i % 3) * 0.02, Math.sin(i * 2.4) * 0.09]}>
        <icosahedronGeometry args={[0.035, 0]} /><meshStandardMaterial color="#fff4d6" flatShading />
      </mesh>
    ))}
    {[0, 0.45, 0.9].map((off, i) => {
      const k = ((t + off) % 1.35) / 1.35;
      return (
        <mesh key={`f${i}`} position={[0, 0.08 + k * 0.62 + Math.sin(Math.PI * k) * 0.15, -0.02 + k * 0.12]}>
          <icosahedronGeometry args={[0.03, 0]} /><meshStandardMaterial color="#fff4d6" flatShading />
        </mesh>
      );
    })}
  </group>
);

// ---------- Camera ----------
const Rig: React.FC<{pos: THREE.Vector3; target: THREE.Vector3; fov: number; roll: number}> = ({pos, target, fov, roll}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
    camera.fov = fov;
    camera.near = 0.02;
    camera.far = 60;
    camera.lookAt(target);
    camera.rotateZ(roll);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

type View = {pos: THREE.Vector3; target: THREE.Vector3; fov: number; roll?: number};
type Shot = {from: number; view: (t: number, k: number) => View};
export const SHOTS: Shot[] = [
  // Hook: Marc and Julien in front of the giant oven.
  {from: 0, view: (t, k) => ({pos: V(mix(1.0, 0.8, k), 1.6, mix(-4.2, -3.8, k)), target: V(-0.3, 1.1, -0.6), fov: 50})},
  // Julien pushes him in and slams the door.
  {from: 5.0, view: (t, k) => ({pos: V(mix(2.4, 2.2, k), 1.55, mix(-3.0, -2.8, k)), target: V(0.35, 1.15, 0.3), fov: 50})},
  // 38 °C: a warm bath, through the glass.
  {from: 10.8, view: (t, k) => ({pos: V(0, 1.45, mix(-1.5, -1.15, k)), target: V(0, 1.2, 1.2), fov: 50})},
  // The dial: doubles every minute.
  {from: 16.4, view: (t, k) => ({pos: V(mix(0.3, 0.2, k), 2.72, mix(-0.35, -0.25, k)), target: V(DIAL[0] - 0.15, 2.76, DIAL[2]), fov: 50})},
  // Minute 1: knocking on the glass.
  {from: MINUTES[0], view: (t, k) => ({pos: V(mix(0.3, 0.2, k), 1.6, mix(-0.55, -0.45, k)), target: V(0, 1.5, 0.95), fov: 50})},
  // Julien waves.
  {from: 27.4, view: (t, k) => ({pos: V(mix(2.7, 2.5, k), 1.5, -2.3), target: V(0.85, 1.3, 0.3), fov: 50})},
  // Minute 2: steaming like a teapot.
  {from: MINUTES[1], view: (t, k) => ({pos: V(mix(-0.5, -0.35, k), 1.5, mix(-1.25, -1.05, k)), target: V(0, 1.35, 0.95), fov: 50})},
  // Minute 3: the tee-shirt catches fire.
  {from: MINUTES[2], view: (t, k) => ({pos: V(mix(0.4, 0.3, k), 1.35, mix(-1.05, -0.9, k)), target: V(0, 1.25, 0.95), fov: 50})},
  // Minute 4: charred, only his eyes blink.
  {from: MINUTES[3], view: (t, k) => ({pos: V(0, 1.66, mix(-0.4, -0.22, k)), target: V(0, 1.62, 0.95), fov: 50})},
  // Julien eats popcorn.
  {from: 53.4, view: (t, k) => ({pos: V(mix(1.75, 1.65, k), 1.55, mix(-1.9, -1.7, k)), target: V(1.15, 1.3, 0.1), fov: 50})},
  // Minute 5: he crumbles.
  {from: MINUTES[4], view: (t, k) => ({pos: V(0, mix(1.3, 1.1, k), mix(-1.65, -1.25, k)), target: V(0, 0.95, 0.95), fov: 50})},
  // A small pile of dust.
  {from: 64.2, view: (t, k) => ({pos: V(0.1, 0.9, mix(-0.4, -0.3, k)), target: V(0, 0.25, 0.95), fov: 50})},
  // Julien opens the door... and sneezes.
  {from: 69.4, view: (t, k) => ({pos: V(mix(2.0, 1.8, k), 1.5, mix(-3.0, -2.7, k)), target: V(0.5, 1.0, 0.3), fov: 50})},
  // Dusty Julien.
  {from: 75.0, view: (t, k) => ({pos: V(1.15, 1.6, mix(-1.15, -0.95, k)), target: V(1.3, 1.5, 0.0), fov: 50})},
];
export const CUTS = SHOTS.slice(1).map((s) => s.from);

const shotAt = (t: number): View => {
  let i = SHOTS.length - 1;
  while (i > 0 && t < SHOTS[i].from) i--;
  const end = i + 1 < SHOTS.length ? SHOTS[i + 1].from : DURATION;
  return SHOTS[i].view(t, smooth(SHOTS[i].from, end, t));
};

// ---------- Scene ----------
export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const view = shotAt(t);
  const heat = heatAt(t);
  const door = t < DOOR_CLOSE ? 1 - smooth(7.4, DOOR_CLOSE, t) : smooth(DOOR_OPEN, DOOR_OPEN + 1.2, t);
  const m = marcAt(t);
  const j = julienAt(t);
  const sweat = smooth(MINUTES[0] + 0.5, MINUTES[0] + 1.5, t) * (1 - smooth(MINUTES[1], MINUTES[1] + 1, t));
  const steam = smooth(MINUTES[1], MINUTES[1] + 0.8, t) * (1 - smooth(FIRE, FIRE + 1, t));
  const flames = smooth(FIRE, FIRE + 0.3, t) * (1 - smooth(44.6, 45.6, t));
  const smoke = smooth(FIRE + 0.5, FIRE + 1.5, t) * (t < CRUMBLE + 2 ? 1 : 1 - smooth(CRUMBLE + 2, CRUMBLE + 4, t));
  const embers = smooth(MINUTES[3], MINUTES[3] + 1, t) * (1 - smooth(CRUMBLE + 3, CRUMBLE + 4, t));
  const dusty = (c: string) => new THREE.Color(c).lerp(new THREE.Color('#8f8a84'), j.dust * 0.8).getStyle();

  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} roll={view.roll ?? 0} />
      <color attach="background" args={['#202228']} />
      <hemisphereLight color="#fbf6ee" groundColor="#8f887c" intensity={1.0} />
      <directionalLight color="#fff4e2" intensity={1.6} position={[3, 5, -4]} />
      <directionalLight color="#cfe0ff" intensity={0.4} position={[-4, 3, -5]} />
      {/* The oven glows into the kitchen as it heats */}
      <pointLight position={[0, 1.4, -0.4]} intensity={2.2 * heat} distance={5} decay={1.6} color="#ff8a3a" />
      <Kitchen t={t} heat={heat} />
      <Oven t={t} heat={heat} door={door} />
      {t < CRUMBLE && (
        <group position={m.pos} rotation={[0, m.yaw, 0]}>
          <group scale={S}>
            <Marc t={t} walk={m.walk} cold={m.cold} smile={m.smile} burn={m.burn} rightHand={m.right} leftHand={m.left} />
            <Rising t={t} pts={BODY_PTS} amount={sweat} color="#8fd0ff" size={0.022} rise={-0.9} glow={0.4} />
            <Rising t={t} pts={BODY_PTS} amount={steam} color="#f4f4f4" size={0.07} rise={1.1} opacity={0.55} />
            <Flames t={t} amount={flames} />
            <Rising t={t} pts={HEAD_PTS} amount={smoke} color="#4a4644" size={0.08} rise={1.0} opacity={0.6} />
            <Rising t={t} pts={BODY_PTS} amount={embers} color="#ff7a20" size={0.014} rise={1.3} glow={2.5} />
          </group>
        </group>
      )}
      {t >= CRUMBLE && <Dust t={t} />}
      <group position={j.pos} rotation={[0, j.yaw, 0]}>
        <Person shirt={dusty('#3a6fb0')} pants={dusty('#2f343c')} skin={dusty('#d9a27c')} hair={dusty('#1e1712')} pose={j.pose} phase={j.phase} bend={j.bend} />
        {t >= 53.0 && t < 57.4 && <Popcorn t={t} />}
      </group>
    </>
  );
};
