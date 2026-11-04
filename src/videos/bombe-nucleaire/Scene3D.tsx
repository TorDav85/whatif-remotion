import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Block} from '../../assets/kit';
import {Marc} from '../../shared/characters/Marc';
import {CameraRig} from '../../shared/three/common';
import {SkyDome} from '../../shared/three/SkyDome';
import {cutsOf, shotAt, type Shot} from '../../shared/three/shots';
import {FalloutPlume, NuclearEffects, ShelterRoom} from './Effects3D';
import {CityEnvironment, CITY_LANDMARKS} from './CityEnvironment';

type V3 = [number, number, number];
export type View = {pos: V3; target: V3; fov: number; shake?: number};

// Artistic story clock, mirrored by the soundtrack. These are edit points, not a
// prediction of blast travel time. Distances and destruction are illustrative.
export const IMPACT = 8;
export const SHOCK = 18;
export const SHELTER = 34;
export const FALLOUT = 40;
export const END = 58.5;
export const KNOCKS = [50.5, 51.2, 52] as const;
export const HANDLE = 55.4;
export const BLACKOUT = END;
export const DURATION = 60;
export const ORIGIN: V3 = [0, 0, -120];

const lerp = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

export const SHOTS: Shot<View>[] = [
  // The quiet avenue and falling silhouette share the centre of the portrait.
  {from: 0, view: (_, k) => ({pos: mixV([35, 43, 63], [28, 36, 49], k), target: [0, 12, -60], fov: 50})},
  // A familiar person gives the catastrophe a human scale.
  {from: 4, view: (t, k) => ({pos: [lerp(3.9, 4.1, k), 1.65, marcZAt(t) - 2.8], target: [5.8, 1.5, marcZAt(t)], fov: 46})},
  {from: IMPACT, view: (_, k) => ({pos: mixV([6, 90, -56], [5, 104, -58], k), target: mixV([0, 14, -120], [0, 24, -120], k), fov: 53, shake: 0.08})},
  // Heat and newly lit fires, looking down the street rather than through a wall.
  {from: 13, view: (_, k) => ({pos: mixV([-4, 3.5, -16], [-4.5, 3.7, -18], k), target: CITY_LANDMARKS.cafe.facade, fov: 54})},
  // A low, oblique insert of the windows breaking at the street edge.
  {from: SHOCK, view: (t, k) => ({pos: mixV([-2.2, 5.7, 7], [-2.5, 6.3, 5.5], k), target: [-9, 9, -4.99], fov: 50, shake: 0.14 + 0.26 * Math.exp(-(t - SHOCK) * 1.8)})},
  // Pull back far enough for the complete mushroom, not just its stem.
  {from: 24, view: (_, k) => ({pos: mixV([92, 92, 38], [107, 100, 51], k), target: [0, 37, -120], fov: 48})},
  {from: 29, view: (_, k) => ({pos: mixV([1.5, 7.5, -91], [0.3, 8.1, -93], k), target: CITY_LANDMARKS.openedBuilding.facade, fov: 51, shake: 0.05})},
  {from: 31.5, view: (_, k) => ({pos: mixV([0.5, 4.5, 25], [0.3, 3.9, 18], k), target: [-2, 6, -66], fov: 55, shake: 0.07})},
  // Marc crosses toward a recessed entrance; the camera stays on the roadway.
  {from: SHELTER, view: (_, k) => ({pos: mixV([2.7, 1.65, 3.2], [3.5, 1.58, 4.0], k), target: [8, 1.2, 8], fov: 58})},
  // Explicitly qualitative aerial diagram. The plume drifts toward +x.
  {from: FALLOUT, view: (_, k) => ({pos: mixV([100, 275, 70], [118, 290, 64], k), target: [53, 0, -112], fov: 54})},
  {from: 46, view: (_, k) => ({pos: mixV([1.3, 1.72, -5.3], [1.2, 1.7, -5.1], k), target: [0.3, 1.4, 1.6], fov: 52})},
  {from: 48, view: (_, k) => ({pos: mixV([2, 1.65, 0.95], [1.95, 1.64, 1.02], k), target: [1.58, 1.53, 2.57], fov: 50})},
  {from: 50.5, view: (_, k) => ({pos: mixV([-1.4, 1.8, -1.15], [-1.35, 1.8, -1.0], k), target: [-0.7, 1.72, 0.5], fov: 43})},
  {from: 53.2, view: (_, k) => ({pos: mixV([0.2, 1.75, -0.8], [0.25, 1.73, -0.65], k), target: [0, 1.4, 2.9], fov: 50})},
  {from: 55.2, view: (_, k) => ({pos: mixV([-0.95, 1.3, 1.35], [-0.9, 1.3, 1.45], k), target: [-0.42, 1.16, 2.8], fov: 42})},
  {from: 57.2, view: (_, k) => ({pos: mixV([-0.08, 1.88, 1.65], [-0.06, 1.88, 1.8], k), target: [0, 1.9, 2.9], fov: 38})},
];
export const CUTS = cutsOf(SHOTS);

