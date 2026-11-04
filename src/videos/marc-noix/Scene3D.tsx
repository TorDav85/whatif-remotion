import React, {useLayoutEffect, useRef} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Block, Cyl, Ball, seeded} from '../../assets/kit';
import {Person} from '../../assets/Person';
import {Bookshelf, FloorLamp, InteriorWindow, PottedPlant, Rug, Sofa} from '../../assets/interior';
import {Marc} from '../../shared/characters/Marc';
import {cutsOf, shotAt as shotAtOf, type Shot as ShotOf} from '../../shared/three/shots';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
const faceYaw = (from: V3, to: V3) => Math.atan2(-(to[0] - from[0]), -(to[2] - from[2]));

// ---------- Story clock (s). Mirrored in scripts/audio/marc-noix.py ----------
export const SHRINK: [number, number] = [1.0, 3.4];
export const SKULL = 4.8;
export const WALNUT = 6.2;
export const NEURONS = 11.0;
export const CULL: [number, number] = [13.4, 15.6];
export const WORDS = 17.8;
export const LOST = 20.4;
export const BALANCE = 24.4;
export const FALL = 28.6;
export const CROW = 30.8;
export const HOOK_TOOL = 32.6;
export const LOOK = 34.6;
export const DENSE = 37.8;
export const CASE = 44.4;
export const VENTRICLES: [number, number] = [46.2, 48.4];
export const FAMILY = 52.4;
export const TIME = 58.4;
export const PUNCH = 64.0;
export const END = 66.4;
export const DURATION = 70;

export type World = 'xray' | 'neurons' | 'living' | 'crow' | 'dense' | 'mri';
export const worldAt = (t: number): World =>
  t < NEURONS ? 'xray' : t < WORDS ? 'neurons' : t < CROW ? 'living' : t < DENSE ? 'crow' : t < CASE ? 'dense' : t < FAMILY ? 'mri' : 'living';
export const DIPS = [NEURONS, WORDS, CROW, DENSE, CASE, FAMILY, TIME, PUNCH];

/** Brain mass in grams. */
export const brainGrams = (t: number) => mix(1350, 13.5, smooth(SHRINK[0], SHRINK[1], t));
/** Neurons left (billions). */
export const neuronsBillions = (t: number) => (t < NEURONS ? 86 : mix(86, 0.86, smooth(CULL[0], CULL[1], t)));

const MODEL_H = 2.06;
const S = 1.8 / MODEL_H;

// ---------- Shared ----------
/** Makes every mesh of its children see-through (the x-ray look). */
const Glassy: React.FC<{opacity: number; children: React.ReactNode}> = ({opacity, children}) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (!mat.transparent) {
        mat.transparent = true;
        mat.needsUpdate = true;
      }
      mat.opacity = opacity;
      mat.depthWrite = false;
    });
  });
  return <group ref={ref}>{children}</group>;
};

/** Pink, folded brain made of lumps (unit size: about 1 wide). */
const BRAIN_LUMPS = (() => {
  const r = seeded(9);
  return Array.from({length: 22}, () => {
    const a = r() * Math.PI * 2;
    const b = Math.acos(2 * r() - 1);
    return {p: [Math.sin(b) * Math.cos(a) * 0.32, Math.cos(b) * 0.24, Math.sin(b) * Math.sin(a) * 0.38] as V3, s: 0.2 + r() * 0.1};
  });
})();
const Brain: React.FC<{color?: string; t: number}> = ({color = '#e8a0a8', t}) => (
  <group rotation={[0, 0, Math.sin(t * 1.3) * 0.04]}>
    {BRAIN_LUMPS.map((l, i) => <Ball key={i} p={l.p} rad={l.s} c={i % 3 ? color : new THREE.Color(color).multiplyScalar(0.88).getStyle()} />)}
    <Block p={[0, 0.2, 0]} s={[0.025, 0.2, 0.8]} c={new THREE.Color(color).multiplyScalar(0.6).getStyle()} />
  </group>
);

/** A walnut (unit size about 1 wide). */
const Walnut: React.FC = () => (
  <group>
    {BRAIN_LUMPS.map((l, i) => <Ball key={i} p={l.p} rad={l.s} c={i % 2 ? '#8a5a32' : '#a06a3c'} />)}
    <Block p={[0, 0, 0]} s={[0.04, 0.6, 0.85]} c="#6a4224" />
  </group>
);

