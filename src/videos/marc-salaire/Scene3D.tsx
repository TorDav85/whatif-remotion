import React, {useLayoutEffect} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Block, seeded} from '../../assets/kit';
import {Car} from '../../assets/Car';
import {Bookshelf, FloorLamp, PottedPlant, Rug, Sofa, Television, TvStand, WallClock} from '../../assets/interior';
import {Marc} from '../../shared/characters/Marc';
import {cutsOf, shotAt as shotAtOf, type Shot as ShotOf} from '../../shared/three/shots';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

// ---------- Story clock (s). Mirrored in scripts/audio/marc-salaire.py ----------
/** Bank notifications: the hook teaser, then months 1, 2, 6 and 12. */
export const PAYMENTS = [0.6, 6.4, 17.0, 29.0, 48.0];
export const CALL: [number, number] = [10.8, 15.6];
export const TV = 24.2;
export const NIGHT = 34.2;
export const MSG = [53.6, 59.0];
export const BELL = 66.6;
export const DOOR_OPEN = 68.6;
export const BLACK = 69.4;
export const DURATION = 79;

/** Months paid so far, continuous (the counter races through months 3-6 and 7-12). */
export const monthAt = (t: number) =>
  smooth(6.2, 6.8, t) + smooth(16.8, 17.4, t) + 4 * smooth(28.0, 29.4, t) + 6 * smooth(47.0, 48.6, t);
export const balanceAt = (t: number) => 1243.17 + 10000 * monthAt(t);
export const nightAt = (t: number) => (t >= NIGHT ? 1 : 0);

const MODEL_H = 2.06;
const S = 1.8 / MODEL_H;

// ---------- Apartment (metres). Back wall at z = 2.6 with a window onto the street ----------
const WALL_Z = 2.6;
const WIN: {x0: number; x1: number; y0: number; y1: number} = {x0: 0.9, x1: 2.3, y0: 0.9, y1: 2.3};
export const STREET_Y = -6;
export const CAR_AT: V3 = [1.7, STREET_Y, 8.5];
export const DOOR_AT: V3 = [-2.98, 0, 0.2];

const WINDOW_LIGHTS = (() => {
  const r = seeded(31);
  return Array.from({length: 60}, (_, i) => ({x: -6 + (i % 10) * 1.4, y: STREET_Y + 1.5 + Math.floor(i / 10) * 2.6, on: r() > 0.45}));
})();

export const Outside: React.FC<{night: number}> = ({night}) => {
  const sky = night ? '#0b1430' : '#9ccbee';
  return (
    <group>
      <mesh position={[0, 4, 40]} rotation={[0, Math.PI, 0]}><planeGeometry args={[120, 60]} /><meshBasicMaterial color={sky} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, STREET_Y, 18]}><planeGeometry args={[40, 34]} /><meshStandardMaterial color={night ? '#2a2c33' : '#8f9196'} roughness={1} /></mesh>
      <Block p={[0, STREET_Y + 0.01, 9]} s={[40, 0.01, 6]} c={night ? '#1d1e22' : '#4a4c52'} />
      {[-12, -8, -4, 0, 4, 8, 12].map((x) => <Block key={x} p={[x, STREET_Y + 0.02, 9]} s={[2, 0.01, 0.15]} c="#e8e2d2" />)}
      {/* Opposite building */}
      <Block p={[0, STREET_Y + 9, 15]} s={[16, 18, 3]} c={night ? '#3a3f4c' : '#d8c8a8'} />
      {WINDOW_LIGHTS.map((w, i) => (
        <Block key={i} p={[w.x, w.y, 13.46]} s={[0.8, 1.2, 0.04]} c={night ? (w.on ? '#ffd27a' : '#1a1d26') : '#7aa0c0'} e="#ffc860" ei={night && w.on ? 1.2 : 0} />
      ))}
      <group position={CAR_AT} rotation={[0, Math.PI / 2, 0]}>
        <Car color="#121316" lights={night} />
      </group>
      {night > 0 && <pointLight position={[CAR_AT[0] - 2.6, STREET_Y + 0.7, CAR_AT[2]]} intensity={40} distance={12} color="#fff4d0" />}
      {night > 0 && <pointLight position={[0, STREET_Y + 4, 6]} intensity={30} distance={18} color="#ffb860" />}
      {/* Streetlight right above the black car */}
      <Block p={[CAR_AT[0] + 2.4, STREET_Y + 2.2, CAR_AT[2] + 2.2]} s={[0.12, 4.4, 0.12]} c="#2a2d31" />
      <Block p={[CAR_AT[0] + 1.6, STREET_Y + 4.4, CAR_AT[2] + 2.2]} s={[1.7, 0.1, 0.25]} c="#2a2d31" />
      <Block p={[CAR_AT[0] + 1.0, STREET_Y + 4.32, CAR_AT[2] + 2.2]} s={[0.5, 0.06, 0.2]} c="#fff1c8" e="#ffd27a" ei={night ? 2 : 0} />
      {night > 0 && <pointLight position={[CAR_AT[0] + 0.8, STREET_Y + 4.0, CAR_AT[2] + 1.6]} intensity={120} distance={14} decay={1.6} color="#ffd9a0" />}
    </group>
  );
};

