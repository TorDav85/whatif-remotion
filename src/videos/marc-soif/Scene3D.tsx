import React, {useLayoutEffect} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Ball, Block, seeded} from '../../assets/kit';
import {
  DiningChair, DiningTable, Fridge, KitchenCounter, PendantLamp, PottedPlant, Rug, Sink, Sofa, Stove,
  UpperCabinet, InteriorWindow, WallClock, Radiator,
} from '../../assets/interior';
import {Marc} from '../../shared/characters/Marc';
import {cutsOf, shotAt as shotAtOf, type Shot as ShotOf} from '../../shared/three/shots';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

// ---------- Story clock (s). Mirrored in scripts/audio/marc-soif.py ----------
/** Start of days 1 to 5. */
export const DAYS = [4.6, 20.6, 32.6, 44.6, 55.4];
/** The heart stops: the picture goes dark. */
export const STOP = 63.6;
/** Back to light for the facts, then Marc (fine again) drinks. */
export const BRIGHT = 67.4;
export const DRINK = 74.4;
export const DURATION = 81;

/** Days elapsed without water, continuous: 0 at the start of day 1, 5 at the stop. */
export const dayFloat = (t: number) => {
  if (t < DAYS[0] || t >= BRIGHT) return 0;
  const ends = [...DAYS.slice(1), STOP];
  for (let i = 0; i < DAYS.length; i++) if (t < ends[i]) return i + (t - DAYS[i]) / (ends[i] - DAYS[i]);
  return 5;
};
/** Day number shown (1 to 5), 0 before the countdown starts. */
export const dayAt = (t: number) => (t < DAYS[0] || t >= STOP ? 0 : DAYS.filter((d) => t >= d).length);
/** Litres of water lost: about 2.5 L a day. */
export const waterLost = (t: number) => 2.5 * dayFloat(t);
export const heartRate = (t: number) => Math.round(68 + 16 * Math.pow(dayFloat(t), 1.3));
export const temperature = (t: number) => 37 + 0.15 * dayFloat(t) + 3.2 * smooth(DAYS[4], 61.5, t) * (t < BRIGHT ? 1 : 0);

const MODEL_H = 2.06;
const S = 1.8 / MODEL_H; // Marc is 1.8 m

// ---------- Small props ----------
/** A glass of water. `level` 0..1 is how full it is. Origin at its base. */
export const Glass: React.FC<{level?: number}> = ({level = 0.85}) => (
  <group>
    <mesh position={[0, 0.06, 0]}>
      <cylinderGeometry args={[0.042, 0.036, 0.12, 20, 1, true]} />
      <meshStandardMaterial color="#dff1ff" transparent opacity={0.35} roughness={0.05} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0.004, 0]}>
      <cylinderGeometry args={[0.036, 0.036, 0.008, 20]} />
      <meshStandardMaterial color="#cfe7f7" transparent opacity={0.6} roughness={0.05} />
    </mesh>
    {level > 0.02 && (
      <mesh position={[0, 0.008 + (0.105 * level) / 2, 0]}>
        <cylinderGeometry args={[0.036 + 0.005 * level, 0.035, 0.105 * level, 20]} />
        <meshStandardMaterial color="#4fa8e6" transparent opacity={0.72} roughness={0.1} emissive="#1d5c8a" emissiveIntensity={0.25} />
      </mesh>
    )}
  </group>
);

/** Drops leaving Marc's body (sweat, breath): they rise and fade. `amount` 0..1. */
const DROPS = (() => {
  const r = seeded(17);
  return Array.from({length: 46}, () => ({x: (r() - 0.5) * 0.6, y: 0.3 + r() * 1.5, z: (r() - 0.5) * 0.35, ph: r(), sp: 0.5 + r() * 0.6}));
})();
const Drops: React.FC<{t: number; amount: number; color?: string}> = ({t, amount, color = '#7cc6ff'}) => {
  if (amount <= 0.01) return null;
  return (
    <>
      {DROPS.map((d, i) => {
        const k = (t * d.sp * 0.35 + d.ph) % 1;
        const s = 0.022 * Math.sin(Math.PI * k) * amount;
        if (s < 0.002) return null;
        return <Ball key={i} p={[d.x * (1 + k), d.y + k * 0.7, d.z * (1 + k) - 0.05]} rad={s} c={color} e={color} ei={0.6} detail={1} />;
      })}
    </>
  );
};

// ---------- Apartment set (metres, fronts face -z, the camera stays on the -z side) ----------
const TABLE: V3 = [0.7, 0, -0.4];
export const GLASS_ON_TABLE: V3 = [0.22, 0.765, -0.62];
const SOFA: V3 = [1.6, 0, 1.3];