const Crow: React.FC<{t: number; tool: number; hooked: number}> = ({t, tool, hooked}) => (
  <group>
    <Ball p={[0, 0.12, 0.02]} rad={1} s={[0.08, 0.08, 0.15]} c="#2a2d38" />
    <Block p={[0, 0.1, 0.2]} s={[0.07, 0.02, 0.14]} r={[-0.3, 0, 0]} c="#22242c" />
    {[-1, 1].map((s) => <Block key={s} p={[s * 0.075, 0.13, 0.04]} s={[0.02, 0.07, 0.17]} r={[0.1, 0, 0]} c="#353948" />)}
    <group position={[0, 0.2 + Math.abs(Math.sin(t * 2.2)) * 0.008, -0.12]}>
      <Ball p={[0, 0, 0]} rad={0.055} c="#2a2d38" />
      <mesh position={[0, -0.01, -0.07]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[0.018, 0.07, 6]} /><meshStandardMaterial color="#4a4a52" /></mesh>
      {[-1, 1].map((s) => <Ball key={s} p={[s * 0.036, 0.014, -0.03]} rad={0.01} c="#f0e8d0" e="#806a40" ei={0.3} detail={0} />)}
      {[-1, 1].map((s) => <Ball key={`p${s}`} p={[s * 0.043, 0.014, -0.034]} rad={0.006} c="#050505" detail={0} />)}
      {/* Twig in the beak, bent into a hook */}
      {tool > 0 && (
        <group position={[0.01, -0.012, -0.09]}>
          <Cyl p={[0.0, 0, -0.06]} rad={0.004} h={0.14} r={[Math.PI / 2, 0, 0]} c="#7a5a34" />
          {hooked > 0 && <Cyl p={[0.012, 0, -0.13]} rad={0.004} h={0.03 * hooked} r={[Math.PI / 2, -0.9, 0]} c="#7a5a34" />}
        </group>
      )}
    </group>
    {[-1, 1].map((s) => <Cyl key={s} p={[s * 0.025, 0.02, 0.02]} rad={0.005} h={0.05} c="#2a2a2e" />)}
  </group>
);