export const viewAt = (t: number): View => {
  const view = shotAt(SHOTS, t, DURATION);
  const a = view.shake ?? 0;
  if (!a) return view;
  const distance = Math.hypot(...view.target.map((v, i) => v - view.pos[i]));
  return {...view, target: [view.target[0] + Math.sin(t * 31.3) * a * distance * 0.008,
    view.target[1] + Math.sin(t * 24.7 + 2) * a * distance * 0.006, view.target[2]]};
};

const SHARD = new THREE.TetrahedronGeometry(1, 0);
const GlassBlast: React.FC<{t: number}> = ({t}) => {
  const d = t - SHOCK;
  if (d < 0 || d > 3) return null;
  return <group>
    {Array.from({length: 25}, (_, i) => {
      const phase = ((i * 7.31) % 1);
      const a = i * 2.4;
      const elapsed = Math.max(0, d - phase * 0.4);
      const z = -8 + (i % 7) * 1.1 + Math.sin(a) * elapsed * 4;
      const y = Math.max(0.12, 4.8 + Math.floor(i / 7) * 2 - elapsed * elapsed * 3.5);
      return <mesh key={i} geometry={SHARD} position={[-8.8 + elapsed * (2 + phase * 4), y, z]}
        rotation={[d * 2 + i, d * 3 + a, a]} scale={[0.13, 0.25, 0.06]}>
        <meshStandardMaterial color="#b3d4da" roughness={0.2} metalness={0.15} />
      </mesh>;
    })}
  </group>;
};

const FLAME = new THREE.IcosahedronGeometry(1, 0);
const FIRE_POINTS: V3[] = [[-8, 0.4, -27], [7.3, 0.4, -48], [-9.2, 0.5, -69], [6.4, 0.4, -89], [-30, 0.5, -100], [30, 0.5, -132]];
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

const ShelterEntrance: React.FC<{t: number}> = ({t}) => {
  const progress = smooth(SHELTER + 0.35, SHELTER + 5.2, t);
  const marcX = lerp(5.8, 9.25, progress);
  const marcY = 0.16 - 1.12 * smooth(6.95, 8.8, marcX);
  return <group>
    {/* A recessed basement door below the pavement, reached by five down steps. */}
    <Block p={[8.98, 0.65, 8]} s={[0.05, 3.6, 2.2]} c="#172b2b" />
    <Block p={[8.7, 0.65, 6.7]} s={[0.55, 3.8, 0.32]} c="#aaa393" />
    <Block p={[8.7, 0.65, 9.3]} s={[0.55, 3.8, 0.32]} c="#aaa393" />
    <Block p={[8.7, 2.65, 8]} s={[0.55, 0.25, 2.92]} c="#c3b8a2" />
    <Block p={[8.38, 2.36, 8]} s={[0.08, 0.25, 0.85]} c="#4b9c87" e="#54bc9e" ei={0.45} />
    <Block p={[8.1, -1.22, 8]} s={[2.3, 0.15, 3.2]} c="#303b37" />
    {[0, 1, 2, 3, 4].map((step) => <Block key={step} p={[7.1 + step * 0.4, 0.1 - step * 0.28, 8]} s={[0.39, 0.16, 2.15]} c={step % 2 ? '#95978e' : '#b2afa0'} />)}
    {[6.6, 9.4].map((z) => <group key={z}>
      <Block p={[7.1, 0.58, z]} s={[0.055, 0.8, 0.055]} c="#43504b" metal />
      <Block p={[8.6, -0.35, z]} s={[0.055, 0.8, 0.055]} c="#43504b" metal />
      <Block p={[7.85, 0.51, z]} s={[1.96, 0.065, 0.065]} r={[0, 0, -0.55]} c="#43504b" metal />
    </group>)}
    {t >= SHELTER && t < FALLOUT && progress < 0.99 && <group position={[marcX, marcY, 8]} rotation={[0, -Math.PI / 2, 0]}>
      <Marc t={t} walk={0.9} cold={0.25} />
    </group>}
  </group>;
};

const marcZAt = (t: number) => 8 + 0.35 * Math.max(0, 8 - t);