const Room: React.FC<{t: number; dry: number}> = ({t, dry}) => {
  const wall = new THREE.Color('#e9dcc6').lerp(new THREE.Color('#e7c8a8'), dry * 0.6).getStyle();
  const day = Math.max(0, dayFloat(t));
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial color="#b98c5e" roughness={0.85} />
      </mesh>
      {/* Floorboards */}
      {Array.from({length: 18}, (_, i) => <Block key={i} p={[-4.5 + i * 0.5, 0.002, 0]} s={[0.012, 0.004, 9]} c="#9c7349" />)}
      <mesh position={[0, 1.5, 2.6]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[9, 3]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      <mesh position={[-3, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[9, 3]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      <mesh position={[3.2, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[9, 3]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial color="#f1ebe0" roughness={1} />
      </mesh>
      <Block p={[0, 0.05, 2.58]} s={[9, 0.1, 0.03]} c="#f4efe4" />

      {/* Kitchen along the back wall */}
      <group position={[-2.55, 0, 2.25]}><Fridge /></group>
      <group position={[-1.75, 0, 2.28]}><KitchenCounter width={0.9} /></group>
      <group position={[-0.8, 0, 2.28]}><Sink width={1.0} /></group>
      <group position={[0.0, 0, 2.28]}><Stove /></group>
      <group position={[-1.75, 1.55, 2.4]}><UpperCabinet width={0.9} /></group>
      <group position={[-0.8, 1.55, 2.4]}><UpperCabinet width={1.0} /></group>

      {/* Living side */}
      <group position={[1.75, 0.8, 2.57]}><InteriorWindow light={0.35 + 0.4 * (1 - dry * 0.3)} view={dry > 0.75 ? '#f2b27a' : '#9cc3e6'} /></group>
      <group position={[1.75, 0.25, 2.48]}><Radiator /></group>
      <group position={[0.65, 2.15, 2.57]}><WallClock time={9 + (t * 0.9) % 12} /></group>
      <group position={SOFA}><Sofa /></group>
      <group position={[1.6, 0.003, 0.6]}><Rug w={2.6} d={1.4} /></group>
      <group position={[2.85, 0, 0.3]}><PottedPlant size={1.1 - 0.25 * clamp01(day / 5)} /></group>

      {/* Dining table, with the glass of water Marc ignores */}
      <group position={TABLE}><DiningTable /></group>
      <group position={[1.2, 0, 0.35]} rotation={[0, Math.PI, 0]}><DiningChair /></group>
      <group position={[0.7, 2.9, -0.4]}><PendantLamp lit={0.4} /></group>
    </group>
  );
};

// ---------- Marc's pose ----------
type Pose = {pos: V3; rot: V3; cold: number; right?: V3; left?: V3; glass?: 'hand'};
const REST_R: V3 = [0.3, 0.94, 0];
const STAND_TABLE: V3 = [-0.15, 0, -0.75];
const STAND_KITCHEN: V3 = [-1.15, 0, 1.15];
const STAND_ROOM: V3 = [-0.35, 0, 0.45];
/** Lying on his back on the sofa, head toward +x. */
const LYING: V3 = [0.72, 0.69, 1.25];

/** Hand target (Marc's local space) that holds the glass at world point w. */
const handFor = (w: V3, pos: V3): V3 => [(w[0] - pos[0]) / S, (w[1] + 0.03 - pos[1]) / S, (w[2] - pos[2]) / S];

/** Glass position on the table while Marc pushes it away on day 1. */
export const glassOnTable = (t: number): V3 => {
  const k = smooth(5.9, 6.7, t) * (t < BRIGHT ? 1 : 0);
  return [GLASS_ON_TABLE[0] + 0.32 * k, GLASS_ON_TABLE[1], GLASS_ON_TABLE[2] + 0.12 * k];
};

const poseAt = (t: number): Pose => {
  if (t >= DRINK) {
    // Fine again: picks up the glass, drinks, lowers it.
    const lift = smooth(74.7, 75.6, t) * (1 - smooth(78.5, 79.3, t));
    const mouth: V3 = [0.07, 1.62, -0.24];
    const grab = handFor(GLASS_ON_TABLE, STAND_TABLE);
    const reach = smooth(74.4, 74.8, t);
    const right = lift > 0 ? mixV(grab, mouth, lift) : mixV(REST_R, grab, reach);
    return {pos: STAND_TABLE, rot: [0, 0, 0], cold: 0, right, glass: reach > 0.98 ? 'hand' : undefined};
  }
  if (t >= BRIGHT) return {pos: STAND_TABLE, rot: [0, 0, 0], cold: 0};
  if (t >= DAYS[3]) {
    // Days 4-5: lying on the sofa, shaking more and more.
    return {pos: LYING, rot: [0, 0, 0], cold: t > DAYS[4] ? 0.9 : 0.35, right: [0.18, 1.2, -0.2], left: [-0.32, 0.92, -0.05]};
  }
  if (t >= DAYS[2]) {
    // Day 3: headache and dizziness, a hand on his forehead, swaying.
    const sway = Math.sin(t * 1.6) * 0.06;
    const head = smooth(DAYS[2] + 0.4, DAYS[2] + 1.2, t) * (1 - smooth(37.6, 38.2, t));
    return {pos: STAND_ROOM, rot: [sway * 0.4, 0, sway], cold: 0.15, right: mixV(REST_R, [0.12, 1.86, -0.2], head)};
  }
  if (t >= DAYS[1]) {
    // Day 2: thirsty by the sink, wiping his forehead.
    const wipe = Math.max(0, Math.sin(Math.PI * clamp01((t - 22.0) / 1.6)));
    return {pos: STAND_KITCHEN, rot: [0, 0, 0], cold: 0.1, left: mixV([-0.3, 0.94, 0], [-0.1, 1.9, -0.19], wipe)};
  }
  // Day 1: pushes the glass away.
  const g = glassOnTable(t);
  const touch = smooth(5.3, 5.9, t) * (1 - smooth(6.8, 7.5, t));
  return {pos: STAND_TABLE, rot: [0, 0, 0], cold: 0, right: mixV(REST_R, handFor([g[0] - 0.04, g[1], g[2]], STAND_TABLE), touch)};
};

/** Skin: pale on days 3-4, flushed with fever on day 5. */
const skinAt = (t: number) => {
  const c = new THREE.Color('#efbd96');
  if (t >= BRIGHT) return c.getStyle();
  c.lerp(new THREE.Color('#d8bfae'), smooth(DAYS[1], DAYS[3], t) * 0.8);
  c.lerp(new THREE.Color('#ee9a80'), smooth(DAYS[4], 61, t) * 0.75);
  return c.getStyle();
};

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
const at = (p: V3, x: number, y: number, z: number) => V(p[0] + x, p[1] + y, p[2] + z);

export const SHOTS: Shot[] = [
  // Hook: Marc, the table and the glass.
  {from: 0, view: (t, k) => ({pos: V(mix(-1.3, -1.0, k), 1.55, mix(-3.6, -3.2, k)), target: V(0.15, 0.95, -0.5), fov: 50})},
  // Day 1: he pushes the glass away.
  {from: DAYS[0], view: (t, k) => ({pos: V(mix(0.75, 0.6, k), 1.45, mix(-3.0, -2.75, k)), target: V(0.15, 0.95, -0.68), fov: 50})},
  // 60 % water: full body, facing camera.
  {from: 9.2, view: (t, k) => ({pos: at(STAND_TABLE, -0.35, 1.15, mix(-3.0, -2.6, k)), target: at(STAND_TABLE, 0, 0.95, 0), fov: 50})},
  // Losing water: slow orbit, drops rising from him.
  {from: 15.6, view: (t, k) => {
    const a = mix(-0.7, -0.2, k);
    return {pos: at(STAND_TABLE, Math.sin(a) * 2.3, 1.1, -Math.cos(a) * 2.3), target: at(STAND_TABLE, 0, 1.05, 0), fov: 50};
  }},
  // Day 2: by the sink.
  {from: DAYS[1], view: (t, k) => ({pos: at(STAND_KITCHEN, mix(0.9, 0.7, k), 1.45, -2.3), target: at(STAND_KITCHEN, 0, 1.15, 0), fov: 50})},
  // Thicker blood, harder heart: close on his chest and face.
  {from: 26.2, view: (t, k) => ({pos: at(STAND_KITCHEN, 0.25, 1.5, mix(-1.35, -1.15, k)), target: at(STAND_KITCHEN, 0, 1.35, 0), fov: 50})},
  // Day 3: dizzy, the camera rolls with him.
  {from: DAYS[2], view: (t, k) => ({pos: at(STAND_ROOM, -0.6, 1.35, mix(-2.4, -2.0, k)), target: at(STAND_ROOM, 0, 1.15, 0), fov: 50, roll: Math.sin(t * 1.6) * 0.07})},
  // Cracked lips, skin that stays pinched: close on his face.
  {from: 38.2, view: (t, k) => ({pos: at(STAND_ROOM, -0.4, 1.6, mix(-1.05, -0.9, k)), target: at(STAND_ROOM, -0.05, 1.58, 0), fov: 50, roll: Math.sin(t * 1.6) * 0.04})},
  // Day 4: lying on the sofa.
  {from: DAYS[3], view: (t, k) => ({pos: V(mix(1.4, 1.7, k), 2.3, mix(-2.2, -1.9, k)), target: V(1.6, 0.65, 1.2), fov: 50})},
  // Heart racing.
  {from: 50.2, view: (t, k) => ({pos: V(mix(1.85, 1.95, k), 1.45, mix(0.2, 0.35, k)), target: V(2.15, 0.78, 1.25), fov: 50})},
  // Day 5: from above, pushing in on his face.
  {from: DAYS[4], view: (t, k) => ({pos: V(mix(1.5, 2.0, k), mix(2.9, 2.1, k), mix(0.7, 0.95, k)), target: V(mix(1.55, 2.2, k), 0.75, 1.25), fov: 50, roll: 0.05 * Math.sin(t * 0.9)})},
  // The stop: close on his face, the picture fades.
  {from: 61.8, view: (t, k) => ({pos: V(2.15, 1.25, mix(0.55, 0.7, k)), target: V(2.3, 0.75, 1.25), fov: 50})},
  // The facts: the glass of water, sunny again.
  {from: BRIGHT, view: (t, k) => {
    const a = mix(0.35, 0.95, k);
    const g = GLASS_ON_TABLE;
    return {pos: V(g[0] + Math.sin(a) * 0.55, 0.98, g[2] - Math.cos(a) * 0.55), target: V(g[0], 0.83, g[2]), fov: 50};
  }},
  // Marc drinks.
  {from: DRINK, view: (t, k) => ({pos: at(STAND_TABLE, mix(-0.75, -0.6, k), 1.5, mix(-2.1, -1.8, k)), target: at(STAND_TABLE, 0.08, 1.3, 0), fov: 50})},
];
export const CUTS = SHOTS.slice(1).map((s) => s.from).filter((c) => c !== 61.8);

const shotAt = (t: number): View => shotAtOf(SHOTS, t, DURATION);

/** 0 = fresh, 1 = day 5 (drives light, colours and the picture grade). */
export const dryAt = (t: number) => clamp01(dayFloat(t) / 5);

// ---------- Scene ----------
export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const view = shotAt(t);
  const dry = dryAt(t);
  const pose = poseAt(t);
  // Short night between two days: the light drops and turns blue.
  const night = Math.max(0, ...DAYS.slice(1).map((d) => 1 - Math.min(1, Math.abs(t - (d - 0.35)) / 0.6)));
  const sunCol = new THREE.Color('#fff2dc').lerp(new THREE.Color('#ffb36b'), dry).lerp(new THREE.Color('#6d86c9'), night);
  const sun = (1.9 + 0.5 * dry) * (1 - 0.8 * night);
  const lying = t >= DAYS[3] && t < BRIGHT;
  const glassT = glassOnTable(t);
  const hold = pose.glass === 'hand';
  const level = t >= DRINK ? 0.85 * (1 - smooth(76.0, 78.3, t)) + 0.05 : 0.85;
  // World position of the glass when Marc holds it: just outside his fist, so the hand doesn't swallow it.
  const handWorld = pose.right ? [pose.pos[0] + pose.right[0] * S - 0.075, pose.pos[1] + pose.right[1] * S - 0.07, pose.pos[2] + pose.right[2] * S - 0.03] as V3 : glassT;
  const tilt = t >= DRINK ? 0.9 * smooth(75.6, 76.1, t) * (1 - smooth(78.3, 78.8, t)) : 0;
  const sweat = t < BRIGHT ? Math.max(smooth(15.6, 16.3, t) * (1 - smooth(19.3, 20.0, t)), 0.5 * smooth(20.6, 21.5, t) * (1 - smooth(31.5, 32.4, t))) : 0;

  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} roll={view.roll ?? 0} />
      <color attach="background" args={['#1b1d24']} />
      <hemisphereLight color={new THREE.Color('#fff7ea').lerp(new THREE.Color('#5a6aa0'), night)} groundColor="#8a6a4a" intensity={1.0 - 0.5 * night} />
      <directionalLight color={sunCol} intensity={sun} position={[3.5, 5, 6]} />
      <directionalLight color="#c9dcff" intensity={0.45} position={[-4, 3, -5]} />
      <ambientLight intensity={0.15} />
      <Room t={t} dry={dry} />
      {!hold && <group position={glassT}><Glass level={level} /></group>}
      {hold && (
        <group position={handWorld} rotation={[tilt, 0, 0]}><Glass level={level} /></group>
      )}
      {!(t >= BRIGHT && t < DRINK) && <group position={pose.pos}>
        {/* Lying: tip him onto his back (front up), then turn so his head points to +x along the sofa. */}
        <group rotation={lying ? [0, Math.PI / 2, 0] : pose.rot}>
          <group rotation={lying ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
            <group scale={S}>
              <Marc t={t} cold={pose.cold} rightHand={pose.right} leftHand={pose.left} skin={skinAt(t)} />
              <Drops t={t} amount={sweat} />
            </group>
          </group>
        </group>
      </group>}
    </>
  );
};
