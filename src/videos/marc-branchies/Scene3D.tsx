import React, {useLayoutEffect, useRef} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Block, Cyl, Ball, seeded} from '../../assets/kit';
import {Person} from '../../assets/Person';
import {Marc} from '../../shared/characters/Marc';
import {cutsOf, shotAt as shotAtOf, type Shot as ShotOf} from '../../shared/three/shots';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

// ---------- Story clock (s). Mirrored in scripts/audio/marc-branchies.py ----------
export const PLUNGE = 4.8;
export const JUMP = 7.2;
export const SPLASH = 8.3;
export const DIVE = 8.9;
export const GILLS_OPEN = 9.4;
export const OXYGEN = 10.8;
export const LITRES = 18.0;
export const BATH = 25.8;
export const HEAVY = 31.0;
export const SWIM = 37.8;
export const COLD = 43.8;
export const HYPO = 51.0;
export const FISH = 57.8;
export const PUNCH = 64.4;
export const END = 69.8;
export const DURATION = 75;

export type World = 'under' | 'river' | 'compare' | 'bath';
export const worldAt = (t: number): World =>
  t < PLUNGE ? 'under' : t < DIVE ? 'river' : t < OXYGEN ? 'under' : t < LITRES ? 'compare' : t < BATH ? 'under'
    : t < HEAVY ? 'bath' : t < PUNCH ? 'under' : 'river';
export const DIPS = [PLUNGE, OXYGEN, LITRES, BATH, HEAVY, PUNCH];

/** 0..1: how cold Marc is (blue skin, shivering). */
export const coldAt = (t: number) => (t < COLD ? 0 : t < PUNCH ? smooth(COLD + 2, HYPO + 5, t) : 0.7);
/** Body temperature shown in the HUD (illustration of a slow drop). */
export const bodyTempAt = (t: number) => mix(37, 34.5, smooth(HYPO + 0.5, FISH - 0.5, t));
/** Oxygen gauge 0..1 while he swims. */
export const oxygenAt = (t: number) => (t < SWIM ? 1 : 1 - 0.85 * smooth(SWIM + 0.6, SWIM + 4.6, t));

const MODEL_H = 2.06;
const S = 1.8 / MODEL_H;

/** Sets the scene background and fog directly (an attach inside a group would not reach the scene). */
const Look: React.FC<{bg: string; fog?: [number, number]}> = ({bg, fog}) => {
  const scene = useThree((st) => st.scene);
  useLayoutEffect(() => {
    scene.background = new THREE.Color(bg);
    scene.fog = fog ? new THREE.Fog(bg, fog[0], fog[1]) : null;
  });
  return null;
};

// ---------- Marc with gills ----------
const Gills: React.FC<{t: number; open: number; rate: number}> = ({t, open, rate}) => {
  if (open <= 0) return null;
  const flap = 0.5 + 0.5 * Math.sin(t * rate);
  return (
    <>
      {[-1, 1].flatMap((s) => [0, 1, 2].map((i) => (
        <Block key={`${s}${i}`} p={[s * 0.082, 1.6 + i * 0.035, 0.01 - i * 0.005]} s={[0.006, 0.012 * open * (0.4 + 0.6 * flap), 0.11]}
          r={[0, 0, s * -0.25]} c="#a8202a" e="#ff3040" ei={0.3} />
      )))}
    </>
  );
};

const skinAt = (cold: number) => new THREE.Color('#efbd96').lerp(new THREE.Color('#9fb2cc'), cold * 0.85).getStyle();

type Pose = {left?: V3; right?: V3; walk?: number};
const GillMarc: React.FC<{t: number; open: number; rate: number; cold: number; pose?: Pose; smile?: number}> = ({t, open, rate, cold, pose = {}, smile = 0}) => (
  <>
    <Marc t={t} cold={cold} skin={skinAt(cold)} leftHand={pose.left} rightHand={pose.right} walk={pose.walk ?? 0} smile={smile} />
    <Gills t={t} open={open} rate={rate} />
  </>
);

/** Makes every mesh of its children see-through, to show the blood inside. */
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

