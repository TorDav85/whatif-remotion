import React, {useLayoutEffect} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Block, Cyl, seeded} from '../../assets/kit';
import {Fridge, KitchenCounter, UpperCabinet, InteriorWindow, WallClock, PottedPlant} from '../../assets/interior';
import {Person} from '../../assets/Person';
import {Marc} from '../../shared/characters/Marc';
import {cutsOf, shotAt as shotAtOf, type Shot as ShotOf} from '../../shared/three/shots';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

// ---------- Story clock (s). Mirrored in scripts/audio/marc-congel.py ----------
export const DOOR_CLOSE = 8.0;
/** Each 40 degree drop (minutes 1 to 5). */
export const MINUTES = [21.0, 32.0, 39.0, 46.4, 57.6];
export const SIP = 28.6;
export const SELFIE = 55.6;
/** The ice block grows around him. */
export const ICE: [number, number] = [55.0, 62.0];
export const DOOR_OPEN = 69.8;
export const DRYER: [number, number] = [71.0, 75.8];
export const SNEEZE = 76.4;
export const DURATION = 85;
export const T0 = 4;
export const STEP = 40;

/** Minutes elapsed, continuous (each drop eases in over 1.2 s). */
export const minuteAt = (t: number) => MINUTES.reduce((n, at) => n + smooth(at, at + 1.2, t), 0);
export const tempAt = (t: number) => (t < 9 ? 20 - 16 * smooth(8.0, 9.0, t) : T0 - STEP * minuteAt(t));
/** 0 at 4 °C, 1 at -196 °C, back to 0 once the door is open. */
export const coldAt = (t: number) => clamp01(minuteAt(t) / 5) * (1 - smooth(DOOR_OPEN, DRYER[1], t));
/** How white with frost Marc is. */
const frostAt = (t: number) =>
  (0.25 * smooth(MINUTES[1] + 1, MINUTES[1] + 6, t) + 0.6 * smooth(MINUTES[2], MINUTES[2] + 6, t) + 0.15 * smooth(MINUTES[3], MINUTES[3] + 2, t))
  * (1 - smooth(DRYER[0] + 2.5, DRYER[1], t));
/** Ice block around Marc: 0 none, 1 full height. */
const iceAt = (t: number) => smooth(ICE[0], ICE[1], t) * (1 - smooth(DRYER[0], DRYER[1] - 0.3, t));

const MODEL_H = 2.06;
const S = 1.8 / MODEL_H;

// ---------- Freezer geometry (metres). Front (door) at z = 0.5, facing -z ----------
const OW = 1.7;
const OH = 2.6;
const FRONT = 0.5;
const BACK = 2.0;
const FLOOR = 0.12;
const IN_BACK: V3 = [0, FLOOR, 1.25];
const IN_GLASS: V3 = [0, FLOOR, 0.95];
const OUTSIDE: V3 = [0, 0, -0.5];
const DIAL: V3 = [0.45, 2.78, FRONT - 0.04];

const SHELL = '#eef2f5';
const LINER = '#cfe2ef';