const Room: React.FC = () => (
  <group>
    <hemisphereLight color="#fff4e4" groundColor="#3a3028" intensity={0.75} />
    <directionalLight color="#ffe9c8" intensity={1.4} position={[-2, 4, 6]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#a07a56" roughness={0.85} /></mesh>
    {Array.from({length: 26}, (_, i) => <Block key={i} p={[-5 + i * 0.4, 0.002, 0]} s={[0.01, 0.004, 10]} c="#7e5e42" />)}
    <mesh position={[0, 1.4, 2.2]} rotation={[0, Math.PI, 0]}><planeGeometry args={[10, 2.8]} /><meshStandardMaterial color="#d9cfbf" roughness={0.95} /></mesh>
    <mesh position={[-3, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[10, 2.8]} /><meshStandardMaterial color="#d3c9b8" roughness={0.95} /></mesh>
    <mesh position={[3, 1.4, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[10, 2.8]} /><meshStandardMaterial color="#d3c9b8" roughness={0.95} /></mesh>
    <mesh position={[0, 1.4, -3.5]}><planeGeometry args={[10, 2.8]} /><meshStandardMaterial color="#d9cfbf" roughness={0.95} /></mesh>
    <mesh position={[0, 2.8, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#efe9de" roughness={1} /></mesh>
    <group position={[-1.9, 0, 2.0]}><Bookshelf width={1.2} /></group>
    <group position={[-0.4, 0, 2.0]}><Sofa width={1.6} /></group>
    <group position={[0, 0, 0.6]}><Rug w={2.4} d={1.6} /></group>
    <group position={[2.4, 0, 1.6]}><FloorLamp /></group>
    <group position={[1.15, 0.9, 2.18]}><InteriorWindow curtain="#3f6b4a" light={0.8} /></group>
    <group position={[2.55, 0, -1.2]}><PottedPlant size={1.1} /></group>
  </group>
);

// ---------- X-ray: the brain shrinks inside an unchanged skull ----------
const HEAD_Y = 1.84;
const XRay: React.FC<{t: number}> = ({t}) => {
  const k = smooth(SHRINK[0], SHRINK[1], t);
  const size = mix(0.19, 0.19 / 4.64, k);
  const fluid = smooth(SKULL - 0.4, SKULL + 0.6, t);
  const walnut = smooth(WALNUT, WALNUT + 0.5, t);
  const bob = t > SHRINK[1] ? Math.sin(t * 1.4) * 0.015 : 0;
  return (
    <group>
      <color attach="background" args={['#0d1a2a']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[-1, 2, -3]} intensity={1.5} />
      <pointLight position={[0.4, 1.8, -0.6]} intensity={1.2} distance={3} color="#cfe8ff" />
      <group scale={S}>
        <Glassy opacity={0.22}><Marc t={t} /></Glassy>
        {/* Cerebrospinal fluid filling the empty skull */}
        {fluid > 0 && (
          <mesh position={[0, HEAD_Y + 0.02, 0.0]} scale={[0.13, 0.13, 0.135]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color="#7fc8ff" transparent opacity={0.22 * fluid} depthWrite={false} />
          </mesh>
        )}
        <group position={[0, HEAD_Y + 0.03 + bob, 0.01]} scale={size}><Brain t={t} /></group>
      </group>
      {/* A real walnut for scale */}
      {walnut > 0 && <group position={[0.24, 1.47, -0.12]} scale={0.032 * walnut} rotation={[0.3, 0.6, 0]}><Walnut /></group>}
    </group>
  );
};

// ---------- 100 dots for 86 billion neurons; 99 go dark ----------
const GRID = Array.from({length: 100}, (_, i) => ({x: (i % 10) - 4.5, y: Math.floor(i / 10) - 4.5, keep: i === 54, delay: seeded(i + 3)()}));
const Neurons: React.FC<{t: number}> = ({t}) => (
  <group>
    <color attach="background" args={['#0a0818']} />
    <ambientLight intensity={0.5} />
    {GRID.map((d, i) => {
      const off = d.keep ? 0 : smooth(CULL[0] + d.delay * 1.6, CULL[0] + d.delay * 1.6 + 0.4, t);
      const glow = (0.6 + 0.4 * Math.sin(t * 5 + i)) * (1 - off);
      return (
        <mesh key={i} position={[d.x * 0.21, 0.35 + d.y * 0.21, 0]} scale={0.06 * (d.keep ? 1.3 : 1)}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={new THREE.Color('#2a2440').lerp(new THREE.Color(d.keep ? '#ffe45c' : '#a898ff'), Math.max(glow, d.keep ? 1 : 0)).getStyle()} />
        </mesh>
      );
    })}
  </group>
);

// ---------- Living room: lost words, then the fall ----------
const MARC_SPOT: V3 = [0, 0, 0.6];
const JULIEN_SPOT: V3 = [0.95, 0, -0.35];
const fallAt = (t: number) => {
  const wobble = smooth(BALANCE, FALL, t) * 0.14 * Math.sin((t - BALANCE) * 3.1);
  const fall = smooth(FALL, FALL + 0.45, t);
  return wobble * (1 - fall) + 1.45 * fall;
};

const Living: React.FC<{t: number}> = ({t}) => {
  const family = t >= FAMILY && t < TIME;
  const tilt = fallAt(t);
  const lost = t >= LOST && t < BALANCE;
  return (
    <group>
      <Room />
      {!family && (
        <>
          <group position={MARC_SPOT} rotation={[0, 0, tilt]}>
            <group position={[0, tilt > 1 ? 0.12 : 0, 0]} scale={S}>
              <Marc t={t} cold={t >= WORDS ? 0.8 : 0} walk={0}
                leftHand={lost ? [-0.2, 1.75, -0.12] : t >= BALANCE && t < FALL ? [-0.55, 1.1, 0] : undefined}
                rightHand={t >= BALANCE && t < FALL ? [0.55, 1.1, 0] : undefined} />
            </group>
          </group>
          <group position={t >= FALL ? [-0.55, 0, 1.3] : JULIEN_SPOT} rotation={[0, t >= FALL ? 0.25 : faceYaw(JULIEN_SPOT, MARC_SPOT), 0]}>
            <Person shirt="#3a6fb0" pants="#2f343c" skin="#d9a27c" hair="#1e1712"
              pose={t >= FALL && t < FALL + 1.6 ? 'bras-leves' : t >= TIME ? 'assis' : 'debout'} />
          </group>
        </>
      )}
      {family && (
        <group>
          <group position={[-0.1, 0, 0.8]}><Person shirt="#f2f0ea" pants="#2f3a4a" skin="#e8b894" hair="#5a4030" bag="#5a3a22" /></group>
          <group position={[0.55, 0, 0.9]}><Person shirt="#b8322a" pants="#2f343c" skin="#f0c8a8" hair="#2a1a10" hairStyle="long" height={0.95} /></group>
          <group position={[-0.6, 0, 0.4]}><Person shirt="#e8c45a" pants="#3a6f9e" skin="#e8b894" hair="#5a4030" height={0.6} /></group>
          <group position={[0.35, 0, 0.35]}><Person shirt="#3f6b4a" pants="#40515b" skin="#f0c8a8" hair="#2a1a10" hairStyle="chignon" height={0.5} /></group>
        </group>
      )}
      {/* Punch: a crow lands on the window sill and looks in */}
      {t >= PUNCH - 0.2 && <group position={[1.15, 0.93, 2.06]} rotation={[0, Math.PI, 0]} scale={1.2}><Crow t={t} tool={0} hooked={0} /></group>}
    </group>
  );
};

// ---------- Crow on a fence: a hook tool, then it looks at us ----------
const CrowScene: React.FC<{t: number}> = ({t}) => {
  const turn = smooth(LOOK, LOOK + 0.5, t);
  return (
    <group>
      <color attach="background" args={['#a9cdee']} />
      <fog attach="fog" args={['#cfe0ee', 6, 30]} />
      <hemisphereLight color="#fff4e0" groundColor="#5a7a40" intensity={0.8} />
      <directionalLight color="#fff1d8" intensity={1.6} position={[-3, 5, -4]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[80, 80]} /><meshStandardMaterial color="#6f9a4a" roughness={1} /></mesh>
      {[-1.2, 0, 1.2].map((x) => <Block key={x} p={[x, 0.55, 0.05]} s={[0.1, 1.1, 0.1]} c="#8a6a48" />)}
      <Block p={[0, 1.0, 0.05]} s={[3.2, 0.06, 0.08]} c="#9a7a54" />
      <Block p={[0, 0.6, 0.05]} s={[3.2, 0.06, 0.08]} c="#9a7a54" />
      {[[-3, 6], [2.5, 8], [5, 12], [-6, 14]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}><Cyl p={[0, 1.2, 0]} rad={0.2} h={2.4} c="#6a4a30" /><Ball p={[0, 3, 0]} rad={1.5} c="#3f6b34" /></group>
      ))}
      <group position={[0, 1.03, 0.05]} rotation={[0, mix(-Math.PI / 2, -0.15, turn), 0]} scale={1.4}>
        <Crow t={t} tool={t < LOOK ? 1 : 0} hooked={smooth(HOOK_TOOL, HOOK_TOOL + 0.5, t)} />
      </group>
    </group>
  );
};

// ---------- Same mass, twice the neurons ----------
const dots = (seed: number, n: number) => {
  const r = seeded(seed);
  return Array.from({length: n}, () => [(r() - 0.5) * 0.6, (r() - 0.5) * 0.6, (r() - 0.5) * 0.6] as V3);
};
const MONKEY = dots(3, 40);
const BIRD = dots(4, 80);
const DenseScene: React.FC<{t: number}> = ({t}) => {
  const fill = smooth(DENSE + 0.6, DENSE + 2.4, t);
  return (
    <group rotation={[0.25, t * 0.15, 0]}>
      <color attach="background" args={['#0a0818']} />
      <ambientLight intensity={0.8} />
      <pointLight position={[2, 3, 4]} intensity={1.5} />
      {[[-0.5, MONKEY, '#a898ff'], [0.5, BIRD, '#ffe45c']].map(([x, pts, c], j) => (
        <group key={j} position={[x as number, 0, 0]}>
          <mesh><boxGeometry args={[0.7, 0.7, 0.7]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.08} depthWrite={false} /></mesh>
          <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(0.7, 0.7, 0.7)]} /><lineBasicMaterial color="#8090b0" /></lineSegments>
          {(pts as V3[]).map((p, i) => i / (pts as V3[]).length < fill && <Ball key={i} p={p} rad={0.022} c={c as string} e={c as string} ei={0.8} detail={0} />)}
        </group>
      ))}
    </group>
  );
};

// ---------- Schematic MRI slice: the ventricles swell, the cortex becomes a thin ring ----------
const MriScene: React.FC<{t: number}> = ({t}) => {
  const k = smooth(VENTRICLES[0], VENTRICLES[1], t);
  return (
    <group>
      <color attach="background" args={['#050607']} />
      <ambientLight intensity={1} />
      <mesh scale={[1, 1.22, 1]}><ringGeometry args={[1.0, 1.1, 64]} /><meshBasicMaterial color="#e8e8e4" /></mesh>
      <mesh position={[0, 0, -0.01]} scale={[1, 1.22, 1]}><circleGeometry args={[1.0, 64]} /><meshBasicMaterial color="#8a8c90" /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * mix(0.17, 0.12, k), mix(0.05, 0.0, k), 0.01]} scale={[mix(0.1, 0.74, k), mix(0.32, 1.08, k), 1]}>
          <circleGeometry args={[1, 48]} />
          <meshBasicMaterial color="#101114" />
        </mesh>
      ))}
    </group>
  );
};

