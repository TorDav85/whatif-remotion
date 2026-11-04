import React, {useLayoutEffect, useRef} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Block, Cyl, Ball, seeded} from '../../assets/kit';
import {Person} from '../../assets/Person';
import {CityBase} from '../../assets/city/CityBase';
import {DiningChair, DiningTable, Fridge, KitchenCounter, UpperCabinet, InteriorWindow, WallClock, PottedPlant} from '../../assets/interior';
import {Marc} from '../../shared/characters/Marc';
import {cutsOf, shotAt as shotAtOf, type Shot as ShotOf} from '../../shared/three/shots';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
/** Yaw that turns a model facing -z toward `to`. */
const faceYaw = (from: V3, to: V3) => Math.atan2(-(to[0] - from[0]), -(to[2] - from[2]));

// ---------- Story clock (s). Mirrored in scripts/audio/marc-invisible.py ----------
/** Hook (flash-forward): Marc fades out, the mug stays. */
export const HOOK_FADE: [number, number] = [0.8, 3.0];
export const MORNING = 4.8;
export const HANDS = 6.6;
export const ARMS = 8.0;
export const BODY = 9.4;
export const JULIEN_IN = 11.0;
export const SHOCK = 12.6;
export const SIP = 13.4;
export const EYE = 15.8;
export const EYE_MARC = 19.4;
export const POV = 23.4;
/** His sight goes dark (black overlay). */
export const DARK: [number, number] = [24.0, 25.2];
export const BLIND_WIDE = 25.8;
export const CHAIR = 26.8;
export const STREET = 29.0;
export const BIKE = 33.2;
export const HEAT = 35.8;
export const WATTS = 39.4;
export const CCTV = 43.0;
export const CCTV_POV = 45.0;
export const LOCK = 45.8;
export const LUNCH = 49.2;
export const LIFT = 50.4;
export const BITES = [51.4, 52.2, 53.0];
export const DIGEST = 56.4;
/** Time-lapse of the digestion, 12 h → 15 h. */
export const HOURS: [number, number] = [56.8, 61.8];
export const PUNCH = 62.6;
export const PUNCH_HEAT = 65.8;
export const END = 69.6;
export const DURATION = 75;

export type World = 'kitchen' | 'eye' | 'street';
export const worldAt = (t: number): World =>
  t < EYE ? 'kitchen' : t < POV ? 'eye' : t < STREET ? 'kitchen' : t < LUNCH ? 'street' : t < PUNCH ? 'kitchen' : 'street';
/** Shots seen through a thermal camera. */
export const isThermal = (t: number) => (t >= HEAT && t < CCTV) || (t >= CCTV_POV && t < LUNCH) || t >= PUNCH_HEAT;
/** 0..1 black overlay while Marc's sight goes. */
export const blindDark = (t: number) => (t >= POV && t < BLIND_WIDE ? smooth(DARK[0], DARK[1], t) : 0);
/** Fade cuts (real changes of place or time). */
export const DIPS = [MORNING, EYE, POV, STREET, LUNCH, PUNCH];

/** 0 = fully visible, 1.15 = fully gone. Hands first, then arms, then the rest. */
export const vanishAt = (t: number) =>
  t < MORNING ? 1.15 * smooth(HOOK_FADE[0], HOOK_FADE[1], t) : 0.2 * smooth(6.4, 7.2, t) + 0.3 * smooth(7.8, 8.6, t) + 0.65 * smooth(9.0, 10.4, t);
/** Share of Marc still visible, for the HUD. */
export const visiblePct = (t: number) => Math.round(100 * (1 - clamp01(vanishAt(t) / 1.15)));
/** Digestion progress 0..1. */
export const digestAt = (t: number) => smooth(HOURS[0], HOURS[1], t);

const MODEL_H = 2.06;
const S = 1.8 / MODEL_H;

// ---------- Invisibility ----------
const WHITE = new THREE.Color('#ffffff');
type Base = {color: THREE.Color; emissive: THREE.Color; ei: number};
/**
 * Fades every mesh of its children, nearest to the hands first (distance in the group's units).
 * `heat` > 0 shows the body as a thermal camera would: fully there and glowing.
 */