export const Apartment: React.FC<{t: number; night: number}> = ({t, night}) => {
  const wall = night ? '#c9c2b4' : '#ece3d2';
  const W = 9;
  const H = 3;
  const tvGrow = smooth(TV - 0.2, TV + 0.3, t);
  const tvHue = (t * 0.3) % 1;
  const screen = new THREE.Color().setHSL(tvHue, 0.6, 0.55).getStyle();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, WALL_Z - W / 2]}><planeGeometry args={[W, W]} /><meshStandardMaterial color="#b98c5e" roughness={0.85} /></mesh>
      {Array.from({length: 18}, (_, i) => <Block key={i} p={[-4.5 + i * 0.5, 0.002, WALL_Z - W / 2]} s={[0.012, 0.004, W]} c="#9c7349" />)}
      <mesh position={[0, H, WALL_Z - W / 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[W, W]} /><meshStandardMaterial color="#f1ebe0" roughness={1} /></mesh>
      {/* Back wall, cut around the window */}
      <Block p={[(-W / 2 + WIN.x0) / 2, H / 2, WALL_Z]} s={[WIN.x0 + W / 2, H, 0.1]} c={wall} />
      <Block p={[(WIN.x1 + W / 2) / 2, H / 2, WALL_Z]} s={[W / 2 - WIN.x1, H, 0.1]} c={wall} />
      <Block p={[(WIN.x0 + WIN.x1) / 2, WIN.y0 / 2, WALL_Z]} s={[WIN.x1 - WIN.x0, WIN.y0, 0.1]} c={wall} />
      <Block p={[(WIN.x0 + WIN.x1) / 2, (WIN.y1 + H) / 2, WALL_Z]} s={[WIN.x1 - WIN.x0, H - WIN.y1, 0.1]} c={wall} />
      {/* Window frame and glass */}
      {[WIN.x0, WIN.x1, (WIN.x0 + WIN.x1) / 2].map((x) => <Block key={x} p={[x, (WIN.y0 + WIN.y1) / 2, WALL_Z - 0.04]} s={[0.06, WIN.y1 - WIN.y0, 0.1]} c="#f4f1ea" />)}
      {[WIN.y0, WIN.y1].map((y) => <Block key={y} p={[(WIN.x0 + WIN.x1) / 2, y, WALL_Z - 0.04]} s={[WIN.x1 - WIN.x0 + 0.06, 0.06, 0.12]} c="#f4f1ea" />)}
      <mesh position={[(WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, WALL_Z]}>
        <boxGeometry args={[WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, 0.01]} />
        <meshStandardMaterial color="#dff0ff" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh position={[-3, H / 2, WALL_Z - W / 2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[W, H]} /><meshStandardMaterial color={wall} roughness={0.95} /></mesh>
      <mesh position={[3.2, H / 2, WALL_Z - W / 2]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[W, H]} /><meshStandardMaterial color={wall} roughness={0.95} /></mesh>

      {/* Furniture */}
      <group position={[-0.9, 0, 2.3]}><TvStand /></group>
      <group position={[-0.9, 0.47, 2.32]} scale={mix(1, 1.9, tvGrow)}>
        <Television on={tvGrow > 0.5 || night ? 1 : 0} size={1.0} screen={tvGrow > 0.5 ? screen : '#5a9ad6'} />
      </group>
      {tvGrow > 0.5 && <pointLight position={[-0.9, 1.6, 1.6]} intensity={night ? 2.2 : 0.8} distance={5} color={screen} />}
      <group position={[0.2, 0, -1.6]} rotation={[0, Math.PI, 0]}><Sofa color="#5a4a7a" /></group>
      <group position={[-0.4, 0.003, 0.3]}><Rug color="#2f5d6e" border="#e8c45a" w={2.6} d={1.8} /></group>
      <group position={[2.85, 0, 1.6]} rotation={[0, -Math.PI / 2, 0]}><Bookshelf width={1.3} /></group>
      <group position={[2.6, 0, -0.6]}><FloorLamp lit={night ? 1 : 0} /></group>
      <group position={[-2.6, 0, 2.2]}><PottedPlant size={1.2} /></group>
      <group position={[0.2, 2.2, WALL_Z - 0.06]}><WallClock time={t < NIGHT ? 14 + t / 20 : t < 64.8 ? 22 + (t - NIGHT) / 16 : 12} /></group>
      {/* Shopping boxes after he quits */}
      {t > TV - 0.4 && [[0.9, 0.2, 1.7], [1.3, 0.2, 1.9], [1.1, 0.55, 1.8]].map((p, i) => (
        <Block key={i} p={p as V3} s={[0.45, 0.38, 0.4]} r={[0, i * 0.3, 0]} c="#c9a06a" />
      ))}
      {/* Front door on the left wall, with light leaking under it from midnight */}
      <group position={DOOR_AT} rotation={[0, -Math.PI / 2, 0]}>
        <FrontDoor open={smooth(DOOR_OPEN, DOOR_OPEN + 0.8, t)} />
      </group>
      {t > 64.4 && (
        <>
          <Block p={[-2.99, 0.012, DOOR_AT[2]]} s={[0.03, 0.02, 0.84]} c="#ffffff" e="#ffffff" ei={2 + 0.6 * Math.sin(t * 17)} />
          {/* Two shadows of feet waiting behind the door */}
          {t > BELL - 1 && [-0.14, 0.14].map((dz) => <Block key={dz} p={[-2.985, 0.014, DOOR_AT[2] + dz]} s={[0.035, 0.022, 0.12]} c="#111111" />)}
          <pointLight position={[-3.6, 1.2, DOOR_AT[2]]} intensity={smooth(DOOR_OPEN, DOOR_OPEN + 0.6, t) * 25} distance={7} color="#ffffff" />
        </>
      )}
    </group>
  );
};

/** Plain dark front door (front faces -z), hinged on its left edge, with a peephole and a brass handle. */
export const FrontDoor: React.FC<{open: number}> = ({open}) => (
  <group>
    {[-1, 1].map((s) => <Block key={s} p={[s * 0.48, 1.07, 0]} s={[0.08, 2.14, 0.14]} c="#e8e0d0" />)}
    <Block p={[0, 2.16, 0]} s={[1.04, 0.08, 0.14]} c="#e8e0d0" />
    <group position={[-0.44, 0, 0]} rotation={[0, 1.7 * open, 0]}>
      <Block p={[0.44, 1.05, 0]} s={[0.88, 2.08, 0.05]} c="#4a2e20" />
      <Block p={[0.44, 1.05, -0.03]} s={[0.7, 1.8, 0.01]} c="#3e261a" />
      <Block p={[0.8, 1.02, -0.05]} s={[0.12, 0.03, 0.03]} c="#c9a45a" metal />
      <Block p={[0.44, 1.6, -0.03]} s={[0.03, 0.03, 0.02]} c="#c9a45a" metal />
    </group>
  </group>
);

/** Phone in Marc's hand (model units); the screen faces him (+z) and glows. */
export const Phone: React.FC<{p: V3; glow: number}> = ({p, glow}) => (
  <group position={[p[0] - 0.02, p[1] + 0.07, p[2] + 0.02]} rotation={[-0.35, 0, 0]}>
    <Block p={[0, 0, 0]} s={[0.1, 0.19, 0.015]} c="#1d1d1f" />
    <Block p={[0, 0, 0.009]} s={[0.088, 0.17, 0.002]} c="#7fb8ff" e="#7fb8ff" ei={0.5 + 1.5 * glow} />
    {glow > 0 && <pointLight position={[0, 0, 0.25]} intensity={1.2 * glow} distance={1.6} color="#a8ccff" />}
  </group>
);

// ---------- Marc over time ----------
type Pose = {pos: V3; yaw: number; right?: V3; left?: V3; smile: number; cold: number; phone: boolean; walk: number};
const CENTER: V3 = [0, 0, 0.3];
const WINDOW_SPOT: V3 = [1.6, 0, 2.0];
const DOOR_SPOT: V3 = [-2.1, 0, 0.2];
const HOLD: V3 = [0.12, 1.28, -0.32];
const EAR: V3 = [0.2, 1.84, -0.04];
const marcAt = (t: number): Pose => {
  if (t < CALL[0]) return {pos: CENTER, yaw: 0, right: HOLD, smile: t > 0.8 && t < 4.2 ? 0 : 1, cold: t > 0.8 && t < 3.5 ? 0.3 : 0, phone: true, walk: 0};
  if (t < CALL[1]) {
    const k = smooth(CALL[0], CALL[0] + 0.5, t) * (1 - smooth(CALL[1] - 0.6, CALL[1], t));
    return {pos: CENTER, yaw: 0, right: mixV(HOLD, EAR, k), smile: 0, cold: 0, phone: true, walk: 0};
  }
  if (t < TV - 0.3) return {pos: CENTER, yaw: 0, right: HOLD, smile: 1, cold: 0, phone: true, walk: 0};
  if (t < TV + 1.6) {
    // Arms up: the giant TV!
    const up = smooth(TV - 0.3, TV, t) * (1 - smooth(TV + 1.2, TV + 1.6, t));
    return {pos: CENTER, yaw: 0, right: mixV(HOLD, [0.42, 2.15, -0.1], up), left: mixV([-0.3, 0.94, 0], [-0.42, 2.15, -0.1], up), smile: 1.5, cold: 0, phone: true, walk: 0};
  }
  if (t < NIGHT) return {pos: CENTER, yaw: 0, right: HOLD, smile: 1, cold: 0, phone: true, walk: 0};
  if (t < 40.2) return {pos: WINDOW_SPOT, yaw: Math.PI, smile: 0, cold: 0.2, phone: false, walk: 0, left: [-0.25, 1.3, -0.25]};
  if (t < 64.6) {
    const worry = smooth(MSG[0], MSG[0] + 0.5, t);
    return {pos: CENTER, yaw: 0, right: HOLD, smile: 0, cold: 0.25 * worry, phone: true, walk: 0};
  }
  // Midnight: walks to the door and stares at it.
  const k = smooth(64.6, 66.2, t);
  return {pos: mixV(CENTER, DOOR_SPOT, k), yaw: mix(0, Math.PI / 2, smooth(64.6, 65.2, t)), right: HOLD, smile: 0, cold: 0.5, phone: true, walk: k > 0 && k < 1 ? 1 : 0};
};

// ---------- Camera ----------
const Rig: React.FC<{pos: THREE.Vector3; target: THREE.Vector3; fov: number}> = ({pos, target, fov}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
    camera.fov = fov;
    camera.near = 0.02;
    camera.far = 120;
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

type View = {pos: THREE.Vector3; target: THREE.Vector3; fov: number};
type Shot = ShotOf<View>;
export const SHOTS: Shot[] = [
  // Hook: Marc stares at his phone.
  {from: 0, view: (t, k) => ({pos: V(mix(0.4, 0.3, k), 1.62, mix(-1.3, -1.0, k)), target: V(0.05, 1.45, 0.3), fov: 50})},
  // Month 1: his living room.
  {from: 4.6, view: (t, k) => ({pos: V(mix(1.6, 1.3, k), 1.7, mix(-3.3, -3.0, k)), target: V(0, 1.1, 0.9), fov: 50})},
  // He calls Orion.
  {from: CALL[0], view: (t, k) => ({pos: V(mix(-0.45, -0.35, k), 1.72, mix(-0.95, -0.8, k)), target: V(0, 1.62, 0.3), fov: 50})},
  // Month 2.
  {from: 16.0, view: (t, k) => ({pos: V(mix(0.7, 0.55, k), 1.5, mix(-2.0, -1.8, k)), target: V(0, 1.25, 0.4), fov: 50})},
  // He quits and buys a giant TV.
  {from: 21.8, view: (t, k) => ({pos: V(mix(1.0, 0.85, k), 1.6, mix(-3.0, -2.8, k)), target: V(-0.45, 1.3, 1.2), fov: 50})},
  // Month 6.
  {from: 28.0, view: (t, k) => ({pos: V(mix(-0.4, -0.25, k), 1.5, mix(-2.3, -2.0, k)), target: V(0, 1.3, 0.5), fov: 50})},
  // Night: Marc at the window.
  {from: NIGHT, view: (t, k) => ({pos: V(mix(0.85, 0.95, k), 1.65, mix(0.0, 0.3, k)), target: V(1.6, 1.3, 2.6), fov: 50})},
  // The black car below, engine running.
  {from: 36.8, view: (t, k) => ({pos: V(1.6, 1.9, 2.8), target: V(mix(1.65, 1.7, k), STREET_Y, mix(7.6, 8.5, k)), fov: mix(55, 38, k)})},
  // Reminder about money received by mistake.
  {from: 40.2, view: (t, k) => ({pos: V(mix(1.3, 1.1, k), 1.7, -2.8), target: V(0, 1.1, 0.6), fov: 50})},
  // Month 12.
  {from: 47.0, view: (t, k) => ({pos: V(mix(0.45, 0.35, k), 1.55, mix(-1.7, -1.5, k)), target: V(0, 1.35, 0.3), fov: 50})},
  // The message: his face lit by the phone.
  {from: 53.2, view: (t, k) => ({pos: V(0.1, 1.66, mix(-0.62, -0.5, k)), target: V(0, 1.6, 0.3), fov: 50})},
  // Over his shoulder.
  {from: 58.6, view: (t, k) => ({pos: V(0.25, 1.9, mix(0.85, 0.75, k)), target: V(0.06, 1.3, -0.1), fov: 50})},
  // Midnight: the door.
  {from: 64.6, view: (t, k) => ({pos: V(mix(-0.7, -1.0, k), 1.6, mix(-0.7, -0.5, k)), target: V(-3, 1.1, 0.2), fov: 50})},
];
export const CUTS = cutsOf(SHOTS);

const shotAt = (t: number): View => shotAtOf(SHOTS, t, DURATION);

// ---------- Scene ----------
export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const view = shotAt(t);
  const night = nightAt(t);
  const m = marcAt(t);
  const glow = m.phone ? (PAYMENTS.concat(MSG).some((p) => t >= p && t < p + 2.5) || (night && t >= MSG[0]) ? 1 : 0.3) : 0;
  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} />
      <color attach="background" args={[night ? '#0b1430' : '#9ccbee']} />
      <hemisphereLight color={night ? '#5a6aa0' : '#fff7ea'} groundColor={night ? '#2a2230' : '#8a6a4a'} intensity={night ? 0.45 : 1.0} />
      <directionalLight color={night ? '#8aa0d8' : '#fff2dc'} intensity={night ? 0.35 : 1.9} position={[3.5, 5, 6]} />
      <directionalLight color="#c9dcff" intensity={night ? 0.15 : 0.45} position={[-4, 3, -5]} />
      <Outside night={night} />
      <Apartment t={t} night={night} />
      <group position={m.pos} rotation={[0, m.yaw, 0]}>
        <group scale={S}>
          <Marc t={t} walk={m.walk} cold={m.cold} smile={m.smile} rightHand={m.right} leftHand={m.left} />
          {m.phone && m.right && <Phone p={m.right} glow={glow} />}
        </group>
      </group>
    </>
  );
};
