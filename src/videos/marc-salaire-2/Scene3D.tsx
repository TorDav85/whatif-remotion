import React, {useLayoutEffect, useMemo, useState} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {continueRender, delayRender, staticFile} from 'remotion';
import {clamp01, smooth} from '../../core/animation';
import {Block, Cyl, seeded} from '../../assets/kit';
import {Car} from '../../assets/Car';
import {OfficeChair} from '../../assets/interior';
import {Person} from '../../assets/Person';
import {Marc} from '../../shared/characters/Marc';
import {Apartment, CAR_AT, DOOR_AT, Outside, STREET_Y} from '../marc-salaire/Scene3D';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

// ---------- Story clock (s). Mirrored in scripts/audio/marc-salaire-2.py ----------
export const STREET = 16.0;
export const CAR_DOOR = 18.0;
export const DRIVE: [number, number] = [22.0, 28.8];
export const LIFT = 31.6;
export const LIFT_CLOSE = 36.0;
export const ROOM = 40.6;
export const CHAIR: [number, number] = [61.0, 64.6];
export const BLACK = 70.8;
export const DURATION = 79;

const MODEL_H = 2.06;
const S = 1.8 / MODEL_H;

// ---------- Textures for the screen wall (frames from Marc's earlier videos) ----------
export const SCREEN_COUNT = 16;
/** Loads the screen frames once, holding the render until they are ready. Must be called inside the canvas. */
export const useScreenTextures = () => {
  const [handle] = useState(() => delayRender('screen textures'));
  // ThreeCanvas only draws when the frame changes: draw again once the pictures have arrived.
  const advance = useThree((s) => s.advance);
  return useMemo(() => {
    let left = SCREEN_COUNT;
    const loader = new THREE.TextureLoader();
    return Array.from({length: SCREEN_COUNT}, (_, i) => {
      const tex = loader.load(staticFile(`marc-salaire-2/screens/s${i}.jpg`), () => {
        left -= 1;
        if (left === 0) {
          advance(performance.now());
          continueRender(handle);
        }
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    });
  }, [handle, advance]);
};

// ---------- The screen room (shared with part 3) ----------
const WALL_Z = 3.2;
const COLS = 7;
const ROWS = 4;
/** Wall of monitors, each showing a frame of Marc; they flicker a little. `lit` raises the room lights (part 3). */
export const ScreenRoom: React.FC<{t: number; textures: THREE.Texture[]; lit?: number}> = ({t, textures, lit = 0}) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[14, 14]} /><meshStandardMaterial color="#14161c" roughness={0.35} metalness={0.4} /></mesh>
    <mesh position={[0, 5, WALL_Z + 0.2]} rotation={[0, Math.PI, 0]}><planeGeometry args={[14, 10]} /><meshStandardMaterial color="#0c0d11" /></mesh>
    {[-5, 5].map((x) => <mesh key={x} position={[x, 3, 0]} rotation={[0, -Math.sign(x) * Math.PI / 2, 0]}><planeGeometry args={[14, 6]} /><meshStandardMaterial color="#0e1015" /></mesh>)}
    <mesh position={[0, 5.5, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[14, 14]} /><meshStandardMaterial color="#0a0b0e" /></mesh>
    {Array.from({length: COLS * ROWS}, (_, i) => {
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      const x = (c - (COLS - 1) / 2) * 1.18;
      const y = 0.75 + r * 0.72;
      const flick = 0.8 + 0.2 * Math.sin(t * (3 + (i % 5)) + i * 1.7);
      // Turn the outer screens slightly toward the centre, like a control room.
      const yaw = -x * 0.06;
      return (
        <group key={i} position={[x, y, WALL_Z - Math.abs(x) * 0.08]} rotation={[0, Math.PI + yaw, 0]}>
          <Block p={[0, 0, 0.02]} s={[1.12, 0.66, 0.05]} c="#1b1d22" />
          {/* The group faces -z (toward the room), so the picture sits in front of the bezel, on local +z. */}
          <mesh position={[0, 0, 0.047]}>
            <planeGeometry args={[1.04, 0.585]} />
            <meshBasicMaterial map={textures[(i * 5 + 3) % SCREEN_COUNT]} color={new THREE.Color(flick, flick, flick)} toneMapped={false} />
          </mesh>
          {/* REC light */}
          <Block p={[0.45, 0.24, 0.05]} s={[0.035, 0.035, 0.01]} c="#ff2a2a" e="#ff2a2a" ei={Math.sin(t * 4 + i) > 0 ? 2 : 0.2} />
        </group>
      );
    })}
    {/* The glow of the wall onto the room */}
    <pointLight position={[0, 2.2, WALL_Z - 1.2]} intensity={14 + 30 * lit} distance={12} decay={1.4} color="#bcd6ff" />
    {/* Control desk in front of the chair */}
    <Block p={[0, 0.45, 2.55]} s={[3.2, 0.06, 0.8]} c="#23262d" />
    {[-1.5, 1.5].map((x) => <Block key={x} p={[x, 0.22, 2.55]} s={[0.08, 0.44, 0.7]} c="#23262d" />)}
    {[-0.9, 0, 0.9].map((x) => (
      <Block key={x} p={[x, 0.49, 2.6]} s={[0.5, 0.02, 0.25]} c="#2e323a" e="#4a8cff" ei={0.15} />
    ))}
  </group>
);

/** The boss's chair: a seated figure, black silhouette in part 2, revealed in part 3. */
export const BossChair: React.FC<{turn: number; look?: {shirt: string; pants: string; skin: string; hair: string}; glint?: number; tie?: boolean; children?: React.ReactNode}> = ({turn, look, glint = 0, tie = false, children}) => {
  const L = look ?? {shirt: '#0b0b0e', pants: '#0b0b0e', skin: '#0d0d10', hair: '#08080a'};
  return (
    <group position={[0, 0, 1.75]} rotation={[0, Math.PI * (1 - turn), 0]}>
      <group scale={1.35}><OfficeChair color="#111216" /></group>
      <group position={[0, 0.12, 0.05]}>
        <Person shirt={L.shirt} pants={L.pants} skin={L.skin} hair={L.hair} pose="assis" />
        {/* Sunglasses, with a glint */}
        <group position={[0, 0.48 + 0.8 * 1, -0.122]}>
          <Block p={[0, 0, 0]} s={[0.24, 0.045, 0.02]} c="#050505" e="#ffffff" ei={glint} />
        </group>
        {tie && (
          <>
            <Block p={[0, 0.98, -0.137]} s={[0.12, 0.16, 0.01]} c="#f2f0ea" />
            <Block p={[0, 0.9, -0.142]} s={[0.05, 0.26, 0.01]} c="#c0282a" />
          </>
        )}
        {children}
      </group>
    </group>
  );
};

// ---------- Other sets ----------
/** Corridor outside Marc's front door (x < -3). */
const Hallway: React.FC<{t: number}> = ({t}) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.6, 0.001, 0.2]}><planeGeometry args={[3.2, 3]} /><meshStandardMaterial color="#8a8478" roughness={0.8} /></mesh>
    <mesh position={[-4.6, 1.5, 1.7]} rotation={[0, Math.PI, 0]}><planeGeometry args={[3.2, 3]} /><meshStandardMaterial color="#b9b1a0" /></mesh>
    <mesh position={[-4.6, 1.5, -1.3]}><planeGeometry args={[3.2, 3]} /><meshStandardMaterial color="#b9b1a0" /></mesh>
    <mesh position={[-6.2, 1.5, 0.2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[3, 3]} /><meshStandardMaterial color="#a39b8a" /></mesh>
    <mesh position={[-4.6, 3, 0.2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[3.2, 3]} /><meshStandardMaterial color="#d8d2c4" /></mesh>
    <Block p={[-4.4, 2.96, 0.2]} s={[0.4, 0.05, 0.4]} c="#fff8e0" e="#fff1c8" ei={1.6 + 0.4 * Math.sin(t * 23)} />
  </group>
);

/** Night street, scrolling past the car (the car stays at the origin). */
const BUILDINGS = (() => {
  const r = seeded(91);
  return Array.from({length: 14}, (_, i) => ({x: i * 6, h: 8 + r() * 14, w: 5 + r() * 0.8, side: i % 2 ? 1 : -1, lights: Array.from({length: 24}, () => r() > 0.55)}));
})();
const DriveSet: React.FC<{t: number}> = ({t}) => {
  const period = 84;
  const off = (t * 16) % period;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[200, 60]} /><meshStandardMaterial color="#34363d" roughness={0.6} metalness={0.2} /></mesh>
      {Array.from({length: 24}, (_, i) => {
        const x = ((i * 4 - off * 1) % 96) - 48;
        return <Block key={i} p={[x, 0.01, 0]} s={[2, 0.01, 0.12]} c="#d8d2c0" />;
      })}
      {[-1, 1].map((side) => <Block key={side} p={[0, 0.08, side * 4.2]} s={[200, 0.16, 2]} c="#3a3c42" />)}
      {[-1, 1].flatMap((side) => BUILDINGS.map((b, i) => {
        const x = ((b.x - off + period * 10) % period) - period / 2;
        return (
          <group key={`${side}${i}`} position={[x, 0, side * 9]}>
            <Block p={[0, b.h / 2, 0]} s={[b.w, b.h, 5]} c="#262a33" />
            {b.lights.map((on, k) => (
              <Block key={k} p={[-b.w / 2 + 0.7 + (k % 4) * 1.2, 1.6 + Math.floor(k / 4) * 2.2, -side * 2.52]} s={[0.7, 1.0, 0.02]} c={on ? '#ffd27a' : '#141720'} e="#ffc860" ei={on ? 1.3 : 0} />
            ))}
          </group>
        );
      }))}
      {/* Streetlights, and their light pools sweeping over the car */}
      {Array.from({length: 8}, (_, i) => {
        const x = ((i * 12 - off + period * 10) % 96) - 48;
        return (
          <group key={`l${i}`} position={[x, 0, -3.4]}>
            <Block p={[0, 2.3, 0]} s={[0.1, 4.6, 0.1]} c="#2a2d31" />
            <Block p={[0, 4.6, 0.6]} s={[0.4, 0.08, 1.3]} c="#2a2d31" />
            <Block p={[0, 4.54, 1.0]} s={[0.3, 0.04, 0.4]} c="#fff1c8" e="#ffd27a" ei={2.2} />
          </group>
        );
      })}
      <pointLight position={[((-off * 1) % 12) + 6, 4.4, -2.4]} intensity={160} distance={14} decay={1.5} color="#ffd9a0" />
      <pointLight position={[0, 3.5, -3]} intensity={40} distance={9} decay={1.5} color="#9fb4ff" />
      <hemisphereLight color="#5a6ab0" groundColor="#1a1622" intensity={1.0} />
      <directionalLight color="#8aa0e0" intensity={0.6} position={[-3, 6, -5]} />
      <group rotation={[0, Math.PI / 2, 0]}><Car color="#2a2d36" lights={1} wheelSpin={-t * 20} /></group>
    </group>
  );
};