const Freezer: React.FC<{t: number; cold: number; door: number}> = ({t, cold, door}) => {
  const cz = (FRONT + BACK) / 2;
  const depth = BACK - FRONT;
  const coil = new THREE.Color('#9fb8c8').lerp(new THREE.Color('#ffffff'), cold).getStyle();
  return (
    <group>
      {/* Shell */}
      <Block p={[-OW / 2 + 0.06, OH / 2, cz]} s={[0.12, OH, depth]} c={SHELL} />
      <Block p={[OW / 2 - 0.06, OH / 2, cz]} s={[0.12, OH, depth]} c={SHELL} />
      <Block p={[0, OH - 0.06, cz]} s={[OW, 0.12, depth]} c={SHELL} />
      <Block p={[0, FLOOR / 2, cz]} s={[OW, FLOOR, depth]} c={SHELL} />
      <Block p={[0, OH / 2, BACK - 0.06]} s={[OW, OH, 0.12]} c={SHELL} />
      {/* Liner, frosting over */}
      {[[-1, 0], [1, 0]].map(([s]) => (
        <Block key={s} p={[s * (OW / 2 - 0.125), OH / 2, cz]} s={[0.01, OH - 0.24, depth - 0.1]} c={new THREE.Color(LINER).lerp(new THREE.Color('#f8fcff'), cold).getStyle()} />
      ))}
      <Block p={[0, OH / 2, BACK - 0.125]} s={[OW - 0.24, OH - 0.24, 0.01]} c={new THREE.Color(LINER).lerp(new THREE.Color('#f8fcff'), cold).getStyle()} />
      <Block p={[0, OH - 0.125, cz]} s={[OW - 0.24, 0.01, depth - 0.1]} c="#e3eef6" />
      <Block p={[0, FLOOR + 0.005, cz]} s={[OW - 0.24, 0.01, depth - 0.1]} c={new THREE.Color('#b8ccd9').lerp(new THREE.Color('#f4f9fd'), cold).getStyle()} />
      {/* Wire shelves on the side walls */}
      {[0.8, 1.4, 2.0].flatMap((y) => [-1, 1].map((s) => <Block key={`${y}${s}`} p={[s * (OW / 2 - 0.15), y, cz]} s={[0.03, 0.03, depth - 0.2]} c="#a9b4bd" metal />))}
      {/* Evaporator coils on the back wall */}
      {[0.6, 1.0, 1.4, 1.8, 2.2].map((y) => (
        <Cyl key={y} p={[0, y, BACK - 0.16]} rad={0.025} h={OW - 0.4} r={[0, 0, Math.PI / 2]} c={coil} metal />
      ))}
      {/* Fan */}
      <group position={[0, OH - 0.45, BACK - 0.14]} rotation={[0, 0, t * 14]}>
        {[0, 1, 2].map((i) => <Block key={i} p={[0, 0, 0]} s={[0.36, 0.06, 0.01]} r={[0, 0, (i * Math.PI) / 3]} c="#7d8a94" />)}
      </group>
      <pointLight position={[0, OH - 0.45, cz]} intensity={1.6 + 1.2 * cold} distance={4.5} decay={1.5} color="#cfe8ff" />
      <pointLight position={[0, 0.5, cz - 0.3]} intensity={0.8} distance={3} decay={1.5} color="#bfe0ff" />
      {/* Control panel: a blue display and the dial */}
      <Block p={[0, OH + 0.18, FRONT + 0.12]} s={[OW, 0.36, 0.28]} c="#2e3238" />
      <group position={DIAL}>
        <Cyl p={[0, 0, 0]} rad={0.11} h={0.05} r={[Math.PI / 2, 0, 0]} c="#d8dce0" metal />
        <group rotation={[0, 0, cold * Math.PI * 1.5 - 0.75 * Math.PI]}>
          <Block p={[0, 0.06, -0.03]} s={[0.02, 0.09, 0.02]} c="#2a7ad8" />
        </group>
      </group>
      <Block p={[-0.35, 2.78, FRONT - 0.03]} s={[0.5, 0.16, 0.02]} c="#06101a" e="#3aa0ff" ei={0.7} />
      {/* Door, hinged on the left edge, swings toward the camera; its glass frosts over */}
      <group position={[-OW / 2, 0, FRONT]} rotation={[0, door * 1.75, 0]}>
        <group position={[OW / 2, 0, -0.04]}>
          <Block p={[0, 0.17, 0]} s={[OW, 0.14, 0.08]} c={SHELL} />
          <Block p={[0, OH - 0.13, 0]} s={[OW, 0.26, 0.08]} c={SHELL} />
          {[-1, 1].map((s) => <Block key={s} p={[s * (OW / 2 - 0.12), OH / 2, 0]} s={[0.24, OH, 0.08]} c={SHELL} />)}
          <mesh position={[0, (0.24 + OH - 0.26) / 2, 0]}>
            <boxGeometry args={[OW - 0.48, OH - 0.5, 0.02]} />
            <meshStandardMaterial color="#eaf6ff" transparent opacity={0.1 + 0.22 * cold} roughness={0.3} depthWrite={false} />
          </mesh>
          {/* Frost creeping in from the edges of the glass */}
          {cold > 0.05 && [-1, 1].flatMap((s) => [
            <Block key={`v${s}`} p={[s * (OW / 2 - 0.24 - 0.09 * cold), OH / 2, -0.015]} s={[0.18 * cold, OH - 0.5, 0.005]} c="#f4fbff" o={0.55} />,
            <Block key={`h${s}`} p={[0, s > 0 ? OH - 0.26 - 0.08 * cold : 0.24 + 0.08 * cold, -0.015]} s={[OW - 0.48, 0.16 * cold, 0.005]} c="#f4fbff" o={0.55} />,
          ])}
          <Cyl p={[OW / 2 - 0.12, 1.35, -0.09]} rad={0.025} h={0.9} c="#3a3f47" metal />
        </group>
      </group>
    </group>
  );
};

