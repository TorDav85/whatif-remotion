import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Marc} from '../../shared/characters/Marc';
import {CameraRig} from '../../shared/three/common';
import {cutsOf, shotAt, type Shot} from '../../shared/three/shots';
import {environmentFor, resolveEpisodeSet, spot, ReferenceScene, type EpisodeSet, type Variants} from '../../assets/city/reference';
import {FalloutPlume, NuclearEffects, ShelterRoom} from './Effects3D';

/**
 * « Et si une bombe nucléaire tombait sur cette ville ? », filmed in the series' reference city.
 * Same edit, voice and effects as the bombe-nucleaire episode; the exterior shots use the places
 * rue-marc and place-centrale, the burst is north of the river, beyond the business towers' feet.
 * Distances, damage and timing are illustrative, not a calculation.
 */
type V3 = [number, number, number];
export type View = {pos: V3; target: V3; fov: number; shake?: number};

export const IMPACT = 8;
export const SHOCK = 18;
export const SHELTER = 34;
export const FALLOUT = 40;
export const END = 58.5;
export const BLACKOUT = END;
export const DURATION = 60;
/** Ground zero, north of the Seine: the centre is destroyed, rue-marc ~250 m away still stands. */
export const ORIGIN: V3 = [20, 0, -215];
/** The effects were drawn for a 120 m stage: scaled up for this city's distances. */
const EFFECT_SCALE = 2;

const lerp = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// Marc leaves his door on rue-marc and walks east along the pavement, then comes back to shelter.
const DOOR = spot('rue-marc', 'porte-immeuble');
const marcXAt = (t: number) => t < SHELTER ? DOOR.pos[0] + 0.9 * clamp01((t - 4) / 4) * 4 : lerp(DOOR.pos[0] + 3.6, DOOR.pos[0], (t - SHELTER - 0.4) / 3.6);

/** Which version of the world each shot sees: full detail for the aerials, the street's own detail otherwise. */
type Look = {view: (t: number, k: number) => View; full?: boolean};
const SHOTS: (Shot<View> & Look)[] = [
  // From above Marc's block, over the square and the river, towards the towers: the bomb falls there.
  {from: 0, full: true, view: (_, k) => ({pos: mixV([30, 55, 95], [26, 50, 86], k), target: [12, 24, -150], fov: 50})},
  // A familiar man leaving home: human scale before the catastrophe (rue-marc, east pavement).
  {from: 4, view: (t, k) => ({pos: mixV([22.5, 1.65, 30.5], [21.6, 1.65, 30.6], k), target: [marcXAt(t), 1.3, 31.8], fov: 46})},
  // The flash on the horizon, seen from above the roofs rather than through Marc's eyes.
  {from: IMPACT, full: true, view: (_, k) => ({pos: mixV([-10, 40, 70], [-12, 44, 73], k), target: [ORIGIN[0], 34, ORIGIN[2]], fov: 52, shake: 0.08})},
  // Heat: from the square, fires break out along the far facades and the quays.
  {from: 13, view: (_, k) => ({pos: mixV([1.5, 5, -4], [1.5, 5.2, -6.5], k), target: [1, 12, -40], fov: 54})},
  // The blast reaches rue-marc: Marc's windows burst over the street.
  {from: SHOCK, view: (t, k) => ({pos: mixV([6.5, 6.5, 18], [7, 7, 17], k), target: [12.4, 10, 33], fov: 52, shake: 0.14 + 0.26 * Math.exp(-(t - SHOCK) * 1.8)})},
  // Far enough back for the whole mushroom over the city.
  {from: 24, full: true, view: (_, k) => ({pos: mixV([90, 70, 120], [110, 82, 142], k), target: [ORIGIN[0], 70, ORIGIN[2]], fov: 50})},
  // The centre: across the river, the opposite bank is in ruins.
  {from: 29, full: true, view: (_, k) => ({pos: mixV([30, 16, -100], [26, 17, -104], k), target: [20, 5, -170], fov: 55, shake: 0.05})},
  // The periphery: the square and its blocks still stand under the dust.
  {from: 31.5, view: (_, k) => ({pos: mixV([-3, 4.2, 24], [-3, 4, 21], k), target: [5, 12, -100], fov: 55, shake: 0.05})},
  // Marc goes back to his building, still solid, to reach its basement.
  {from: SHELTER, view: (_, k) => ({pos: mixV([22, 1.65, 30.3], [20.5, 1.65, 30.5], k), target: [DOOR.pos[0] + 1, 1.8, 33], fov: 52})},
  // Explicitly qualitative aerial diagram: the plume drifts east (+x).
  {from: FALLOUT, full: true, view: (_, k) => ({pos: mixV([150, 330, 20], [168, 345, 14], k), target: [ORIGIN[0] + 110, 0, ORIGIN[2] + 10], fov: 54})},
  // Shelter interior: unchanged from the original episode (its own room, no window).
  {from: 46, view: (_, k) => ({pos: mixV([1.3, 1.72, -5.3], [1.2, 1.7, -5.1], k), target: [0.3, 1.4, 1.6], fov: 52})},
  {from: 48, view: (_, k) => ({pos: mixV([2, 1.65, 0.95], [1.95, 1.64, 1.02], k), target: [1.58, 1.53, 2.57], fov: 50})},
  {from: 50.5, view: (_, k) => ({pos: mixV([-1.4, 1.8, -1.15], [-1.35, 1.8, -1.0], k), target: [-0.7, 1.72, 0.5], fov: 43})},
  {from: 53.2, view: (_, k) => ({pos: mixV([0.2, 1.75, -0.8], [0.25, 1.73, -0.65], k), target: [0, 1.4, 2.9], fov: 50})},
  {from: 55.2, view: (_, k) => ({pos: mixV([-0.95, 1.3, 1.35], [-0.9, 1.3, 1.45], k), target: [-0.42, 1.16, 2.8], fov: 42})},
  {from: 57.2, view: (_, k) => ({pos: mixV([-0.08, 1.88, 1.65], [-0.06, 1.88, 1.8], k), target: [0, 1.9, 2.9], fov: 38})},
];
export const CUTS = cutsOf(SHOTS);