// Water flowing in through the mouth and out through the gills (model units).
const FLOW = Array.from({length: 26}, (_, i) => ({ph: i / 26, side: i % 2 ? 1 : -1, y: seeded(i + 40)()}));
const WaterFlow: React.FC<{t: number; amount: number}> = ({t, amount}) => {
  if (amount <= 0) return null;
  return (
    <>
      {FLOW.map((f, i) => {
        const k = (t * 0.9 + f.ph) % 1;
        const p = k < 0.5 ? mixV([0, 1.74 + (f.y - 0.5) * 0.08, -0.7], [0, 1.73, -0.15], k / 0.5)
          : mixV([0, 1.7, -0.05], [f.side * 0.42, 1.6 + (f.y - 0.5) * 0.1, 0.12], (k - 0.5) / 0.5);
        return <Ball key={i} p={p} rad={0.012} c="#bfe8ff" e="#8fd0ff" ei={0.8 * amount} detail={0} />;
      })}
    </>
  );
};

// Blood: up from the body to the gills (red), back down cooled (blue).
const BLOOD = Array.from({length: 24}, (_, i) => ({ph: i / 24, side: i % 2 ? 1 : -1}));
const BloodFlow: React.FC<{t: number; amount: number}> = ({t, amount}) => {
  if (amount <= 0) return null;
  return (
    <>
      {BLOOD.map((b, i) => {
        const k = (t * 0.45 + b.ph) % 1;
        const up = k < 0.5;
        const p = up ? mixV([b.side * 0.03, 1.25, -0.05], [b.side * 0.085, 1.63, 0.0], k / 0.5)
          : mixV([b.side * 0.085, 1.63, 0.03], [b.side * 0.12, 1.25, 0.05], (k - 0.5) / 0.5);
        const c = up ? '#ff3a3a' : new THREE.Color('#ff3a3a').lerp(new THREE.Color('#3a8aff'), smooth(0.5, 0.6, k)).getStyle();
        return <Ball key={i} p={p} rad={0.026} c={c} e={c} ei={1.4 * amount} detail={0} />;
      })}
    </>
  );
};