/** Empty office tower: one lit lobby at the bottom. */
const TowerSet: React.FC<{t: number}> = ({t}) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[80, 80]} /><meshStandardMaterial color="#202228" roughness={0.9} /></mesh>
    <Block p={[0, 22, 12]} s={[10, 44, 10]} c="#475069" />
    {Array.from({length: 13 * 6}, (_, i) => (
      <Block key={i} p={[-4 + (i % 6) * 1.6, 4 + Math.floor(i / 6) * 3, 6.97]} s={[1.1, 2.1, 0.02]} c="#0f1118" />
    ))}
    <Block p={[0, 1.4, 6.96]} s={[3.2, 2.8, 0.03]} c="#fff4d8" e="#ffe8b0" ei={1.4} />
    <pointLight position={[0, 1.6, 5.8]} intensity={60} distance={10} decay={1.5} color="#ffe8b0" />
    <hemisphereLight color="#5a6ab0" groundColor="#1a1622" intensity={1.0} />
    <directionalLight color="#9fb0e8" intensity={0.8} position={[-6, 10, -6]} />
    <group position={[-2.6, 0, 2.5]}><Car color="#2a2d36" lights={1} /></group>
  </group>
);

/** Elevator cabin (opening toward -z) with sliding doors. */
const LiftSet: React.FC<{t: number}> = ({t}) => {
  const close = smooth(LIFT_CLOSE, LIFT_CLOSE + 0.9, t) * (1 - smooth(ROOM - 0.4, ROOM + 0.4, t));
  const flicker = t > 37 ? 0.85 + 0.15 * Math.sin(t * 31) * Math.sin(t * 7) : 1;
  return (
    <group>
      <Block p={[0, -0.02, 0.8]} s={[1.8, 0.04, 1.8]} c="#4a4f57" metal />
      <Block p={[0, 2.5, 0.8]} s={[1.8, 0.04, 1.8]} c="#b8bec6" e="#ffffff" ei={0.3 * flicker} />
      {[-0.9, 0.9].map((x) => <Block key={x} p={[x, 1.25, 0.8]} s={[0.04, 2.5, 1.8]} c="#9aa1aa" metal />)}
      <Block p={[0, 1.25, 1.7]} s={[1.8, 2.5, 0.04]} c="#8a9199" metal />
      <Block p={[0, 1.0, 1.66]} s={[1.75, 0.04, 0.04]} c="#c9ced4" metal />
      {/* Button panel with a single red button */}
      <Block p={[0.86, 1.2, 0.2]} s={[0.02, 0.5, 0.18]} c="#2a2d31" />
      <Cyl p={[0.84, 1.2, 0.2]} rad={0.035} h={0.02} r={[0, 0, Math.PI / 2]} c="#ff3030" e="#ff2020" ei={1.8} />
      {/* Doors */}
      {[-1, 1].map((s) => <Block key={s} p={[s * (0.45 + 0.45 * (1 - close)) - s * 0.0, 1.25, -0.08]} s={[0.9, 2.5, 0.04]} c="#a8afb8" metal />)}
      <pointLight position={[0, 2.3, 0.8]} intensity={6 * flicker} distance={4} color="#fff6e6" />
      <hemisphereLight color="#d8dce4" groundColor="#3a3c42" intensity={0.3} />
    </group>
  );
};