const StreetCharacters: React.FC<{t: number}> = ({t}) => <group>
  {t < SHELTER && <group position={[5.8, 0.16, marcZAt(t)]}>
    <Marc t={t} walk={t < IMPACT ? 0.65 : 0} cold={t >= IMPACT ? 0.3 : 0} smile={t < IMPACT ? 0.1 : 0}
      leftHand={t >= IMPACT && t < SHOCK ? [-0.22, 1.86, -0.28] : undefined}
      rightHand={t >= IMPACT && t < SHOCK ? [0.22, 1.86, -0.28] : undefined} />
  </group>}
  <ShelterEntrance t={t} />
</group>;

const FallingSilhouette: React.FC<{t: number}> = ({t}) => {
  if (t >= IMPACT) return null;
  const y = lerp(127, 3, Math.pow(clamp01(t / IMPACT), 1.65));
  return <mesh position={[0, y, -120]} rotation={[0, 0, 0.08]} scale={[0.85, 2.2, 0.85]}>
    <sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#303943" roughness={0.65} />
  </mesh>;
};

export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const view = viewAt(t);
  const interior = t >= 46;
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  // Applied after CameraRig's layout effect; close inserts and the distant city need different ranges.
  useLayoutEffect(() => {
    camera.near = interior ? 0.12 : 0.5;
    camera.far = interior ? 40 : 2200;
    camera.updateProjectionMatrix();
  }, [camera, interior, t]);
  const damage = smooth(SHOCK, SHOCK + 2, t);
  const dust = smooth(IMPACT + 0.2, 30, t) * 0.72;
  const top = new THREE.Color('#629bc2').lerp(new THREE.Color('#65727a'), dust);
  const bottom = new THREE.Color('#e6e5d9').lerp(new THREE.Color('#c3baa7'), dust);
  const flashLight = t >= IMPACT ? Math.exp(-(t - IMPACT) * 2.5) * 3 : 0;
  const turn = smooth(52.05, 54.5, t);
  const approach = smooth(53.6, 55.2, t);
  const sunTarget = useMemo(() => {
    const target = new THREE.Object3D(); target.position.set(0, 0, -60); return target;
  }, []);
  return <>
    <CameraRig position={view.pos} target={view.target} fov={view.fov} />
    <color attach="background" args={[interior ? '#202824' : bottom]} />
    <ambientLight intensity={interior ? 0.36 : 0.28} />
    <hemisphereLight args={interior ? ['#b6cad0', '#5b6259', 0.75] : ['#c3e0f2', '#8e7a63', 1.15]} />
    {!interior && <>
      <primitive object={sunTarget} />
      <directionalLight castShadow position={[-90, 145, 55]} target={sunTarget}
        color={t >= IMPACT ? '#ffdab0' : '#fff0d3'} intensity={2.65 + flashLight}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-155} shadow-camera-right={155}
        shadow-camera-top={155} shadow-camera-bottom={-155} shadow-camera-near={1}
        shadow-camera-far={450} shadow-bias={-0.00018} shadow-normalBias={0.04} shadow-radius={2.5} />
    </>}
    {interior ? <>
      <ShelterRoom t={t} />
      <group position={[-0.7 + 0.1 * approach, 0, 0.5 + 0.65 * approach]} rotation={[0, -2.85 * turn, 0]}>
        <Marc t={t} cold={0.12 + turn * 0.2} rightHand={[0.34, 1.1 + turn * 0.3, -0.13 - turn * 0.16]} />
      </group>
    </> : <>
      <SkyDome top={top} bottom={bottom} />
      <fog attach="fog" args={[bottom, 370, 1400]} />
      <CityEnvironment t={t} damage={damage} shot={t < 8 ? 'intact' : t < 24 ? 'blast' : 'aftermath'} />
      <StreetCharacters t={t} />
      <FallingSilhouette t={t} />
      <NuclearEffects t={t} origin={ORIGIN} impact={IMPACT} />
      <Fires t={t} />
      <GlassBlast t={t} />
      {t >= FALLOUT && t < 46 && <FalloutPlume t={t} origin={ORIGIN} start={FALLOUT} />}
    </>}
    <OpaqueShadows t={t} />
  </>;
};

/** Local lighting policy: reusable library assets keep their existing contracts. */
const OpaqueShadows: React.FC<{t: number}> = ({t}) => {
  const scene = useThree((state) => state.scene);
  useLayoutEffect(() => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const solid = materials.every((material) => (material as THREE.MeshStandardMaterial).isMeshStandardMaterial
        && !material.transparent && material.opacity >= 1 && (material as THREE.MeshStandardMaterial).fog);
      mesh.castShadow = solid;
      mesh.receiveShadow = solid;
    });
  }, [scene, t]);
  return null;
};