const Fish: React.FC<{t: number}> = ({t}) => (
  <group rotation={[0, Math.sin(t * 8) * 0.15, 0]}>
    <Ball p={[0, 0, 0]} rad={1} s={[0.05, 0.08, 0.2]} c="#d8b050" />
    {[-0.08, 0, 0.08].map((z) => <Block key={z} p={[0, 0.02, z]} s={[0.104, 0.12, 0.02]} c="#3a4a2a" />)}
    <Ball p={[0, -0.03, -0.02]} rad={1} s={[0.045, 0.04, 0.16]} c="#d8e4e0" />
    <mesh position={[0, 0, 0.24]} rotation={[0, Math.sin(t * 10) * 0.4, 0]} scale={[0.02, 0.12, 0.1]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#e86a2a" flatShading />
    </mesh>
    <Block p={[0, 0.08, 0.02]} s={[0.01, 0.06, 0.1]} r={[0.3, 0, 0]} c="#6a8a80" />
    {[-1, 1].map((s) => <Ball key={s} p={[s * 0.04, 0.02, -0.13]} rad={0.012} c="#101010" detail={0} />)}
  </group>
);

// ---------- Under the Seine ----------
const MOTES = (() => {
  const r = seeded(17);
  return Array.from({length: 90}, () => ({x: (r() - 0.5) * 8, y: r() * 4, z: (r() - 0.5) * 8, ph: r() * 10, s: 0.008 + r() * 0.015}));
})();
const BUBBLES = Array.from({length: 14}, (_, i) => ({x: (seeded(i + 70)() - 0.5) * 0.12, ph: i / 14}));

type UnderPose = {pos: V3; rot: V3; pose: Pose; rate: number};
const swimZ = (t: number) => mix(1.0, -1.6, smooth(SWIM, SWIM + 4.6, t));
const underMarc = (t: number): UnderPose => {
  const bob = Math.sin(t * 1.1) * 0.05;
  if (t >= SWIM && t < COLD) {
    // Swimming forward, face down, until he runs out of breath.
    const tired = smooth(SWIM + 4.2, COLD - 0.3, t);
    const z = swimZ(t);
    const stroke = Math.sin(t * 6) * (1 - tired);
    return {pos: [0, 1.2 + bob, z], rot: [mix(-1.3, -0.3, tired), 0, 0], rate: 26,
      pose: {left: [-0.35, 1.6 + 0.35 * stroke, -0.4], right: [0.35, 1.6 - 0.35 * stroke, -0.4], walk: 0.6 * (1 - tired)}};
  }
  const heavy = t >= HEAVY && t < SWIM;
  const slump = heavy ? smooth(HEAVY, HEAVY + 3, t) : 0;
  return {pos: [0, 0.4 + bob - 0.15 * slump, 0], rot: [0.15 * slump, Math.sin(t * 0.3) * 0.1, 0], rate: heavy ? 22 : t >= LITRES && t < BATH ? 16 : 8,
    pose: {left: [-0.48, 1.15 - 0.2 * slump, -0.1], right: [0.48, 1.15 - 0.2 * slump, -0.1]}};
};

const Under: React.FC<{t: number}> = ({t}) => {
  const m = underMarc(t);
  const cold = coldAt(t);
  const open = t < PLUNGE ? 1 : smooth(GILLS_OPEN, GILLS_OPEN + 0.6, t);
  const murk = new THREE.Color('#4f8f7a').lerp(new THREE.Color('#3a5f7a'), cold * 0.6).getStyle();
  const entry = t >= DIVE && t < DIVE + 1.2;
  return (
    <group>
      <Look bg={murk} fog={[2, 11]} />
      <hemisphereLight color="#bfe8d8" groundColor="#1a2a20" intensity={0.9} />
      <directionalLight position={[1, 8, -2]} intensity={1.2} color="#d8fff0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#3a4a34" roughness={1} /></mesh>
      {Array.from({length: 18}, (_, i) => {
        const r = seeded(i + 90);
        return <Ball key={i} p={[(r() - 0.5) * 10, -0.55, (r() - 0.2) * 8]} rad={0.1 + r() * 0.25} c="#4a5444" />;
      })}
      {/* Light shafts from the surface */}
      {[-1.4, 0.3, 1.6].map((x, i) => (
        <mesh key={i} position={[x, 3, 1.5 + i]} rotation={[0, 0, 0.2]}>
          <planeGeometry args={[0.6, 7]} />
          <meshBasicMaterial color="#d8fff0" transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {MOTES.map((p, i) => (
        <Ball key={i} p={[p.x + Math.sin(t * 0.3 + p.ph) * 0.2, p.y + ((t * 0.05 + p.ph) % 1) * 0.3, p.z]} rad={p.s} c="#a8c8b0" detail={0} />
      ))}
      <group position={m.pos} rotation={m.rot}>
        <group scale={S}>
          {t >= COLD && t < HYPO
            ? <Glassy opacity={0.3}><GillMarc t={t} open={open} rate={m.rate} cold={cold} pose={m.pose} /></Glassy>
            : <GillMarc t={t} open={open} rate={m.rate} cold={Math.max(cold, t < PLUNGE ? 0.4 : 0)} pose={m.pose} />}
          <WaterFlow t={t} amount={t >= LITRES && t < BATH ? 1 : 0} />
          <BloodFlow t={t} amount={t >= COLD && t < HYPO ? 1 : 0} />
          {/* Exhaled bubbles */}
          {BUBBLES.map((b, i) => {
            const k = (t * 0.6 + b.ph) % 1;
            return <Ball key={i} p={[b.x + Math.sin(t * 3 + i) * 0.02, 1.75 + k * 1.2, -0.15]} rad={0.012 + 0.01 * k} c="#e8fbff" e="#bfe8ff" ei={0.4} detail={0} />;
          })}
        </group>
      </group>
      {/* Entry splash: a burst of bubbles */}
      {entry && Array.from({length: 30}, (_, i) => {
        const r = seeded(i + 200);
        const k = (t - DIVE) / 1.2;
        return <Ball key={i} p={[(r() - 0.5) * 1.2 * (0.3 + k), 0.6 + r() * 2 + k * 1.2, (r() - 0.5) * 0.8]} rad={0.02 + r() * 0.04} c="#e8fbff" e="#bfe8ff" ei={0.5} detail={0} />;
      })}
      {t >= FISH && t < PUNCH && (
        <group position={[mix(-0.9, 0.9, smooth(FISH, PUNCH - 0.4, t)), 1.72 + Math.sin(t * 2) * 0.05, -0.55]} rotation={[0, -Math.PI / 2, 0]} scale={1.1}><Fish t={t} /></group>
      )}
    </group>
  );
};

// ---------- The Seine from above: the bridge, the jump, the quay ----------
const DECK_Y = 5.5;
const Facades: React.FC<{side: number}> = ({side}) => (
  <>
    {Array.from({length: 9}, (_, i) => {
      const r = seeded(i + side * 50 + 300);
      const h = 16 + r() * 4;
      const z = -40 + i * 10;
      return (
        <group key={i}>
          <Block p={[side * 20, 4 + h / 2, z]} s={[8, h, 9.6]} c={['#e8dcc0', '#dfd2b4', '#ece2ca'][i % 3]} />
          <Block p={[side * 20, 4 + h + 1.2, z]} s={[7.4, 2.4, 9]} c="#5a6878" />
          {Array.from({length: 5}, (_, f) => Array.from({length: 3}, (_, w) => (
            <Block key={`${f}${w}`} p={[side * 15.98, 6 + f * 3, z - 3 + w * 3]} s={[0.05, 1.6, 1.0]} c="#3a4a5a" />
          )))}
        </group>
      );
    })}
  </>
);

const River: React.FC<{t: number}> = ({t}) => {
  const jump = smooth(JUMP, JUMP + 0.15, t);
  const fallK = clamp01((t - JUMP) / (SPLASH - JUMP));
  const marcPos: V3 = t < JUMP ? [0, DECK_Y + 1.05, -5.25]
    : [0, DECK_Y + 1.05 + 0.6 * Math.sin(Math.PI * Math.min(1, fallK * 2.2)) - (DECK_Y + 1.6) * fallK * fallK, mix(-5.25, -7.0, fallK)];
  const splash = t >= SPLASH ? smooth(SPLASH, SPLASH + 0.25, t) * (1 - smooth(SPLASH + 0.5, SPLASH + 1.2, t)) : 0;
  const punch = t >= PUNCH;
  const cold = coldAt(t);
  return (
    <group>
      <Look bg="#b8d4ee" fog={[40, 180]} />
      <hemisphereLight color="#fff4e0" groundColor="#5a6070" intensity={0.8} />
      <directionalLight color="#fff1d8" intensity={1.6} position={[-20, 40, -30]} />
      {/* Water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[24, 200]} /><meshStandardMaterial color="#4f7a78" roughness={0.3} metalness={0.2} /></mesh>
      {/* Low quays (bas-ports), walls, upper quays and streets */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Block p={[s * 10, 0.5, 0]} s={[4, 1, 200]} c="#cbbd9e" />
          <Block p={[s * 12.25, 2.5, 0]} s={[0.5, 5, 200]} c="#bfae8c" />
          <Block p={[s * 14, 4, 0]} s={[4, 0.2, 200]} c="#8a8478" />
          <Facades side={s} />
        </group>
      ))}
      {/* Footbridge: wooden deck on iron arches */}
      <Block p={[0, DECK_Y, 0]} s={[25, 0.25, 10]} c="#8a6a48" />
      {[-4.9, 4.9].map((z) => (
        <group key={z}>
          <Block p={[0, DECK_Y + 0.55, z]} s={[25, 0.05, 0.05]} c="#2a2d31" metal />
          {Array.from({length: 26}, (_, i) => <Block key={i} p={[-12.5 + i, DECK_Y + 0.3, z]} s={[0.04, 0.6, 0.04]} c="#2a2d31" />)}
        </group>
      ))}
      {[-6, 0, 6].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-3.5, 3.5].map((z) => <Block key={z} p={[0, DECK_Y - 0.6, z]} s={[6, 0.15, 0.15]} c="#2a2d31" metal />)}
          <Cyl p={[0, 1.2, 0]} rad={0.5} h={2.4} c="#bfae8c" />
        </group>
      ))}
      {!punch && (
        <group position={marcPos} rotation={[mix(0, -0.6, fallK), 0, 0]}>
          <group scale={S}>
            <GillMarc t={t} open={0} rate={0} cold={0} smile={t < JUMP ? 1 : 0}
              pose={jump > 0 ? {left: [-0.4, 2.1, -0.1], right: [0.4, 2.1, -0.1]} : {}} />
          </group>
        </group>
      )}
      {splash > 0 && (
        <group position={[0, 0.02, -7.0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={0.3 + 1.6 * splash}><ringGeometry args={[0.6, 1, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.8 * (1 - splash * 0.5)} /></mesh>
          {Array.from({length: 16}, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return <Ball key={i} p={[Math.cos(a) * 0.5 * splash, 1.6 * Math.sin(Math.PI * splash), Math.sin(a) * 0.5 * splash]} rad={0.07} c="#ffffff" detail={0} />;
          })}
        </group>
      )}
      {/* Punch: back on the low quay, wrapped in a blanket, Julien next to him */}
      {punch && (
        <>
          <group position={[8.6, 1.0, -8]} rotation={[0, Math.PI / 2, 0]}>
            <group scale={S}>
              <GillMarc t={t} open={1} rate={10} cold={cold} pose={{left: [-0.18, 1.35, -0.25], right: [0.18, 1.35, -0.25]}} />
              <Block p={[0, 1.25, 0.02]} s={[0.62, 0.75, 0.38]} c="#c8442a" />
            </group>
          </group>
          <group position={[9.3, 1.0, -7.3]} rotation={[0, Math.PI / 2 + 0.5, 0]}>
            <Person shirt="#3a6fb0" pants="#2f343c" skin="#d9a27c" hair="#1e1712" />
          </group>
        </>
      )}
    </group>
  );
};