const shotIndexAt = (t: number) => {
  let i = SHOTS.length - 1;
  while (i > 0 && t < SHOTS[i].from) i--;
  return i;
};

export const viewAt = (t: number): View => {
  const view = shotAt(SHOTS, t, DURATION);
  const a = view.shake ?? 0;
  if (!a) return view;
  const distance = Math.hypot(...view.target.map((v, i) => v - view.pos[i]));
  return {...view, target: [view.target[0] + Math.sin(t * 31.3) * a * distance * 0.008,
    view.target[1] + Math.sin(t * 24.7 + 2) * a * distance * 0.006, view.target[2]]};
};

// ——— Episode variants of the reference city (the frozen world is never modified) ———
const DAMAGE: Variants['damage'] = [{center: [ORIGIN[0], ORIGIN[2]], radius: 200, level: 1}];
const HAZE: Variants['sky'] = {top: '#7d98ad', bottom: '#d9d3c2', fogNear: 160, fogFar: 900};
const DUST: Variants['sky'] = {top: '#65727a', bottom: '#c3baa7', sunI: 1.2, hemi: 0.95, fogNear: 90, fogFar: 650};

const useSets = () => useMemo(() => {
  const make = (damaged: boolean, full: boolean) =>
    resolveEpisodeSet({place: 'rue-marc', variants: damaged ? {damage: DAMAGE} : {}, detailRadius: full ? Infinity : undefined});
  return {intact: make(false, false), intactFull: make(false, true), damaged: make(true, false), damagedFull: make(true, true),
    clear: environmentFor({}), haze: environmentFor({sky: HAZE}), dust: environmentFor({sky: DUST})};
}, []);

// ——— Story props ———
const SHARD = new THREE.TetrahedronGeometry(1, 0);
/** Marc's building windows burst towards the street (-z). */
const GlassBlast: React.FC<{t: number}> = ({t}) => {
  const d = t - SHOCK;
  if (d < 0 || d > 3) return null;
  return <group>
    {Array.from({length: 72}, (_, i) => {
      const phase = (i * 7.31) % 1;
      const a = i * 2.4;
      const elapsed = Math.max(0, d - phase * 0.4);
      const x = 6 + (i % 9) * 1.6 + Math.sin(a) * elapsed * 1.5;
      const y = Math.max(0.12, 7.3 + (Math.floor(i / 9) % 6) * 3.1 - elapsed * elapsed * 3.5);
      const z = 32.8 - elapsed * (2 + phase * 4);
      return <mesh key={i} geometry={SHARD} position={[x, y, z]} rotation={[d * 2 + i, d * 3 + a, a]} scale={[0.3, 0.5, 0.08]}>
        <meshStandardMaterial color="#b3d4da" roughness={0.2} metalness={0.15} />
      </mesh>;
    })}
  </group>;
};