const Kitchen: React.FC<{t: number; cold: number}> = ({t, cold}) => {
  const wall = new THREE.Color('#e6e1d6').lerp(new THREE.Color('#d6e6f2'), cold * 0.5).getStyle();
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
      <group position={[2.1, 0.85, 2.18]}><InteriorWindow curtain="#c8463a" light={0.5} /></group>
      <group position={[1.15, 2.2, 2.18]}><WallClock time={10 + minuteAt(t) / 60} /></group>
      <group position={[2.9, 0, 1.4]}><PottedPlant size={1.1} /></group>
    </group>
  );
};

// ---------- Effects ----------
type Pt = {x: number; y: number; z: number; ph: number; sp: number; s: number};
const points = (seed: number, n: number, f: (r: () => number) => Omit<Pt, 'ph' | 'sp' | 's'>) => {
  const r = seeded(seed);
  return Array.from({length: n}, () => ({...f(r), ph: r(), sp: 0.6 + r() * 0.8, s: 0.6 + r() * 0.8}));
};
const MOUTH_PTS = points(5, 10, (r) => ({x: (r() - 0.5) * 0.06, y: 1.74, z: -0.22 - r() * 0.05}));
const HAIR_PTS = points(9, 9, (r) => ({x: (r() - 0.5) * 0.3, y: 1.93, z: -0.14 + r() * 0.26}));

/** Breath clouds puffing out of his mouth and drifting forward. */
const Breath: React.FC<{t: number; amount: number}> = ({t, amount}) => {
  if (amount <= 0.01) return null;
  return (
    <>
      {MOUTH_PTS.map((p, i) => {
        const k = (t * 0.7 + p.ph) % 1;
        const s = 0.05 * p.s * amount * (0.3 + k) * Math.sin(Math.PI * Math.min(1, k * 1.3));
        if (s < 0.004) return null;
        return (
          <mesh key={i} position={[p.x + (p.ph - 0.5) * 0.2 * k, p.y + k * 0.15, p.z - k * 0.35]}>
            <icosahedronGeometry args={[s, 1]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.5 * (1 - k)} depthWrite={false} flatShading />
          </mesh>
        );
      })}
    </>
  );
};

/** Snow falling inside the freezer (world space). */
const FLAKES = (() => {
  const r = seeded(21);
  return Array.from({length: 90}, () => ({x: (r() - 0.5) * (OW - 0.3), z: FRONT + 0.15 + r() * (BACK - FRONT - 0.3), ph: r(), sp: 0.15 + r() * 0.2, s: 0.008 + r() * 0.01}));
})();
const Snow: React.FC<{t: number; amount: number}> = ({t, amount}) => {
  if (amount <= 0.01) return null;
  return (
    <>
      {FLAKES.map((f, i) => {
        if (i / FLAKES.length > amount) return null;
        const k = (t * f.sp + f.ph) % 1;
        return (
          <mesh key={i} position={[f.x + Math.sin(t * 1.3 + i) * 0.04, OH - 0.2 - k * (OH - 0.35), f.z]}>
            <octahedronGeometry args={[f.s, 0]} />
            <meshStandardMaterial color="#ffffff" emissive="#dff0ff" emissiveIntensity={0.6} />
          </mesh>
        );
      })}
    </>
  );
};