const Ghost: React.FC<{p: number; heat?: number; hands?: V3[]; children: React.ReactNode}> = ({p, heat = 0, hands = [], children}) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    g.updateWorldMatrix(true, true);
    const inv = g.matrixWorld.clone().invert();
    const v = new THREE.Vector3();
    const hv = hands.map((h) => new THREE.Vector3(...h));
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (!mat.color || !mat.emissive) return;
      if (!m.userData.base) m.userData.base = {color: mat.color.clone(), emissive: mat.emissive.clone(), ei: mat.emissiveIntensity} as Base;
      const base = m.userData.base as Base;
      m.getWorldPosition(v).applyMatrix4(inv);
      const order = hv.length ? clamp01(Math.min(...hv.map((h) => h.distanceTo(v)))) : 0;
      const vis = heat > 0 ? 1 : 1 - clamp01((p - order) / 0.15);
      m.visible = vis > 0.01;
      const transparent = vis < 0.999;
      if (mat.transparent !== transparent) {
        mat.transparent = transparent;
        mat.needsUpdate = true;
      }
      mat.opacity = vis;
      mat.depthWrite = vis > 0.6;
      if (heat > 0) {
        mat.color.copy(base.color);
        mat.emissive.copy(base.color).lerp(WHITE, 0.5);
        mat.emissiveIntensity = 1.0 * heat;
      } else {
        mat.color.copy(base.color);
        mat.emissive.copy(base.emissive);
        mat.emissiveIntensity = base.ei;
      }
    });
  });
  return <group ref={ref}>{children}</group>;
};

// ---------- Props ----------
const Mug: React.FC = () => (
  <group>
    <Cyl p={[0, 0, 0]} rad={0.05} h={0.11} c="#f4f1ea" />
    <Cyl p={[0, 0.052, 0]} rad={0.043} h={0.005} c="#4a2c1a" />
    <mesh position={[0.06, 0, 0]} rotation={[0, 0, 0]}>
      <torusGeometry args={[0.03, 0.01, 6, 12]} />
      <meshStandardMaterial color="#f4f1ea" roughness={0.6} />
    </mesh>
  </group>
);

const Sandwich: React.FC<{left: number}> = ({left}) => (
  <group scale={[left, 1, 1]} position={[0.13 * (1 - left), 0, 0]}>
    <Block p={[0, 0, 0]} s={[0.26, 0.05, 0.08]} c="#d9a35a" />
    <Block p={[0, 0.03, 0]} s={[0.25, 0.015, 0.085]} c="#6fa83a" />
    <Block p={[0, 0.045, 0]} s={[0.24, 0.015, 0.08]} c="#e07a6a" />
    <Block p={[0, 0.07, 0]} s={[0.26, 0.04, 0.08]} c="#cf9448" />
  </group>
);

/** White cane held in the right hand, tip on the ground ahead (model units). */
const Cane: React.FC<{hand: V3; tip: V3}> = ({hand, tip}) => {
  const a = new THREE.Vector3(...hand);
  const b = new THREE.Vector3(...tip);
  const d = b.clone().sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return (
    <group position={mid} quaternion={q}>
      <mesh scale={[1, d.length(), 1]}><cylinderGeometry args={[0.018, 0.018, 1, 8]} /><meshStandardMaterial color="#f6f6f2" /></mesh>
      <mesh position={[0, -d.length() * 0.38, 0]} scale={[1, d.length() * 0.18, 1]}><cylinderGeometry args={[0.02, 0.02, 1, 8]} /><meshStandardMaterial color="#c8322a" /></mesh>
    </group>
  );
};

// Chewed food: 4 chunks per bite, mouth → throat → stomach (model units, Marc's space).
const MOUTH: V3 = [0, 1.72, -0.16];
const THROAT: V3 = [0, 1.5, -0.06];
const STOMACH: V3 = [0.03, 1.2, -0.08];
const CHUNKS = (() => {
  const r = seeded(31);
  return BITES.flatMap((at, b) =>
    Array.from({length: 4}, (_, i) => ({
      born: at + 0.1 + i * 0.06,
      rest: [STOMACH[0] + (r() - 0.5) * 0.14, STOMACH[1] + (r() - 0.5) * 0.1, STOMACH[2] + (r() - 0.5) * 0.08] as V3,
      size: 0.045 + r() * 0.03,
      color: ['#c99550', '#b98444', '#d8a868', '#a8743c'][(b + i) % 4],
      spin: r() * 6,
    })),
  );
})();
const Bolus: React.FC<{t: number}> = ({t}) => {
  const shrink = 1 - 0.45 * digestAt(t);
  return (
    <>
      {CHUNKS.map((c, i) => {
        if (t < c.born) return null;
        const k = clamp01((t - c.born) / 0.9);
        const p = k < 0.4 ? mixV(MOUTH, THROAT, k / 0.4) : mixV(THROAT, c.rest, (k - 0.4) / 0.6);
        const churn = k >= 1 ? 0.012 * Math.sin(t * 2.2 + c.spin) : 0;
        return (
          <mesh key={i} position={[p[0] + churn, p[1] + churn * 0.6, p[2]]} rotation={[t * 0.4 + c.spin, c.spin, t * 0.3]} scale={c.size * (k >= 1 ? shrink : 1)}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={c.color} roughness={0.9} flatShading />
          </mesh>
        );
      })}
    </>
  );
};