// ---------- One litre of air vs one litre of water ----------
const pts = (seed: number, n: number) => {
  const r = seeded(seed);
  return Array.from({length: n}, () => [(r() - 0.5) * 0.6, (r() - 0.5) * 0.6, (r() - 0.5) * 0.6] as V3);
};
const AIR_PTS = pts(21, 30);
const WATER_PTS = pts(22, 1);
const Compare: React.FC<{t: number}> = ({t}) => {
  const fill = smooth(OXYGEN + 0.8, OXYGEN + 3.6, t);
  return (
    <group rotation={[0.25, Math.sin(t * 0.4) * 0.25, 0]}>
      <Look bg="#0b1424" />
      <ambientLight intensity={0.8} />
      <pointLight position={[2, 3, 4]} intensity={1.5} />
      {[[-0.5, AIR_PTS, '#ffffff', '#cfe6ff'], [0.5, WATER_PTS, '#ffffff', '#3a7ab8']].map(([x, p, dot, box], j) => (
        <group key={j} position={[x as number, 0, 0]}>
          <mesh><boxGeometry args={[0.7, 0.7, 0.7]} /><meshStandardMaterial color={box as string} transparent opacity={j ? 0.45 : 0.08} depthWrite={false} /></mesh>
          <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(0.7, 0.7, 0.7)]} /><lineBasicMaterial color="#8090b0" /></lineSegments>
          {(p as V3[]).map((q, i) => (i + 1) / (p as V3[]).length <= Math.max(fill, j ? 1 : 0) && (
            <Ball key={i} p={q} rad={0.035} c={dot as string} e="#ff5a5a" ei={0.6} detail={1} />
          ))}
        </group>
      ))}
    </group>
  );
};