/** The icicle hanging from his nose, and little ones in his hair (model units, head space). */
const Icicles: React.FC<{nose: number; hair: number}> = ({nose, hair}) => (
  <>
    {nose > 0.01 && (
      <mesh position={[0.0, 1.79 - 0.06 * nose, -0.19]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.018, 0.12 * nose, 6]} />
        <meshStandardMaterial color="#d9f1ff" transparent opacity={0.85} roughness={0.1} emissive="#9fd4ff" emissiveIntensity={0.3} />
      </mesh>
    )}
    {hair > 0.01 && HAIR_PTS.map((p, i) => (
      <mesh key={i} position={[p.x, p.y + 0.03 * hair * p.s, p.z]}>
        <coneGeometry args={[0.012, 0.07 * hair * p.s, 5]} />
        <meshStandardMaterial color="#eaf7ff" roughness={0.2} />
      </mesh>
    ))}
  </>
);

/** Translucent ice block that grows from the floor up, then melts into a puddle. */
const IceBlock: React.FC<{grow: number; puddle: number}> = ({grow, puddle}) => (
  <group position={[IN_GLASS[0], FLOOR, IN_GLASS[2] - 0.02]}>
    {grow > 0.01 && (
      <mesh position={[0, (2.0 * grow) / 2, 0]}>
        <boxGeometry args={[0.8, 2.0 * grow, 0.62]} />
        <meshStandardMaterial color="#9fd4f5" transparent opacity={0.38} roughness={0.08} metalness={0.1} emissive="#5fa8d8" emissiveIntensity={0.15} depthWrite={false} />
      </mesh>
    )}
    {puddle > 0.01 && (
      <mesh position={[0, 0.012, -0.1]}>
        <cylinderGeometry args={[0.65 * puddle, 0.65 * puddle, 0.01, 28]} />
        <meshStandardMaterial color="#8fcaf0" transparent opacity={0.7} roughness={0.05} />
      </mesh>
    )}
  </group>
);

// ---------- Characters over time ----------
type MarcPose = {pos: V3; tilt: number; walk: number; right?: V3; left?: V3; cold: number; smile: number; frost: number};
/** Arms crossed, rubbing his upper arms. */
const hug = (t: number, rub: number): {right: V3; left: V3} => ({
  right: [-0.2, 1.3 + 0.05 * rub * Math.sin(t * 9), -0.17],
  left: [0.2, 1.3 - 0.05 * rub * Math.sin(t * 9), -0.17],
});
const marcAt = (t: number): MarcPose => {
  const frost = frostAt(t);
  if (t < 5.8) return {pos: OUTSIDE, tilt: 0, walk: 0, cold: 0, smile: 1, frost};
  if (t < 7.3) {
    const k = smooth(5.8, 7.2, t);
    const pos: V3 = [0, FLOOR * smooth(6.6, 6.9, t), mix(OUTSIDE[2], IN_BACK[2], k)];
    const flap = Math.sin(t * 18) * 0.15;
    return {pos, tilt: 0, walk: 0.6, cold: 0.6, smile: 0, frost, right: [0.5, 1.6 + flap, -0.1], left: [-0.5, 1.6 - flap, -0.1]};
  }
  if (t < MINUTES[0]) return {pos: IN_BACK, tilt: 0, walk: 0, cold: 0.25, smile: 0.6 - smooth(16, 20, t) * 0.6, frost, ...hug(t, 1)};
  const k = smooth(MINUTES[0], MINUTES[0] + 0.8, t);
  const pos = mixV(IN_BACK, IN_GLASS, k);
  if (t < MINUTES[3]) {
    // Shivering harder and harder, then frozen stiff.
    const shiver = 1 - smooth(MINUTES[2] + 2, MINUTES[3], t);
    return {pos, tilt: 0, walk: k > 0 && k < 1 ? 1 : 0, cold: 1.3 * shiver, smile: 0, frost, ...hug(t, shiver)};
  }
  if (t < DRYER[1]) return {pos, tilt: 0, walk: 0, cold: 0, smile: 0, frost, ...hug(t, 0)};
  // Thawed: shivering, a big sneeze.
  const jerk = Math.exp(-Math.pow((t - SNEEZE) / 0.12, 2)) - 0.4 * Math.exp(-Math.pow((t - SNEEZE + 0.6) / 0.3, 2));
  return {pos, tilt: 0.35 * jerk, walk: 0, cold: 1.0, smile: 0, frost, ...hug(t, 1)};
};