const Bike: React.FC = () => (
  <group>
    {[-0.55, 0.55].map((z) => (
      <mesh key={z} position={[0, 0.34, z]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.32, 0.03, 6, 20]} />
        <meshStandardMaterial color="#1d1d1f" roughness={0.8} />
      </mesh>
    ))}
    <Block p={[0, 0.62, 0]} s={[0.04, 0.04, 0.8]} c="#2b8a6a" />
    <Block p={[0, 0.5, 0.2]} s={[0.04, 0.5, 0.04]} r={[0.35, 0, 0]} c="#2b8a6a" />
    <Block p={[0, 0.5, -0.38]} s={[0.04, 0.4, 0.04]} r={[-0.3, 0, 0]} c="#2b8a6a" />
    <Block p={[0, 0.82, 0.3]} s={[0.12, 0.04, 0.22]} c="#1d1d1f" />
    <Block p={[0, 0.9, -0.48]} s={[0.5, 0.03, 0.03]} c="#3a3f47" />
  </group>
);

const CctvCamera: React.FC<{pan: number; rec: number}> = ({pan, rec}) => (
  <group>
    <Cyl p={[0, 2.1, 0]} rad={0.07} h={4.2} c="#4a5058" metal />
    <Block p={[-0.25, 4.15, 0]} s={[0.5, 0.06, 0.06]} c="#4a5058" metal />
    <group position={[-0.45, 4.05, 0]} rotation={[0, pan, -0.25]}>
      <Block p={[-0.15, 0, 0]} s={[0.4, 0.16, 0.18]} c="#e8e6e0" />
      <Block p={[-0.37, 0, 0]} s={[0.05, 0.12, 0.14]} c="#1d1d1f" />
      <Ball p={[-0.02, 0.06, -0.09]} rad={0.015} c="#ff2a2a" e="#ff2a2a" ei={2 * rec} detail={0} />
    </group>
  </group>
);

// ---------- Kitchen (metres; back wall at z = 2.2, the camera usually looks toward +z) ----------
const MARC_HOME: V3 = [0.3, 0, 1.0];
const MARC_HIT: V3 = [0.42, 0, 0.42];
const HAND_IDLE: V3 = [0.22, 1.22, -0.28];
const HAND_SIP: V3 = [0.12, 1.66, -0.24];
const CHAIR_BLIND: V3 = [0.45, 0, 0.12];
const CHAIR_LUNCH: V3 = [0, 0, 0.12];
const TABLE: V3 = [0, 0, -0.55];
const JULIEN_SEAT: V3 = [0, 0, -1.22];
const JULIEN_BLIND: V3 = [-0.5, 0, -0.3];
const PLATE: V3 = [0.03, 0.775, -0.3];
/** Seated: the hidden body is lowered so his mouth is at sitting height. */
const MARC_LUNCH: V3 = [0, -0.2, 0.15];