// ---------- A bathtub filling up in three minutes (sped up) ----------
const Bath: React.FC<{t: number}> = ({t}) => {
  const level = smooth(BATH + 0.6, HEAVY - 1.0, t);
  const pour = level > 0 && level < 1;
  return (
    <group>
      <Look bg="#d8e8ee" />
      <hemisphereLight color="#ffffff" groundColor="#8a9098" intensity={0.9} />
      <directionalLight position={[2, 4, -3]} intensity={1.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[8, 8]} /><meshStandardMaterial color="#e8eef2" roughness={0.6} /></mesh>
      {Array.from({length: 16}, (_, i) => <Block key={i} p={[-4 + i * 0.5, 0.002, 0]} s={[0.01, 0.004, 8]} c="#c8d0d6" />)}
      <mesh position={[0, 1.4, 0.6]} rotation={[0, Math.PI, 0]}><planeGeometry args={[8, 2.8]} /><meshStandardMaterial color="#d8e8ee" roughness={0.9} /></mesh>
      {Array.from({length: 12}, (_, i) => <Block key={`t${i}`} p={[-3 + i * 0.5, 1.0, 0.598]} s={[0.01, 2, 0.004]} c="#bfd0d8" />)}
      {/* Open tub: walls and a rising water block */}
      <group position={[0, 0, 0.15]}>
        <Block p={[0, 0.04, 0]} s={[1.7, 0.08, 0.78]} c="#f4f4f2" />
        <Block p={[0, 0.3, -0.37]} s={[1.7, 0.6, 0.06]} c="#f4f4f2" />
        <Block p={[0, 0.3, 0.37]} s={[1.7, 0.6, 0.06]} c="#f4f4f2" />
        {[-1, 1].map((s) => <Block key={s} p={[s * 0.82, 0.3, 0]} s={[0.06, 0.6, 0.78]} c="#f4f4f2" />)}
        {level > 0.01 && (
          <mesh position={[0, 0.08 + 0.24 * level, 0]} scale={[1.58, 0.48 * level, 0.68]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#7fb6d6" transparent opacity={0.8} roughness={0.2} />
          </mesh>
        )}
        <Cyl p={[0.7, 0.75, 0.3]} rad={0.025} h={0.3} c="#c8ccd0" metal />
        <Cyl p={[0.7, 0.88, 0.22]} rad={0.02} h={0.16} r={[Math.PI / 2, 0, 0]} c="#c8ccd0" metal />
        {pour && <Cyl p={[0.7, 0.5 + 0.12 * level, 0.15]} rad={0.015} h={0.7 - 0.24 * level} c="#bfe8ff" />}
      </group>
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
    camera.near = 0.02;
    camera.far = 3000;
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

type View = {pos: THREE.Vector3; target: THREE.Vector3; fov: number};
type Shot = ShotOf<View>;
const NECK_Y = 0.4 + 1.64 * S;

export const SHOTS: Shot[] = [
  // Hook: underwater, gills flapping, struggling.
  {from: 0, view: (t, k) => ({pos: V(mix(0.5, 0.35, k), 1.35, mix(-2.7, -2.4, k)), target: V(0, 1.75, 0), fov: 46})},
  // On the footbridge, about to jump.
  {from: PLUNGE, view: (t, k) => ({pos: V(mix(5, 4, k), mix(2.2, 2.6, k), mix(-15, -14, k)), target: V(0, mix(5.5, 3, smooth(JUMP, SPLASH, t)), -6), fov: 50})},
  // Under the surface: the gills open.
  {from: DIVE, view: (t, k) => ({pos: V(mix(0.6, 0.45, k), NECK_Y + 0.05, mix(-0.9, -0.75, k)), target: V(0, NECK_Y, 0), fov: 42})},
  // One litre of air, one litre of water.
  {from: OXYGEN, view: (t, k) => ({pos: V(0, 0.15, mix(4.8, 4.4, k)), target: V(0, -0.1, 0), fov: 40})},
  // Water through the gills.
  {from: LITRES, view: (t, k) => ({pos: V(mix(1.0, 0.8, k), NECK_Y + 0.1, mix(-0.9, -0.7, k)), target: V(0, NECK_Y - 0.05, 0), fov: 42})},
  // A bathtub every three minutes.
  {from: BATH, view: (t, k) => ({pos: V(mix(1.6, 1.4, k), 1.6, mix(-1.9, -1.7, k)), target: V(0, 0.3, 0.15), fov: 46})},
  // Exhausted.
  {from: HEAVY, view: (t, k) => ({pos: V(mix(-0.7, -0.5, k), 1.4, mix(-2.0, -1.7, k)), target: V(0, 1.2, 0), fov: 46})},
  // Swimming: side view.
  {from: SWIM, view: (t, k) => ({pos: V(4.6, 1.5, swimZ(t) - 0.8), target: V(0, 1.15, swimZ(t) - 0.8), fov: 46})},
  // Close on the neck: blood cooling in the gills.
  {from: COLD, view: (t, k) => ({pos: V(mix(0.75, 0.6, k), NECK_Y - 0.1, mix(-1.2, -1.05, k)), target: V(0, NECK_Y - 0.25, 0), fov: 44})},
  // Wide: shivering in the murk.
  {from: HYPO, view: (t, k) => ({pos: V(mix(0.3, 0.1, k), 1.6, mix(-2.6, -2.2, k)), target: V(0, 1.15, 0), fov: 46})},
  // A fish swims by.
  {from: FISH, view: (t, k) => ({pos: V(mix(0.6, 0.3, k), 1.45, mix(-2.4, -2.1, k)), target: V(0, 1.3, -0.3), fov: 46})},
  // Punch: on the quay, wrapped up.
  {from: PUNCH, view: (t, k) => ({pos: V(mix(5.4, 5.8, k), 2.3, mix(-10.4, -10.0, k)), target: V(8.8, 2.0, -7.7), fov: 44})},
];
export const CUTS = cutsOf(SHOTS);
const shotAt = (t: number): View => shotAtOf(SHOTS, t, DURATION);

export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const view = shotAt(t);
  const world = worldAt(t);
  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} />
      {world === 'under' && <Under t={t} />}
      {world === 'river' && <River t={t} />}
      {world === 'compare' && <Compare t={t} />}
      {world === 'bath' && <Bath t={t} />}
    </>
  );
};