type JulienPose = {pos: V3; yaw: number; pose: 'debout' | 'marche' | 'bras-leves'; phase: number; bend: number};
const JULIEN_SIDE: V3 = [1.3, 0, 0.0];
const julienAt = (t: number): JulienPose => {
  if (t < 5.8) return {pos: [-0.75, 0, -1.0], yaw: -0.9, pose: 'debout', phase: 0, bend: 0};
  if (t < 7.2) {
    const k = smooth(5.8, 7.0, t);
    return {pos: [mix(-0.75, 0.05, k), 0, mix(-1.0, -0.25, k)], yaw: mix(-0.9, Math.PI, smooth(5.8, 6.2, t)), pose: 'marche', phase: t * 8, bend: 0.25};
  }
  if (t < 8.2) {
    const k = smooth(7.2, 8.1, t);
    return {pos: mixV([0.05, 0, -0.25], JULIEN_SIDE, k), yaw: mix(Math.PI, Math.PI / 2, k), pose: 'marche', phase: t * 8, bend: 0};
  }
  if (t >= DOOR_OPEN - 0.6) {
    // Opens the door, then aims the hair dryer at the ice block.
    const k = smooth(DOOR_OPEN + 0.4, DRYER[0], t);
    return {pos: mixV(JULIEN_SIDE, [0.95, 0, -0.15], k), yaw: Math.PI / 2 + 0.45 * k, pose: 'debout', phase: 0, bend: 0.1 * k};
  }
  return {pos: JULIEN_SIDE, yaw: 0, pose: 'debout', phase: 0, bend: 0};
};