const Kitchen: React.FC<{t: number}> = ({t}) => {
  const hour = t < LUNCH ? 7 + (t - MORNING) / 600 : 12 + 3 * digestAt(t);
  const late = digestAt(t);
  return (
    <group>
      <hemisphereLight color="#fff6e8" groundColor="#8a8070" intensity={0.75} />
      <directionalLight color={new THREE.Color('#ffe7c4').lerp(new THREE.Color('#ffd09a'), late).getStyle()} intensity={1.5} position={[3, 4, 5]} />
      <pointLight position={[0, 2.9, 0]} intensity={0.9} distance={7} decay={1.4} color="#fff4e0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#d8d2c4" roughness={0.9} /></mesh>
      {Array.from({length: 20}, (_, i) => <Block key={`x${i}`} p={[-5 + i * 0.5, 0.002, 0]} s={[0.01, 0.004, 10]} c="#b9b2a2" />)}
      {Array.from({length: 20}, (_, i) => <Block key={`z${i}`} p={[0, 0.002, -5 + i * 0.5]} s={[10, 0.004, 0.01]} c="#b9b2a2" />)}
      <mesh position={[0, 1.6, 2.2]} rotation={[0, Math.PI, 0]}><planeGeometry args={[10, 3.2]} /><meshStandardMaterial color="#e6e1d6" roughness={0.95} /></mesh>
      <mesh position={[-3.2, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[10, 3.2]} /><meshStandardMaterial color="#e3ddd0" roughness={0.95} /></mesh>
      <mesh position={[3.4, 1.6, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[10, 3.2]} /><meshStandardMaterial color="#e3ddd0" roughness={0.95} /></mesh>
      <mesh position={[0, 1.6, -3.6]}><planeGeometry args={[10, 3.2]} /><meshStandardMaterial color="#e6e1d6" roughness={0.95} /></mesh>
      <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#f2efe8" roughness={1} /></mesh>
      <group position={[-2.75, 0, 1.85]}><Fridge /></group>
      <group position={[-1.85, 0, 1.88]}><KitchenCounter width={0.9} /></group>
      <group position={[-0.95, 0, 1.88]}><KitchenCounter width={0.9} /></group>
      <group position={[-1.85, 1.6, 2.0]}><UpperCabinet width={0.9} /></group>
      <group position={[-0.95, 1.6, 2.0]}><UpperCabinet width={0.9} /></group>
      <group position={[2.1, 0.85, 2.18]}><InteriorWindow curtain="#3a6fb0" light={0.5 + 0.3 * late} /></group>
      <group position={[1.15, 2.2, 2.18]}><WallClock time={hour} /></group>
      <group position={[2.9, 0, 1.4]}><PottedPlant size={1.1} /></group>
      {t >= LUNCH && <group position={TABLE}><DiningTable /></group>}
      {t >= LUNCH && <group position={JULIEN_SEAT} rotation={[0, Math.PI, 0]}><DiningChair seat="#3a6fb0" /></group>}
    </group>
  );
};

/** Marc's chair: knocked over when he walks into it blind, upright again at lunch. */
const MarcChair: React.FC<{t: number}> = ({t}) => {
  if (t >= LUNCH) return <group position={CHAIR_LUNCH}><DiningChair /></group>;
  const tip = 1.45 * smooth(CHAIR, CHAIR + 0.35, t);
  return (
    <group position={[CHAIR_BLIND[0], 0, CHAIR_BLIND[2] - 0.22]} rotation={[-tip, 0, 0]}>
      <group position={[0, 0, 0.22]}><DiningChair /></group>
    </group>
  );
};

type MarcPose = {pos: V3; yaw: number; walk: number; right?: V3; left?: V3; cold?: number};
const marcAt = (t: number): MarcPose => {
  const w = worldAt(t);
  if (w === 'street') {
    if (t >= PUNCH) {
      const x = 2.6 - 0.35 * (t - PUNCH);
      return {pos: [x, 0.02, -1.0], yaw: Math.PI / 2, walk: 0.6, right: [0.24, 0.95, -0.34]};
    }
    // Standing in the road; after the bike he rubs his head.
    const rub = smooth(BIKE + 0.6, BIKE + 1.2, t);
    return {pos: [-1.6, 0.02, -2], yaw: 0, walk: 0, cold: 0.5 * smooth(BIKE, BIKE + 0.4, t),
      left: rub > 0 ? mixV([-0.3, 0.94, 0], [-0.17, 1.95, -0.05], rub) : undefined};
  }
  if (t >= LUNCH) return {pos: MARC_LUNCH, yaw: 0, walk: 0, right: [0.2, 1.4, -0.3]};
  if (t >= BLIND_WIDE && t < STREET) {
    const k = smooth(BLIND_WIDE, CHAIR, t);
    return {pos: mixV(MARC_HOME, MARC_HIT, k), yaw: 0, walk: t < CHAIR ? 0.9 : 0, right: t < CHAIR ? HAND_IDLE : [0.3, 1.3, -0.3]};
  }
  const sip = smooth(SIP, SIP + 0.5, t) * (1 - smooth(SIP + 1.4, SIP + 1.9, t));
  return {pos: MARC_HOME, yaw: 0, walk: 0, right: mixV(HAND_IDLE, HAND_SIP, sip)};
};

/** Mug in Marc's space: in the hand, or falling when he hits the chair. */
const MugInHand: React.FC<{t: number; hand: V3}> = ({t, hand}) => {
  const sip = smooth(SIP, SIP + 0.5, t) * (1 - smooth(SIP + 1.4, SIP + 1.9, t));
  if (t >= CHAIR && t < STREET) {
    const k = clamp01((t - CHAIR) / 0.5);
    const start: V3 = [HAND_IDLE[0] - 0.02, HAND_IDLE[1], HAND_IDLE[2] - 0.06];
    const end: V3 = [0.15, 0.06, -0.95];
    const p = mixV(start, end, k);
    p[1] += Math.sin(Math.PI * k) * 0.25;
    return (
      <>
        <group position={p} rotation={[-k * 1.57, 0, k * 0.6]}><Mug /></group>
        {/* Coffee spreading on the floor */}
        <mesh position={[0.15, 0.01, -0.95]} rotation={[-Math.PI / 2, 0, 0]} scale={0.0001 + 0.35 * smooth(CHAIR + 0.5, CHAIR + 1.4, t)}>
          <circleGeometry args={[1, 18]} />
          <meshStandardMaterial color="#4a2c1a" roughness={0.3} />
        </mesh>
      </>
    );
  }
  return <group position={[hand[0] - 0.02, hand[1], hand[2] - 0.06]} rotation={[-sip * 1.1, 0, 0]}><Mug /></group>;
};

const julienAt = (t: number): {pos: V3; yaw: number; pose: 'debout' | 'marche' | 'assis' | 'bras-leves'; phase: number; bend: number} | null => {
  if (t >= LUNCH) return {pos: JULIEN_SEAT, yaw: Math.PI, pose: 'assis', phase: 0, bend: -0.12 * smooth(BITES[0], BITES[0] + 0.5, t)};
  if (t >= POV) return {pos: JULIEN_BLIND, yaw: faceYaw(JULIEN_BLIND, MARC_HOME), pose: t >= CHAIR && t < CHAIR + 1.6 ? 'bras-leves' : 'debout', phase: 0, bend: 0};
  if (t < JULIEN_IN) return null;
  const k = smooth(JULIEN_IN, JULIEN_IN + 1.4, t);
  const pos = mixV([2.9, 0, 0.3], [1.4, 0, 0.3], k);
  if (k < 1) return {pos, yaw: Math.PI / 2, pose: 'marche', phase: t * 7, bend: 0};
  return {pos, yaw: Math.PI / 2 - 0.2, pose: t >= SHOCK && t < SHOCK + 2.0 ? 'bras-leves' : 'debout', phase: 0, bend: 0};
};

const JULIEN_LOOK = {shirt: '#3a6fb0', pants: '#2f343c', skin: '#d9a27c', hair: '#1e1712'};

const KitchenScene: React.FC<{t: number}> = ({t}) => {
  const m = marcAt(t);
  const j = julienAt(t);
  const hand = m.right ?? HAND_IDLE;
  const lunch = t >= LUNCH;
  // Sandwich: on the plate, lifted to the mouth, bitten three times, put back.
  const bitten = BITES.filter((b) => t >= b).length;
  const up = smooth(LIFT, LIFT + 0.6, t) * (1 - smooth(BITES[2] + 0.6, BITES[2] + 1.2, t));
  const chew = BITES.reduce((s, b) => s + Math.max(0, 1 - Math.abs(t - b + 0.1) / 0.15), 0);
  const mouthWorld: V3 = [MARC_LUNCH[0], MARC_LUNCH[1] + MOUTH[1] * S, MARC_LUNCH[2] + (MOUTH[2] - 0.1) * S];
  const sandwich = mixV(PLATE, [mouthWorld[0] + 0.05, mouthWorld[1] - 0.02, mouthWorld[2] - 0.03 + 0.05 * chew], up);
  return (
    <>
      <Kitchen t={t} />
      {t >= POV && <MarcChair t={t} />}
      <group position={m.pos} rotation={[0, m.yaw, 0]}>
        <group scale={S}>
          <Ghost p={vanishAt(t)} hands={[hand, m.left ?? [-0.3, 0.94, 0]]}>
            <Marc t={t} walk={m.walk} rightHand={hand} leftHand={m.left} />
          </Ghost>
          {!lunch && <MugInHand t={t} hand={hand} />}
          {lunch && <Bolus t={t} />}
        </group>
      </group>
      {lunch && (
        <>
          <Cyl p={[PLATE[0], 0.77, PLATE[2]]} rad={0.13} h={0.012} c="#f4f1ea" />
          <group position={[sandwich[0], sandwich[1] + 0.03, sandwich[2]]} rotation={[0, Math.PI / 2, 0]}><Sandwich left={1 - 0.27 * bitten} /></group>
        </>
      )}
      {j && (
        <group position={j.pos} rotation={[0, j.yaw, 0]}>
          <Person {...JULIEN_LOOK} pose={j.pose} phase={j.phase} bend={j.bend} />
        </group>
      )}
    </>
  );
};

// ---------- The eye, in cross-section (light comes from -x) ----------
const RAY_YS = [-0.36, -0.18, 0, 0.18, 0.36];
const LENS_X = -0.72;
const FOCUS: V3 = [0.95, 0, 0];
const RAY_START = -7;

const Segment: React.FC<{a: V3; b: V3; w?: number; color?: string}> = ({a, b, w = 0.025, color = '#ffe45c'}) => {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = d.length();
  if (len < 1e-4) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return (
    <mesh position={A.clone().add(B).multiplyScalar(0.5)} quaternion={q} scale={[w, len, w]}>
      <cylinderGeometry args={[1, 1, 1, 6]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
};

/** A light ray drawn along a polyline up to length `head`. */
const Ray: React.FC<{pts: V3[]; head: number}> = ({pts, head}) => {
  let left = head;
  const segs: React.ReactNode[] = [];
  for (let i = 0; i < pts.length - 1 && left > 0; i++) {
    const a = new THREE.Vector3(...pts[i]);
    const b = new THREE.Vector3(...pts[i + 1]);
    const len = a.distanceTo(b);
    const k = Math.min(1, left / len);
    const end = a.clone().lerp(b, k);
    segs.push(<Segment key={i} a={pts[i]} b={[end.x, end.y, end.z]} />);
    left -= len;
  }
  return <>{segs}</>;
};

const EyeScene: React.FC<{t: number}> = ({t}) => {
  const marc = smooth(EYE_MARC - 0.2, EYE_MARC + 0.6, t);
  const start = marc > 0.5 ? EYE_MARC + 0.5 : EYE + 0.6;
  const head = Math.max(0, (t - start) * 4.5);
  const arrived = (marc > 0.5 ? 0 : 1) * smooth(start + (FOCUS[0] - RAY_START + 0.3) / 4.5, start + (FOCUS[0] - RAY_START + 0.3) / 4.5 + 0.3, t);
  const fadeEye = (a: number, b: number) => mix(a, b, marc);
  return (
    <>
      <color attach="background" args={['#0b1020']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 6]} intensity={1.6} />
      {/* Sclera */}
      <mesh>
        <sphereGeometry args={[1, 40, 24]} />
        <meshStandardMaterial color="#f4f1ea" transparent opacity={fadeEye(0.28, 0.05)} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Retina: the cap at the back */}
      <mesh rotation={[0, 0, -Math.PI / 2]}>
        <sphereGeometry args={[0.97, 40, 16, 0, Math.PI * 2, 0, 1.15]} />
        <meshStandardMaterial color="#c43b52" emissive="#ff6070" emissiveIntensity={0.15 + 0.8 * arrived} transparent opacity={fadeEye(0.95, 0.07)} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Lens and iris */}
      <mesh position={[LENS_X, 0, 0]} scale={[0.14, 0.36, 0.36]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#bfe3ff" transparent opacity={fadeEye(0.65, 0.05)} depthWrite={false} />
      </mesh>
      <mesh position={[-0.86, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.36, 0.06, 8, 32]} />
        <meshStandardMaterial color="#5a7a3a" transparent opacity={fadeEye(1, 0.06)} depthWrite={false} />
      </mesh>
      {/* Optic nerve */}
      <mesh position={[1.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.13, 0.16, 0.6, 12]} />
        <meshStandardMaterial color="#e8b8a0" transparent opacity={fadeEye(1, 0.06)} depthWrite={false} />
      </mesh>
      {/* Rays: focused and stopped on the retina, or straight through Marc's eye */}
      {RAY_YS.map((y, i) => (
        <Ray key={`${i}-${marc > 0.5}`} head={head}
          pts={marc > 0.5 ? [[RAY_START, y, 0], [7, y, 0]] : [[RAY_START, y, 0], [LENS_X, y, 0], FOCUS]} />
      ))}
      {arrived > 0 && <Ball p={FOCUS} rad={0.06 + 0.04 * Math.sin(t * 12) * arrived} c="#fff2a0" e="#ffe45c" ei={3 * arrived} />}
    </>
  );
};

// ---------- Street (CityBase, metres; the street runs along z) ----------
const ROAD_MARC: V3 = [-1.6, 0.02, -2];
const BIKE_SPEED = 6;
const bikeAt = (t: number) => {
  const crash = smooth(BIKE, BIKE + 0.4, t);
  const z = t < BIKE ? ROAD_MARC[2] + 0.6 + BIKE_SPEED * (BIKE - t) : ROAD_MARC[2] + 0.6 - 0.5 * crash;
  return {pos: [ROAD_MARC[0] + 0.35 * crash, 0.02, z] as V3, tip: 1.45 * crash};
};
const riderAt = (t: number) => {
  const b = bikeAt(t);
  const fly = smooth(BIKE, BIKE + 0.5, t);
  const pos: V3 = [mix(b.pos[0], 0.3, fly), mix(0.37, 0.02, fly) + Math.sin(Math.PI * fly) * 0.5, b.pos[2] + 0.15 - 1.1 * fly];
  return {pos, pitch: -0.5 * Math.sin(Math.PI * fly)};
};
const PEDS = [
  {x: 6.7, z0: -26, v: 1.2, dir: 1, look: {shirt: '#b8322a', pants: '#2f343c', skin: '#e8b894', hair: '#3a2a1e'}},
  {x: 7.5, z0: 6, v: 1.1, dir: -1, look: {shirt: '#e8c45a', pants: '#3a3f47', skin: '#9a6a4a', hair: '#1a1410', hairStyle: 'long' as const}},
  {x: -6.9, z0: -18, v: 1.3, dir: 1, look: {shirt: '#3f6b4a', pants: '#40515b', skin: '#f0c8a8', hair: '#8a6a3a'}},
];

const StreetScene: React.FC<{t: number; view: View; thermal: boolean}> = ({t, view, thermal}) => {
  const m = marcAt(t);
  const heat = thermal ? 1 : 0;
  const bike = bikeAt(t);
  const rider = riderAt(t);
  const pan = t < CCTV ? 0.9 : mix(0.9, 0.35, smooth(CCTV + 0.3, CCTV + 1.6, t));
  const tap = Math.sin(t * 3.4);
  const hand = m.right ?? [0.24, 0.95, -0.34];
  return (
    <CityBase time={t} seed={7} lit={thermal ? 1 : 0} traffic={false} crowd={false} fogFar={thermal ? 160 : 420} focus={view.pos.z - 10}
      skyTop={thermal ? '#05060c' : '#6a9ad6'} skyBottom={thermal ? '#141428' : '#efe6d2'}>
      {thermal && <ambientLight intensity={0.05} />}
      <group position={m.pos} rotation={[0, m.yaw, 0]}>
        <group scale={S}>
          <Ghost p={1.15} heat={heat} hands={[hand]}>
            <Marc t={t} walk={m.walk} cold={m.cold} rightHand={m.right} leftHand={m.left} />
          </Ghost>
          {t >= PUNCH && <Cane hand={hand} tip={[0.18 + 0.22 * tap, 0, -0.95]} />}
          {t >= PUNCH && <Bolus t={t} />}
        </group>
      </group>
      {t < HEAT + 7 && (
        <>
          <group position={bike.pos} rotation={[0, 0, bike.tip]}><Bike /></group>
          <group position={rider.pos} rotation={[rider.pitch, 0, 0]}>
            <Ghost p={0} heat={heat * 0.85}><Person shirt="#e05a2a" pants="#2f343c" skin="#e8b894" hair="#5a3a22" pose="assis" /></Ghost>
          </group>
        </>
      )}
      {PEDS.map((p, i) => (
        <group key={i} position={[p.x, 0.15, p.z0 + p.dir * p.v * (t - STREET)]} rotation={[0, p.dir > 0 ? Math.PI : 0, 0]}>
          <Ghost p={0} heat={heat * 0.8}><Person {...p.look} pose="marche" phase={t * 7 + i} /></Ghost>
        </group>
      ))}
      <group position={[4.9, 0.15, -9]}><CctvCamera pan={pan} rec={t >= LOCK ? 0.5 + 0.5 * Math.sin(t * 9) : 0.3} /></group>
    </CityBase>
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

export const SHOTS: Shot[] = [
  // Hook: Marc with his coffee fades out, the mug stays.
  {from: 0, view: (t, k) => ({pos: V(mix(0.1, 0.15, k), 1.5, mix(-1.5, -1.2, k)), target: V(0.3, 1.8, 1.0), fov: 45})},
  // 7 a.m., Marc visible again with his coffee.
  {from: MORNING, view: (t, k) => ({pos: V(mix(-0.2, 0.0, k), 1.45, mix(-1.4, -1.1, k)), target: V(0.3, 1.55, 1.0), fov: 46})},
  // Close on the hands: they go first, then the arms.
  {from: 6.4, view: (t, k) => ({pos: V(mix(0.35, 0.3, k), 1.3, mix(-0.8, -1.0, k)), target: V(0.3, 1.05, 1.0), fov: 46})},
  // Full body: the rest goes.
  {from: 8.6, view: (t, k) => ({pos: V(0.2, 1.35, mix(-2.0, -2.3, k)), target: V(0.3, 1.25, 1.0), fov: 48})},
  // Julien comes in: a mug floating on its own.
  {from: JULIEN_IN, view: (t, k) => ({pos: V(mix(-1.3, -1.1, k), 1.5, mix(-2.8, -2.6, k)), target: V(1.1, 1.1, 0.5), fov: 55})},
  // Over the invisible shoulder: Julien stares at the mug.
  {from: 12.8, view: (t, k) => ({pos: V(mix(-0.9, -0.7, k), 1.4, mix(-1.4, -1.2, k)), target: V(0.95, 1.5, 0.55), fov: 50})},
  // The eye: light stops on the retina.
  {from: EYE, view: (t, k) => ({pos: V(mix(0.3, 0.2, k), 0.4, mix(8.6, 7.6, k)), target: V(0.1, 0.25, 0), fov: 45})},
  // Marc's eye: light goes straight through.
  {from: EYE_MARC, view: (t, k) => ({pos: V(mix(-0.3, -0.1, k), 0.3, mix(8.0, 7.2, k)), target: V(0.1, 0.25, 0), fov: 45})},
  // His point of view, going dark.
  {from: POV, view: (t, k) => ({pos: V(0.3, 1.63, 0.78), target: V(mix(-0.5, -0.45, k), 1.45, -0.3), fov: 52})},
  // Wide: he walks into the chair.
  {from: BLIND_WIDE, view: (t, k) => ({pos: V(mix(2.5, 2.3, k), 1.5, mix(-2.0, -1.8, k)), target: V(0.4, 0.75, 0.4), fov: 50})},
  // Out in the street: a cyclist coming.
  {from: STREET, view: (t, k) => ({pos: V(2.6, 1.35, mix(-8.5, -8.0, k)), target: V(-1.6, 1.0, 1.5), fov: 50})},
  // Low and close for the impact.
  {from: 32.0, view: (t, k) => ({pos: V(0.6, 0.65, mix(-5.2, -5.0, k)), target: V(-1.5, 0.8, 1.0), fov: 48,
    shake: Math.max(0, 1 - Math.abs(t - BIKE - 0.2) / 0.8)})},
  // Thermal: Marc glows at 37 °C.
  {from: HEAT, view: (t, k) => ({pos: V(mix(-0.4, -0.9, k), 1.5, mix(-5.8, -4.8, k)), target: V(-1.5, 1.15, -2), fov: 46})},
  // The police camera on its pole turns toward him.
  {from: CCTV, view: (t, k) => ({pos: V(2.2, 0.9, mix(-12.8, -12.4, k)), target: V(4.4, 3.8, -9), fov: 50})},
  // Through the police camera (thermal).
  {from: CCTV_POV, view: (t, k) => ({pos: V(4.3, 3.9, -8.9), target: V(-1.6, 1.0, -2.1), fov: mix(30, 22, k)})},
  // Noon: the sandwich floats up to an empty chair.
  {from: LUNCH, view: (t, k) => ({pos: V(mix(0.9, 0.8, k), 1.5, mix(-2.4, -2.2, k)), target: V(0, 1.0, 0.0), fov: 48})},
  // Close on his belly: the chewed bread drops in.
  {from: 53.2, view: (t, k) => ({pos: V(mix(1.6, 1.4, k), 1.0, mix(0.3, 0.25, k)), target: V(0, 0.82, 0.08), fov: 40})},
  // Digestion, hours go by.
  {from: DIGEST, view: (t, k) => ({pos: V(mix(-1.5, -1.25, k), 1.0, mix(0.2, 0.15, k)), target: V(0, 0.82, 0.08), fov: 40})},
  // Punch: a white cane and a lunch, walking on their own.
  {from: PUNCH, view: (t, k) => ({pos: V(-1.5, 1.15, -2.5), target: V(mix(2.4, 1.5, k), 1.0, -1.0), fov: 42})},
  // Same, through a thermal camera.
  {from: PUNCH_HEAT, view: (t, k) => ({pos: V(-1.5, 1.15, -2.5), target: V(mix(1.5, 0.3, k), 1.0, -1.0), fov: 44})},
];
export const CUTS = cutsOf(SHOTS);

const shotAt = (t: number): View => shotAtOf(SHOTS, t, DURATION);

export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const base = shotAt(t);
  const s = base.shake ?? 0;
  const view = s > 0 ? {...base, pos: base.pos.clone().add(V(Math.sin(t * 61) * 0.05 * s, Math.sin(t * 47) * 0.04 * s, 0))} : base;
  const world = worldAt(t);
  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} near={0.03} />
      {world === 'kitchen' && <KitchenScene t={t} />}
      {world === 'eye' && <EyeScene t={t} />}
      {world === 'street' && <StreetScene t={t} view={view} thermal={isThermal(t)} />}
    </>
  );
};