// ---------- Camera ----------
const Rig: React.FC<{pos: THREE.Vector3; target: THREE.Vector3; fov: number}> = ({pos, target, fov}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
    camera.fov = fov;
    camera.near = 0.01;
    camera.far = 3000;
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

type View = {pos: THREE.Vector3; target: THREE.Vector3; fov: number};
type Shot = ShotOf<View>;
const HEAD_W = HEAD_Y * S;

export const SHOTS: Shot[] = [
  // Hook: x-ray of Marc's head, the brain shrinks.
  {from: 0, view: (t, k) => ({pos: V(mix(0.45, 0.35, k), HEAD_W + 0.02, mix(-1.15, -1.0, k)), target: V(0.04, HEAD_W + 0.1, 0), fov: 36})},
  // The skull stays the same; the brain floats.
  {from: SKULL, view: (t, k) => ({pos: V(mix(0.3, 0.22, k), HEAD_W + 0.0, mix(-0.85, -0.7, k)), target: V(0.08, HEAD_W + 0.06, 0), fov: 34})},
  // 86 billion neurons → under one billion.
  {from: NEURONS, view: (t, k) => ({pos: V(0, 0.35, mix(6.4, 5.8, k)), target: V(0, 0.2, 0), fov: 40})},
  // Lost words in front of Julien.
  {from: WORDS, view: (t, k) => ({pos: V(mix(-1.1, -0.95, k), 1.5, mix(-2.0, -1.8, k)), target: V(0.5, 1.25, 0.15), fov: 54})},
  // Close on his face: who is that?
  {from: LOST, view: (t, k) => ({pos: V(0.1, 1.58, mix(-0.4, -0.3, k)), target: V(0, 1.55, 0.6), fov: 44})},
  // Wobble and fall.
  {from: BALANCE, view: (t, k) => ({pos: V(mix(0.4, 0.2, k), 1.3, mix(-2.4, -2.2, k)), target: V(0, 0.9, 0.6), fov: 54})},
  // The crow with its hook.
  {from: CROW, view: (t, k) => ({pos: V(mix(0.2, 0.12, k), 1.3, mix(-1.7, -1.5, k)), target: V(0, 1.2, 0.05), fov: 36})},
  // Two cubes, same mass.
  {from: DENSE, view: (t, k) => ({pos: V(0, 0.1, mix(4.2, 3.8, k)), target: V(0, -0.15, 0), fov: 40})},
  // MRI slice, Marseille 2007.
  {from: CASE, view: (t, k) => ({pos: V(0, -0.4, mix(7.8, 7.4, k)), target: V(0, -0.4, 0), fov: 42})},
  // A normal family life.
  {from: FAMILY, view: (t, k) => ({pos: V(mix(0.1, 0.0, k), 1.3, mix(-2.4, -2.2, k)), target: V(0.05, 0.85, 0.6), fov: 50})},
  // Marc on the floor, one night.
  {from: TIME, view: (t, k) => ({pos: V(mix(1.3, 1.1, k), 1.25, mix(-0.9, -0.7, k)), target: V(-0.7, 0.3, 0.7), fov: 50})},
  // Punch: a crow at the window.
  {from: PUNCH, view: (t, k) => ({pos: V(0.55, 1.3, mix(0.1, 0.3, k)), target: V(1.15, 1.05, 2.1), fov: 40})},
];
export const CUTS = cutsOf(SHOTS);
const shotAt = (t: number): View => shotAtOf(SHOTS, t, DURATION);

/** Cover framing: the x-ray head sits in the upper half, above the title. */
const COVER_VIEW: View = {pos: V(0.4, HEAD_W + 0.12, -1.05), target: V(0.04, HEAD_W - 0.2, 0), fov: 38};

export const Scene3D: React.FC<{t: number; cover?: boolean}> = ({t, cover}) => {
  const view = cover && worldAt(t) === 'xray' ? COVER_VIEW : shotAt(t);
  const world = worldAt(t);
  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} />
      {world === 'xray' && <XRay t={t} />}
      {world === 'neurons' && <Neurons t={t} />}
      {world === 'living' && <Living t={t} />}
      {world === 'crow' && <CrowScene t={t} />}
      {world === 'dense' && <DenseScene t={t} />}
      {world === 'mri' && <MriScene t={t} />}
    </>
  );
};