/** Hot chocolate mug, steaming, raised to his mouth for a sip. */
const Mug: React.FC<{t: number}> = ({t}) => {
  const sip = smooth(SIP - 0.4, SIP, t) * (1 - smooth(SIP + 0.8, SIP + 1.2, t));
  return (
    <group position={[0.06, mix(0.95, 1.6, sip), mix(-0.3, -0.2, sip)]} rotation={[-0.9 * sip, 0, 0]}>
      <mesh><cylinderGeometry args={[0.055, 0.05, 0.12, 14]} /><meshStandardMaterial color="#c8463a" /></mesh>
      <mesh position={[0, 0.055, 0]}><cylinderGeometry args={[0.048, 0.048, 0.01, 14]} /><meshStandardMaterial color="#5a3420" /></mesh>
      {[0, 0.33, 0.66].map((off, i) => {
        const k = (t * 0.6 + off) % 1;
        return (
          <mesh key={i} position={[Math.sin(t * 2 + i) * 0.02, 0.09 + k * 0.25, 0]}>
            <icosahedronGeometry args={[0.025 * (0.5 + k), 1]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.45 * (1 - k)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Phone held up for the selfie, with a flash. */
const Phone: React.FC<{t: number}> = ({t}) => {
  const flash = Math.max(0, 1 - Math.abs(t - SELFIE) / 0.12);
  return (
    <group position={[0.3, 1.75, -0.5]} rotation={[0.1, -0.5, 0]}>
      <Block p={[0, 0, 0]} s={[0.08, 0.16, 0.012]} c="#1d1d1f" />
      <Block p={[0, 0, 0.007]} s={[0.07, 0.14, 0.002]} c="#5a9ad6" e="#5a9ad6" ei={0.8} />
      {flash > 0 && <pointLight position={[0, 0.05, 0.1]} intensity={3 * flash} distance={3} color="#ffffff" />}
    </group>
  );
};

/** Hair dryer pointed forward (-z), blowing warm air. */
const Dryer: React.FC<{t: number; on: number}> = ({t, on}) => (
  <group position={[0.05, 1.15, -0.32]}>
    <Cyl p={[0, 0, -0.08]} rad={0.05} h={0.2} r={[Math.PI / 2, 0, 0]} c="#e05a8a" />
    <Block p={[0, -0.1, -0.02]} s={[0.05, 0.16, 0.05]} c="#e05a8a" />
    {on > 0.01 && Array.from({length: 10}, (_, i) => {
      const k = (t * 1.8 + i / 10) % 1;
      return (
        <mesh key={i} position={[Math.sin(i * 2.1 + t * 5) * 0.06 * k, Math.cos(i * 1.7) * 0.05 * k, -0.2 - k * 0.7]}>
          <icosahedronGeometry args={[0.02 + 0.03 * k, 0]} />
          <meshStandardMaterial color="#ffb070" emissive="#ff8a3a" emissiveIntensity={0.8} transparent opacity={0.5 * on * (1 - k)} depthWrite={false} />
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
type Shot = ShotOf<View>;
export const SHOTS: Shot[] = [
  // Hook: Marc and Julien in front of the giant freezer.
  {from: 0, view: (t, k) => ({pos: V(mix(1.0, 0.8, k), 1.6, mix(-4.2, -3.8, k)), target: V(-0.3, 1.1, -0.6), fov: 50})},
  // Julien pushes him in and slams the door.
  {from: 5.0, view: (t, k) => ({pos: V(mix(2.4, 2.2, k), 1.55, mix(-3.0, -2.8, k)), target: V(0.35, 1.15, 0.3), fov: 50})},
  // 4 °C: rubbing his arms, through the glass.
  {from: 10.8, view: (t, k) => ({pos: V(0, 1.45, mix(-1.5, -1.15, k)), target: V(0, 1.2, 1.2), fov: 50})},
  // The dial: 40 degrees less every minute.
  {from: 16.4, view: (t, k) => ({pos: V(mix(0.3, 0.2, k), 2.72, mix(-0.35, -0.25, k)), target: V(DIAL[0] - 0.15, 2.76, DIAL[2]), fov: 50})},
  // Minute 1: shivering at the glass, breath freezing.
  {from: MINUTES[0], view: (t, k) => ({pos: V(mix(0.3, 0.2, k), 1.62, mix(-0.6, -0.5, k)), target: V(0, 1.5, 0.95), fov: 50})},
  // Julien sips his hot chocolate.
  {from: 27.4, view: (t, k) => ({pos: V(mix(1.75, 1.65, k), 1.55, mix(-1.9, -1.7, k)), target: V(1.15, 1.35, 0.1), fov: 50})},
  // Minute 2: frozen hair, an icicle on his nose.
  {from: MINUTES[1], view: (t, k) => ({pos: V(mix(-0.35, -0.25, k), 1.68, mix(-0.75, -0.6, k)), target: V(0, 1.6, 0.95), fov: 50})},
  // Minute 3: white with frost.
  {from: MINUTES[2], view: (t, k) => ({pos: V(mix(0.4, 0.3, k), 1.35, mix(-1.15, -1.0, k)), target: V(0, 1.2, 0.95), fov: 50})},
  // Minute 4: frozen stiff, only his eyes blink.
  {from: MINUTES[3], view: (t, k) => ({pos: V(0, 1.66, mix(-0.4, -0.22, k)), target: V(0, 1.62, 0.95), fov: 50})},
  // Julien takes a selfie.
  {from: 53.4, view: (t, k) => ({pos: V(mix(1.75, 1.65, k), 1.6, mix(-1.9, -1.7, k)), target: V(1.1, 1.45, 0.1), fov: 50})},
  // Minute 5: the ice block closes over him.
  {from: MINUTES[4], view: (t, k) => ({pos: V(0, mix(1.35, 1.2, k), mix(-1.7, -1.3, k)), target: V(0, 1.0, 0.95), fov: 50})},
  // A giant ice cube.
  {from: 64.2, view: (t, k) => {
    const a = mix(-0.35, 0.35, k);
    return {pos: V(Math.sin(a) * 1.9, 1.25, 0.95 - Math.cos(a) * 1.9), target: V(0, 1.0, 0.95), fov: 50};
  }},
  // Julien opens the door and thaws him with the hair dryer.
  {from: 69.4, view: (t, k) => ({pos: V(mix(2.0, 1.75, k), 1.5, mix(-3.0, -2.6, k)), target: V(0.45, 1.05, 0.4), fov: 50})},
  // Thawed, shivering... and sneezing.
  {from: 75.2, view: (t, k) => ({pos: V(mix(1.0, 0.85, k), 1.55, mix(-2.7, -2.4, k)), target: V(0.4, 1.25, 0.5), fov: 50})},
];
export const CUTS = cutsOf(SHOTS);

const shotAt = (t: number): View => shotAtOf(SHOTS, t, DURATION);

// ---------- Scene ----------
export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const view = shotAt(t);
  const cold = coldAt(t);
  const door = t < DOOR_CLOSE ? 1 - smooth(7.4, DOOR_CLOSE, t) : smooth(DOOR_OPEN, DOOR_OPEN + 1.2, t);
  const m = marcAt(t);
  const j = julienAt(t);
  const breath = smooth(MINUTES[0], MINUTES[0] + 1, t) * (1 - smooth(MINUTES[3], MINUTES[3] + 1, t)) + 0.6 * smooth(DRYER[1], DRYER[1] + 0.5, t);
  const snow = smooth(MINUTES[0], MINUTES[2], t) * (1 - smooth(DOOR_OPEN, DOOR_OPEN + 1, t));
  const nose = smooth(MINUTES[1] + 2, MINUTES[1] + 5, t) * (1 - smooth(DRYER[0] + 1, DRYER[0] + 3, t));
  const hair = smooth(MINUTES[1] + 0.5, MINUTES[1] + 3, t) * (1 - smooth(DRYER[0] + 1, DRYER[0] + 3, t));
  const dryerOn = smooth(DRYER[0], DRYER[0] + 0.2, t) * (1 - smooth(DRYER[1], DRYER[1] + 0.2, t));
  const puddle = smooth(DRYER[0] + 0.5, DRYER[1] + 0.5, t);

  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} roll={view.roll ?? 0} />
      <color attach="background" args={['#202228']} />
      <hemisphereLight color={new THREE.Color('#fbf6ee').lerp(new THREE.Color('#dceaff'), cold).getStyle()} groundColor="#8f887c" intensity={1.0} />
      <directionalLight color="#fff4e2" intensity={1.6} position={[3, 5, -4]} />
      <directionalLight color="#cfe0ff" intensity={0.4 + 0.5 * cold} position={[-4, 3, -5]} />
      <Kitchen t={t} cold={cold} />
      <Freezer t={t} cold={cold} door={door} />
      <Snow t={t} amount={snow} />
      <group position={m.pos} rotation={[m.tilt, 0, 0]}>
        <group scale={S}>
          <Marc t={t} walk={m.walk} cold={m.cold} smile={m.smile} frost={m.frost} rightHand={m.right} leftHand={m.left} />
          <Breath t={t} amount={breath} />
          <Icicles nose={nose} hair={hair} />
        </group>
      </group>
      <IceBlock grow={iceAt(t)} puddle={puddle} />
      <group position={j.pos} rotation={[0, j.yaw, 0]}>
        <Person shirt="#3a6fb0" pants="#2f343c" skin="#d9a27c" hair="#1e1712" pose={j.pose} phase={j.phase} bend={j.bend} />
        {t >= 27.2 && t < 31.6 && <Mug t={t} />}
        {t >= 53.2 && t < 57.2 && <Phone t={t} />}
        {t >= DRYER[0] - 0.6 && <Dryer t={t} on={dryerOn} />}
      </group>
    </>
  );
};