// ---------- Marc ----------
type Pose = {pos: V3; yaw: number; walk: number; right?: V3; cold: number; show: boolean};
const marcAt = (t: number): Pose => {
  if (t < STREET) {
    const pick = smooth(8.2, 9.0, t);
    return {pos: mixV([-1.9, 0, 0.75], [-2.5, 0, 0.3], pick), yaw: Math.PI / 2 - 0.3, walk: pick > 0 && pick < 1 ? 1 : 0, cold: 0.4, show: true,
      right: t > 9.0 ? [0.1, 1.35, -0.32] : undefined};
  }
  if (t < DRIVE[0]) {
    const k = smooth(STREET + 0.3, 20.6, t);
    return {pos: mixV([-1.4, STREET_Y, 4.6], [1.1, STREET_Y, 7.4], k), yaw: Math.PI - 0.4, walk: k > 0 && k < 1 ? 1 : 0, cold: 0.2, show: t < 20.9};
  }
  if (t < LIFT) {
    const k = smooth(30.0, 31.5, t);
    return {pos: mixV([-1.4, 0, 3.4], [0, 0, 6.2], k), yaw: Math.PI - 0.2, walk: k > 0 && k < 1 ? 1 : 0, cold: 0, show: t > DRIVE[1] + 0.6};
  }
  if (t < ROOM) return {pos: [0, 0, 1.0], yaw: 0, walk: 0, cold: 0.3, show: true, right: t > 33.6 && t < 35.2 ? [0.62, 1.4, 0.95] : undefined};
  // The screen room: walks in, then stands still facing the wall.
  const k = smooth(ROOM + 0.4, 44.5, t);
  return {pos: mixV([0, 0, -3.2], [0, 0, -1.3], k), yaw: Math.PI, walk: k > 0 && k < 1 ? 1 : 0, cold: t > CHAIR[0] ? 0.6 : 0.2, show: true};
};