const FLAME = new THREE.IcosahedronGeometry(1, 0);
// Windows catching fire on the square's north facades (their front faces +z at z = -33) and beyond the river.
const FIRE_POINTS: V3[] = [[-12.4, 11.1, -32.4], [4.6, 8.0, -32.4], [14.4, 14.2, -32.4], [-3.4, 17.3, -32.4], [-22, 9, -161.3], [46, 9, -161.3]];
const Fires: React.FC<{t: number}> = ({t}) => {
  const grow = smooth(12.6, 16, t);
  if (!grow) return null;
  return <group>
    {FIRE_POINTS.map(([x, y, z], i) => <group key={i} position={[x, y, z]}>
      {[0, 1, 2].map((k) => {
        const f = (0.85 + 0.15 * Math.sin(t * (5 + k) + i * 2)) * grow;
        return <mesh key={k} geometry={FLAME} position={[(k - 1) * 0.55, 1.1 + k * 0.45, 0]}
          scale={[(0.7 - k * 0.11) * f, (2.4 - k * 0.45) * f, (0.7 - k * 0.1) * f]}>
          <meshBasicMaterial color={k === 2 ? '#ffdc83' : k === 1 ? '#ff9d42' : '#cf5c2a'} />
        </mesh>;
      })}
      {[0, 1, 2].map((k) => <mesh key={`s${k}`} geometry={FLAME} position={[Math.sin(t * 0.4 + i + k) * 0.6, 4 + k * 1.8, 0]}
        scale={[1.3 + k * 0.5, 1.6 + k * 0.3, 1.4 + k * 0.4]}>
        <meshStandardMaterial color="#584c3e" transparent opacity={0.65 * grow} depthWrite={false} />
      </mesh>)}
    </group>)}
  </group>;
};

const FallingSilhouette: React.FC<{t: number}> = ({t}) => {
  if (t >= IMPACT) return null;
  const y = lerp(250, 6, Math.pow(clamp01(t / IMPACT), 1.65));
  return <mesh position={[ORIGIN[0], y, ORIGIN[2]]} rotation={[0, 0, 0.08]} scale={[1.7, 4.4, 1.7]}>
    <sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#303943" roughness={0.65} />
  </mesh>;
};

const StreetMarc: React.FC<{t: number}> = ({t}) => {
  if (t >= SHELTER + 4) return null;
  const inside = t >= SHELTER;
  // Out of his door, walking east; after the blast, back west to the door, then in (z > 33 is inside the walls).
  const x = marcXAt(t);
  const z = inside ? lerp(31.6, 33.6, (t - SHELTER - 3.4) / 0.6) : 31.6;
  const ry = inside ? (t > SHELTER + 3.4 ? Math.PI : Math.PI / 2) : -Math.PI / 2;
  const walking = (t >= 4 && t < IMPACT) || (inside && t > SHELTER + 0.4);
  return <group position={[x, 0.15, z]} rotation={[0, ry, 0]}>
    <Marc t={t} walk={walking ? 0.75 : 0} cold={t >= IMPACT ? 0.3 : 0} smile={t < IMPACT ? 0.1 : 0}
      leftHand={t >= IMPACT && t < SHOCK ? [-0.22, 1.86, -0.28] : undefined}
      rightHand={t >= IMPACT && t < SHOCK ? [0.22, 1.86, -0.28] : undefined} />
  </group>;
};

export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const view = viewAt(t);
  const interior = t >= 46;
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.near = interior ? 0.12 : 0.3;
    camera.far = interior ? 40 : 2600;
    camera.updateProjectionMatrix();
  }, [camera, interior, t]);
  const sets = useSets();
  const shot = SHOTS[shotIndexAt(t)];
  // Damage appears behind the shock's dust; the sky turns dusty after the blast.
  const damaged = t >= SHOCK + 0.6;
  const base: EpisodeSet = damaged ? (shot.full ? sets.damagedFull : sets.damaged) : (shot.full ? sets.intactFull : sets.intact);
  const environment = t < IMPACT ? sets.clear : t < 24 ? sets.haze : sets.dust;
  const set = useMemo(() => ({...base, environment}), [base, environment]);
  const turn = smooth(52.05, 54.5, t);
  const approach = smooth(53.6, 55.2, t);
  return <>
    <CameraRig position={view.pos} target={view.target} fov={view.fov} />
    {interior ? <>
      <color attach="background" args={['#202824']} />
      <ambientLight intensity={0.36} />
      <hemisphereLight args={['#b6cad0', '#5b6259', 0.75]} />
      <ShelterRoom t={t} />
      <group position={[-0.7 + 0.1 * approach, 0, 0.5 + 0.65 * approach]} rotation={[0, -2.85 * turn, 0]}>
        <Marc t={t} cold={0.12 + turn * 0.2} rightHand={[0.34, 1.1 + turn * 0.3, -0.13 - turn * 0.16]} />
      </group>
    </> : <ReferenceScene set={set}>
      {t >= IMPACT && <directionalLight position={[ORIGIN[0], 60, ORIGIN[2]]} color="#ffd9a8" intensity={Math.exp(-(t - IMPACT) * 2.5) * 3} />}
      <StreetMarc t={t} />
      <FallingSilhouette t={t} />
      <group position={ORIGIN} scale={EFFECT_SCALE}>
        <NuclearEffects t={t} origin={[0, 0, 0]} impact={IMPACT} />
        {t >= FALLOUT && t < 46 && <FalloutPlume t={t} origin={[0, 0, 0]} start={FALLOUT} />}
      </group>
      <Fires t={t} />
      <GlassBlast t={t} />
    </ReferenceScene>}
  </>;
};