// ---------- Camera ----------
const Rig: React.FC<{pos: THREE.Vector3; target: THREE.Vector3; fov: number}> = ({pos, target, fov}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
    camera.fov = fov;
    camera.near = 0.02;
    camera.far = 200;
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

type View = {pos: THREE.Vector3; target: THREE.Vector3; fov: number};
type Shot = {from: number; view: (t: number, k: number) => View};
export const SHOTS: Shot[] = [
  // The door opens on the empty landing.
  {from: 0, view: (t, k) => ({pos: V(mix(-5.6, -5.0, k), 1.55, mix(0.5, 0.4, k)), target: V(-2.2, 1.35, 0.55), fov: 50})},
  // The black envelope on the floor.
  {from: 5.0, view: (t, k) => ({pos: V(mix(-4.3, -4.1, k), mix(1.6, 1.3, k), mix(-0.5, -0.3, k)), target: V(-3.2, 0.1, 0.3), fov: 50})},
  // The card: Marc's face.
  {from: 10.6, view: (t, k) => ({pos: V(-2.5 - 0.55, 1.62, mix(-0.05, 0.05, k)), target: V(-2.5, 1.58, 0.2), fov: 50})},
  // The street: the car's door opens by itself.
  {from: STREET, view: (t, k) => ({pos: V(mix(-2.4, -2.0, k), STREET_Y + 1.5, mix(2.9, 3.3, k)), target: V(0.8, STREET_Y + 0.9, 7.6), fov: 50})},
  // Driving through the city.
  {from: DRIVE[0], view: (t, k) => ({pos: V(mix(-5.5, -4.5, k), mix(1.4, 1.0, k), mix(-6.0, -5.2, k)), target: V(0.5, 0.8, 0), fov: 50})},
  // Close on the car passing under the streetlights.
  {from: 25.4, view: (t, k) => ({pos: V(mix(3.5, 2.8, k), 1.1, mix(-3.4, -3.0, k)), target: V(0, 0.9, 0), fov: 50})},
  // The empty tower, from below.
  {from: DRIVE[1], view: (t, k) => ({pos: V(mix(-4.5, -4.0, k), 0.8, mix(-4.5, -4.0, k)), target: V(0, mix(5, 9, k), 8), fov: 55})},
  // The lift: one button.
  {from: LIFT, view: (t, k) => ({pos: V(0, 1.55, mix(-2.0, -1.7, k)), target: V(0, 1.35, 1.0), fov: 50})},
  // Inside, going down.
  {from: 36.6, view: (t, k) => ({pos: V(-0.6, 2.0, 0.05), target: V(0.1, 1.45, 1.1), fov: 60})},
  // The doors open on the screens; Marc from behind.
  {from: ROOM, view: (t, k) => ({pos: V(mix(0.3, 0.1, k), 1.7, mix(-5.4, -4.6, k)), target: V(0, 1.75, 2.5), fov: 55})},
  // The screens, closer.
  {from: 47.0, view: (t, k) => ({pos: V(mix(-1.6, -1.2, k), 1.9, mix(-0.6, -0.2, k)), target: V(0.4, 1.6, 3.2), fov: 50})},
  // Reminder (wide).
  {from: 53.4, view: (t, k) => ({pos: V(mix(1.6, 1.2, k), 2.3, -5.0), target: V(0, 1.4, 1.8), fov: 55})},
  // The chair turns.
  {from: 60.2, view: (t, k) => ({pos: V(mix(0.7, 0.5, k), 1.25, mix(-0.9, -0.6, k)), target: V(0, 1.05, 1.8), fov: 50})},
  // The silhouette.
  {from: 66.2, view: (t, k) => ({pos: V(0.15, 1.35, mix(0.35, 0.55, k)), target: V(0, 1.32, 1.75), fov: 50})},
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
  const textures = useScreenTextures();
  const view = shotAt(t);
  const m = marcAt(t);
  // The flat's door: continues opening from the end of part 1.
  const homeT = 68.6 + 0.8 * smooth(0.2, 1.4, t);
  const carDoor = smooth(CAR_DOOR, CAR_DOOR + 0.8, t) * (1 - smooth(21.0, 21.4, t));
  const marc = m.show && (
    <group position={m.pos} rotation={[0, m.yaw, 0]}>
      <group scale={S}>
        <Marc t={t} walk={m.walk} cold={m.cold} rightHand={m.right} />
        {m.right && t < STREET && <Block p={[m.right[0], m.right[1] + 0.05, m.right[2] - 0.04]} s={[0.26, 0.17, 0.01]} r={[-0.5, 0, 0]} c="#0d0d0f" />}
      </group>
    </group>
  );
  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} />
      <color attach="background" args={['#0b1430']} />
      {t < STREET && (
        <>
          <hemisphereLight color="#5a6aa0" groundColor="#2a2230" intensity={0.45} />
          <directionalLight color="#8aa0d8" intensity={0.35} position={[3.5, 5, 6]} />
          <Apartment t={homeT} night={1} />
          <Hallway t={t} />
          {t < 8.9 && <Block p={[-3.4, 0.008, 0.2]} s={[0.26, 0.01, 0.18]} r={[0, 0.3, 0]} c="#0d0d0f" />}
          {t < 8.9 && <Block p={[-3.4, 0.015, 0.2]} s={[0.05, 0.002, 0.05]} c="#c9a45a" metal />}
          {marc}
        </>
      )}
      {t >= STREET && t < DRIVE[0] && (
        <>
          <hemisphereLight color="#5a6aa0" groundColor="#2a2230" intensity={0.45} />
          <Outside night={1} />
          {/* The rear door swinging open by itself */}
          <group position={[CAR_AT[0] - 0.2, STREET_Y + 0.3, CAR_AT[2] - 0.9]} rotation={[0, -1.1 * carDoor, 0]}>
            <Block p={[-0.5, 0.45, 0]} s={[1.0, 0.9, 0.05]} c="#121316" />
          </group>
          {carDoor > 0.05 && <pointLight position={[CAR_AT[0], STREET_Y + 1.0, CAR_AT[2] - 0.3]} intensity={3} distance={2.5} color="#ffe2b0" />}
          {marc}
        </>
      )}
      {t >= DRIVE[0] && t < DRIVE[1] && <DriveSet t={t} />}
      {t >= DRIVE[1] && t < LIFT && (<><TowerSet t={t} />{marc}</>)}
      {t >= LIFT && t < ROOM && (<><LiftSet t={t} />{marc}</>)}
      {t >= ROOM && (
        <>
          <hemisphereLight color="#4a5a90" groundColor="#0a0a10" intensity={0.25} />
          <ScreenRoom t={t} textures={textures} />
          <BossChair turn={smooth(CHAIR[0], CHAIR[1], t)} glint={Math.max(0, 1 - Math.abs(t - 67.6) / 0.2) * 1.2} />
          {marc}
        </>
      )}
    </>
  );
};
