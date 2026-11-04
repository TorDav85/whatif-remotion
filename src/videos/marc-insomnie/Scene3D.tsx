import React, {useLayoutEffect} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Block, Cyl, Ball, seeded} from '../../assets/kit';
import {Person} from '../../assets/Person';
import {CityBase} from '../../assets/city/CityBase';
import {CarBlue} from '../../assets/vehicles';
import {Bed, BedsideLamp, Bookshelf, Door, FloorLamp, InteriorWindow, Nightstand, PottedPlant, Rug, SingleBed, Sofa, WallClock} from '../../assets/interior';
import {Marc} from '../../shared/characters/Marc';
import {cutsOf, shotAt as shotAtOf, type Shot as ShotOf} from '../../shared/three/shots';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

// ---------- Story clock (s). Mirrored in scripts/audio/marc-insomnie.py ----------
export const NIGHT = 4.8;
export const DAY2 = 10.8;
export const JULIEN_IN = 12.8;
export const FORGET = 14.4;
export const MICRO = 16.8;
/** Micro-sleeps: the screen goes black for MICRO_LEN seconds. */
export const MICRO_AT = [19.6, 21.9];
export const MICRO_LEN = 0.8;
export const CAR = 23.8;
export const CAR_BLINK = 25.4;
export const CAR_BLINK_LEN = 1.0;
export const RULER = 26.6;
export const HALLUC = 29.4;
export const MORPH = 32.2;
export const SCARED = 33.2;
export const RECORD = 36.0;
export const GARDNER = 43.8;
export const RAT = 49.4;
export const WHY = 57.4;
export const BRAIN = 64.8;
export const PUNCH = 71.6;
export const END = 75.8;
export const DURATION = 80;

export type World = 'bedroom' | 'living' | 'highway' | 'street' | 'hospital' | 'lab' | 'brain';
export const worldAt = (t: number): World =>
  t < NIGHT ? 'bedroom' : t < CAR ? 'living' : t < HALLUC ? 'highway' : t < RECORD ? 'street' : t < GARDNER ? 'living'
    : t < RAT ? 'hospital' : t < BRAIN ? 'lab' : t < PUNCH ? 'brain' : 'bedroom';
/** 1964 archive look. */
export const isSepia = (t: number) => t >= GARDNER && t < RAT;
/** 0..1 black screen of a micro-sleep. */
export const blackoutAt = (t: number) => {
  const win = (a: number, len: number) => smooth(a - 0.08, a, t) * (1 - smooth(a + len, a + len + 0.12, t));
  return Math.max(...MICRO_AT.map((a) => win(a, MICRO_LEN)), win(CAR_BLINK, CAR_BLINK_LEN));
};
export const DIPS = [NIGHT, CAR, HALLUC, RECORD, GARDNER, RAT, BRAIN, PUNCH];

/** Hours awake shown in the HUD. */
export const hoursAt = (t: number) => {
  if (t < DAY2) return 20;
  if (t < MICRO) return 48;
  if (t < CAR) return 52 + 4 * smooth(MICRO, CAR, t);
  if (t < HALLUC) return 58;
  if (t < RECORD) return 80;
  if (t < GARDNER) return mix(80, 264, smooth(RECORD + 0.4, RECORD + 4.8, t));
  return 288;
};
export const dayAt = (t: number) => Math.max(1, Math.ceil(hoursAt(t) / 24));
/** How worn out Marc looks, 0..1. */
const tiredAt = (t: number) => clamp01((hoursAt(t) - 20) / 200);

const MODEL_H = 2.06;
const S = 1.8 / MODEL_H;

// ---------- Shared pieces ----------
/** Dark rings under Marc's eyes (model units, follows the head tilt from `cold`). */
const DarkCircles: React.FC<{amount: number; cold: number}> = ({amount, cold}) => {
  if (amount < 0.05) return null;
  const c = new THREE.Color('#efbd96').lerp(new THREE.Color('#5a3a52'), 0.25 + 0.55 * amount).getStyle();
  return (
    <group position={[0, 1.78, 0]} rotation={[cold * 0.09, 0, 0]}>
      {[-1, 1].map((s) => <Block key={s} p={[s * 0.067, 0.052, -0.153]} s={[0.055, 0.014 + 0.008 * amount, 0.006]} c={c} />)}
    </group>
  );
};

type MarcLook = {t: number; walk?: number; cold?: number; smile?: number; left?: V3; right?: V3};
const TiredMarc: React.FC<MarcLook> = ({t, walk = 0, cold = 0, smile = 0, left, right}) => (
  <>
    <Marc t={t} walk={walk} cold={cold} smile={smile} leftHand={left} rightHand={right} />
    <DarkCircles amount={tiredAt(t)} cold={cold} />
  </>
);

const Segment: React.FC<{a: V3; b: V3; w?: number; color?: string; opacity?: number}> = ({a, b, w = 0.02, color = '#ffe45c', opacity = 1}) => {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = d.length();
  if (len < 1e-4 || opacity <= 0.01) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return (
    <mesh position={A.clone().add(B).multiplyScalar(0.5)} quaternion={q} scale={[w, len, w]}>
      <cylinderGeometry args={[1, 1, 1, 6]} />
      <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
};

/** Room shell: back wall at z = 2.2, the camera usually looks toward +z. */
const Room: React.FC<{day: number; wall?: string; floor?: string}> = ({day, wall = '#d9cfbf', floor = '#a07a56'}) => {
  const w = new THREE.Color(wall).multiplyScalar(0.55 + 0.45 * day).getStyle();
  return (
    <group>
      <hemisphereLight color={day > 0.5 ? '#fff4e4' : '#7b86b8'} groundColor="#3a3028" intensity={0.45 + 0.35 * day} />
      <directionalLight color="#ffe9c8" intensity={1.4 * day} position={[-2, 4, 6]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} /><meshStandardMaterial color={floor} roughness={0.85} /></mesh>
      {Array.from({length: 26}, (_, i) => <Block key={i} p={[-5 + i * 0.4, 0.002, 0]} s={[0.01, 0.004, 10]} c="#7e5e42" />)}
      <mesh position={[0, 1.4, 2.2]} rotation={[0, Math.PI, 0]}><planeGeometry args={[10, 2.8]} /><meshStandardMaterial color={w} roughness={0.95} /></mesh>
      <mesh position={[-3, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[10, 2.8]} /><meshStandardMaterial color={w} roughness={0.95} /></mesh>
      <mesh position={[3, 1.4, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[10, 2.8]} /><meshStandardMaterial color={w} roughness={0.95} /></mesh>
      <mesh position={[0, 1.4, -3.5]}><planeGeometry args={[10, 2.8]} /><meshStandardMaterial color={w} roughness={0.95} /></mesh>
      <mesh position={[0, 2.8, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} /><meshStandardMaterial color="#efe9de" roughness={1} /></mesh>
    </group>
  );
};

// ---------- Bedroom (hook and punch): Marc lying on his back, eyes wide open ----------
const Bedroom: React.FC<{t: number}> = ({t}) => {
  const day = t >= PUNCH ? 0.85 : 0;
  return (
    <group>
      <Room day={day} wall="#c9d3dc" />
      <group position={[0, 0, 1.1]}><Bed duvet="#3a5a8a" /></group>
      <group position={[1.15, 0, 1.85]}><Nightstand /></group>
      <group position={[1.15, 0.55, 1.85]}><BedsideLamp lit={day > 0 ? 0 : 0.7} /></group>
      {day === 0 && <pointLight position={[0.8, 1.3, 1.3]} intensity={3.2} distance={5} color="#ffcf80" />}
      {/* Alarm clock, red digits */}
      <Block p={[1.0, 0.62, 1.72]} s={[0.2, 0.1, 0.08]} c="#1d1d1f" />
      <Block p={[1.0, 0.62, 1.677]} s={[0.15, 0.05, 0.005]} c="#ff3a2a" e="#ff3a2a" ei={1.6} />
      <group position={[-1.6, 0.9, 2.18]}><InteriorWindow curtain="#2b3a55" light={day > 0 ? 0.9 : 0.05} view={day > 0 ? '#bcd8f0' : '#101830'} /></group>
      <group position={[0, 0.69, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <group scale={S}><TiredMarc t={t} left={[-0.32, 0.95, 0.05]} right={[0.32, 0.95, 0.05]} /></group>
      </group>
    </group>
  );
};

// ---------- Living room (night 1, day 2, micro-sleeps, day 11) ----------
const SHELF_X = -0.6;
const STACK_X = 0.6;
const LOOP = 2.4;
const CAL: V3 = [1.0, 1.5, 2.17];

const Calendar: React.FC<{t: number}> = ({t}) => (
  <group position={CAL}>
    <Block p={[0, 0, 0]} s={[1.3, 0.9, 0.02]} c="#f6f3ec" />
    <Block p={[0, 0.36, -0.012]} s={[1.3, 0.18, 0.005]} c="#c8322a" />
    {Array.from({length: 14}, (_, i) => {
      const x = -0.54 + (i % 7) * 0.18;
      const y = 0.12 - Math.floor(i / 7) * 0.3;
      const on = i < 11 ? smooth(RECORD + 0.4 + i * 0.42, RECORD + 0.55 + i * 0.42, t) : 0;
      return (
        <group key={i} position={[x, y, -0.014]}>
          <Block p={[0, 0, 0]} s={[0.15, 0.24, 0.004]} c="#e3ddd0" />
          {on > 0 && [-1, 1].map((s) => <Block key={s} p={[0, 0, -0.004]} s={[0.04, 0.26 * on, 0.004]} r={[0, 0, s * 0.55]} c="#c8322a" />)}
        </group>
      );
    })}
  </group>
);

type Pose = {pos: V3; yaw: number; walk: number; cold: number; smile: number; left?: V3; right?: V3; box?: boolean; nod?: number};
const livingMarc = (t: number): Pose => {
  if (t < DAY2) {
    // 3 a.m.: carrying boxes from the shelf to tidy stacks, back and forth.
    const ph = ((t - NIGHT) % LOOP) / LOOP;
    const out = ph < 0.5;
    const k = smooth(0.05, 0.45, out ? ph : ph - 0.5);
    const x = out ? mix(SHELF_X, STACK_X, k) : mix(STACK_X, SHELF_X, k);
    return {pos: [x, 0, 1.0], yaw: out ? -Math.PI / 2 : Math.PI / 2, walk: 0.9, cold: 0, smile: 1,
      left: out ? [-0.2, 1.12, -0.3] : undefined, right: out ? [0.2, 1.12, -0.3] : undefined, box: out};
  }
  if (t < MICRO) {
    // Patting his pockets for the keys, then lost in front of Julien.
    const pat = Math.sin(t * 6);
    return {pos: [0.4, 0, 0.7], yaw: t >= JULIEN_IN + 1 ? -0.6 : 0, walk: 0, cold: 0.6, smile: 0,
      left: t < JULIEN_IN + 1 ? [-0.3, 0.9 + 0.05 * pat, -0.08] : undefined,
      right: t < JULIEN_IN + 1 ? [0.3, 0.9 - 0.05 * pat, -0.08] : t >= FORGET ? [0.25, 1.35, -0.35] : undefined};
  }
  if (t < CAR) {
    const nod = Math.max(...MICRO_AT.map((a) => smooth(a, a + 0.4, t) * (1 - smooth(a + MICRO_LEN, a + MICRO_LEN + 0.2, t))));
    return {pos: [0.3, 0, 0.8], yaw: 0, walk: 0, cold: 0.3, smile: 0, right: [0.2, 1.25, -0.3], nod};
  }
  return {pos: [0.1, 0, 1.2], yaw: 0, walk: 0, cold: 0.7, smile: 0};
};

const julienLiving = (t: number) => {
  if (t < JULIEN_IN || t >= MICRO) return null;
  const k = smooth(JULIEN_IN, JULIEN_IN + 1.2, t);
  const pos = mixV([2.6, 0, 0.2], [1.6, 0, 0.2], k);
  return {pos, yaw: Math.PI / 2 - (k >= 1 ? 0.25 : 0), pose: k < 1 ? 'marche' as const : 'debout' as const, phase: t * 7};
};

const Living: React.FC<{t: number}> = ({t}) => {
  const night = t < DAY2;
  const day = night ? 0 : t >= RECORD ? 0.65 : 0.9;
  const m = livingMarc(t);
  const j = julienLiving(t);
  const stacked = night ? Math.min(8, Math.floor((t - NIGHT) / LOOP + 0.5)) : 8;
  return (
    <group>
      <Room day={day} />
      <group position={[-1.9, 0, 2.0]}><Bookshelf width={1.2} /></group>
      <group position={[-0.4, 0, 2.0]}><Sofa width={1.8} /></group>
      <group position={[-0.4, 0, 1.2]}><Rug w={2.2} d={1.4} /></group>
      <group position={[2.2, 0, 1.9]}><FloorLamp lit={night ? 1 : 0} /></group>
      <group position={[2.98, 0, 0.2]} rotation={[0, -Math.PI / 2, 0]}><Door /></group>
      <group position={[2.55, 0, -1.2]}><PottedPlant size={1.1} /></group>
      {night && <pointLight position={[0, 2.4, 0.4]} intensity={2.6} distance={7} color="#ffd9a0" />}
      {t >= RECORD ? <Calendar t={t} /> : <group position={[1.2, 1.2, 2.18]}><WallClock time={night ? 3 + (t - NIGHT) / 120 : 9.5} /></group>}
      {/* Tidy stacks of boxes, two columns */}
      {Array.from({length: stacked}, (_, i) => (
        <Block key={i} p={[STACK_X + 0.35 + (i % 2) * 0.5, 0.15 + Math.floor(i / 2) * 0.3, 1.75]} s={[0.45, 0.28, 0.32]} c={i % 3 ? '#c49a62' : '#b5874e'} />
      ))}
      {/* Keys on their hook by the door, in plain sight */}
      <Block p={[2.97, 1.35, -0.55]} s={[0.02, 0.06, 0.2]} c="#6d5a44" />
      <Ball p={[2.94, 1.27, -0.55]} rad={0.03} c="#e0c040" e="#806010" ei={0.4} detail={0} />
      <group position={m.pos} rotation={[m.nod ? 0.08 * m.nod : 0, m.yaw, 0]}>
        <group scale={S}>
          <TiredMarc t={t} walk={m.walk} cold={m.cold} smile={m.smile} left={m.left} right={m.right} />
          {m.box && <Block p={[0, 1.2, -0.38]} s={[0.46, 0.32, 0.32]} c="#c49a62" />}
          {t >= MICRO && t < CAR && (
            <group position={[0.18, 1.25, -0.36]}>
              <Cyl p={[0, 0, 0]} rad={0.05} h={0.11} c="#f4f1ea" />
              <Cyl p={[0, 0.052, 0]} rad={0.043} h={0.005} c="#4a2c1a" />
            </group>
          )}
        </group>
      </group>
      {j && (
        <group position={j.pos} rotation={[0, j.yaw, 0]}>
          <Person shirt="#3a6fb0" pants="#2f343c" skin="#d9a27c" hair="#1e1712" pose={j.pose} phase={j.phase} />
        </group>
      )}
    </group>
  );
};

// ---------- Highway (car frame: the car stays at the origin, the road scrolls toward +z) ----------
export const SPEED = 110 / 3.6;
const wrap = (z: number, span: number) => ((z % span) + span) % span;
const TREES = (() => {
  const r = seeded(14);
  return Array.from({length: 40}, (_, i) => ({x: (i % 2 ? 1 : -1) * (12 + r() * 30), z0: r() * 400, s: 0.8 + r() * 0.8}));
})();
/** Lateral drift during the 1 s blackout, then the correction. */
export const driftAt = (t: number) => 1.7 * smooth(CAR_BLINK, CAR_BLINK + CAR_BLINK_LEN, t) * (1 - smooth(CAR_BLINK + CAR_BLINK_LEN + 0.2, CAR_BLINK + CAR_BLINK_LEN + 1.4, t));

const Highway: React.FC<{t: number}> = ({t}) => {
  const run = (t - CAR) * SPEED;
  const drift = driftAt(t);
  const ruler = smooth(RULER, RULER + 0.6, t);
  return (
    <group>
      <color attach="background" args={['#a9cdee']} />
      <fog attach="fog" args={['#cfe0ee', 60, 260]} />
      <hemisphereLight color="#fff4e0" groundColor="#5a7a40" intensity={0.7} />
      <directionalLight color="#fff1d8" intensity={1.6} position={[30, 50, 20]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -100]}><planeGeometry args={[600, 600]} /><meshStandardMaterial color="#6f9a4a" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -100]}><planeGeometry args={[12, 600]} /><meshStandardMaterial color="#4a4d52" roughness={0.9} /></mesh>
      {[-5.6, 5.6].map((x) => <Block key={x} p={[x, 0.005, -100]} s={[0.15, 0.01, 600]} c="#f2f2ee" />)}
      {[-1.8, 1.8].flatMap((x) => Array.from({length: 22}, (_, i) => (
        <Block key={`${x}${i}`} p={[x, 0.006, wrap(i * 13 + run, 286) - 250]} s={[0.15, 0.01, 3]} c="#f2f2ee" />
      )))}
      {[-6.6, 6.6].map((x) => <Block key={x} p={[x, 0.55, -100]} s={[0.08, 0.3, 600]} c="#b8bcc2" metal />)}
      {[-6.6, 6.6].flatMap((x) => Array.from({length: 40}, (_, i) => (
        <Block key={`p${x}${i}`} p={[x, 0.3, wrap(i * 6 + run, 240) - 210]} s={[0.1, 0.6, 0.1]} c="#8a9098" />
      )))}
      {TREES.map((tr, i) => {
        const z = wrap(tr.z0 + run, 400) - 340;
        return (
          <group key={i} position={[tr.x, 0, z]} scale={tr.s}>
            <Cyl p={[0, 1, 0]} rad={0.25} h={2} c="#6a4a30" />
            <Ball p={[0, 3, 0]} rad={1.6} c="#3f6b34" />
          </group>
        );
      })}
      <CarBlue position={[drift, 0, 0]} rotation={[0, -0.12 * (smooth(CAR_BLINK, CAR_BLINK + 0.5, t) - smooth(CAR_BLINK + CAR_BLINK_LEN, CAR_BLINK + CAR_BLINK_LEN + 0.6, t)), 0]} wheelSpin={run / 0.3} />
      {/* The 30 m covered blind, drawn behind the car */}
      {ruler > 0 && (
        <group>
          <Block p={[0.85, 0.02, 1.8 + 15.3 * ruler]} s={[1.9, 0.01, 30.6 * ruler]} c="#ffd23a" e="#ffb400" ei={0.6} o={0.75} />
          {[0, 30.6].map((z) => <Block key={z} p={[0.85, 0.3, 1.8 + z * ruler]} s={[2.4, 0.6, 0.15]} c="#ffd23a" e="#ffb400" ei={0.8} />)}
        </group>
      )}
    </group>
  );
};

// ---------- Street at night: the sign turns into a man ----------
const SIGN: V3 = [5.4, 0.15, -2.5];
const streetMarc = (t: number): Pose => {
  const k = smooth(HALLUC, MORPH + 0.4, t);
  const z = mix(4.5, 1.5, k);
  return {pos: [6.4, 0.15, z], yaw: 0, walk: k < 1 ? 0.8 : 0, cold: t >= MORPH + 0.6 ? 1 : 0.3, smile: 0,
    left: t >= SCARED ? [-0.28, 1.25, -0.25] : undefined, right: t >= SCARED ? [0.28, 1.25, -0.25] : undefined};
};
const Street: React.FC<{t: number; view: View}> = ({t, view}) => {
  const m = streetMarc(t);
  const morph = smooth(MORPH, MORPH + 0.9, t);
  return (
    <CityBase time={t} seed={11} lit={1} traffic={false} crowd={false} fogFar={220} focus={view.pos.z - 10} skyTop="#0b1230" skyBottom="#232b4a">
      <hemisphereLight color="#8fa0d0" groundColor="#222" intensity={0.25} />
      {/* The no-entry sign shrinks while the shadow man grows in its place */}
      {morph < 1 && (
        <group position={SIGN} scale={[1, 1 - morph, 1]}>
          <Cyl p={[0, 1.3, 0]} rad={0.04} h={2.6} c="#9aa0a8" metal />
          <group position={[0, 2.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <Cyl p={[0, 0, 0]} rad={0.32} h={0.03} c="#c8202a" />
            <Block p={[0, -0.02, 0]} s={[0.4, 0.01, 0.09]} c="#ffffff" />
          </group>
        </group>
      )}
      {morph > 0 && (
        <group position={SIGN} rotation={[0, Math.PI - 0.15, 0]} scale={0.25 + 0.8 * morph}>
          <Person shirt="#08080a" pants="#08080a" skin="#0c0c10" hair="#050507" shoes="#050507" height={1.12} />
          {[-1, 1].map((s) => <Ball key={s} p={[s * 0.06, 1.88, -0.13]} rad={0.022} c="#ff2a2a" e="#ff2a2a" ei={4 * morph} detail={0} />)}
        </group>
      )}
      <group position={m.pos} rotation={[0, m.yaw, 0]}>
        <group scale={S}><TiredMarc t={t} walk={m.walk} cold={m.cold} left={m.left} right={m.right} /></group>
      </group>
    </CityBase>
  );
};

// ---------- 1964: a record holder sleeps fourteen hours (archive look) ----------
const Hospital: React.FC<{t: number}> = ({t}) => (
  <group>
    <Room day={0.8} wall="#cfdcc8" floor="#b8b2a2" />
    <group position={[0, 0, 0.6]}><SingleBed wood="#8a9098" duvet="#c8b898" /></group>
    <group position={[0.2, 0.62, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
      <Person shirt="#3a5a8a" pants="#3a5a8a" skin="#e8b894" hair="#3a2a1e" />
    </group>
    <group position={[-1.3, 0.9, 2.18]}><InteriorWindow curtain="#9aa88a" light={0.4 + 0.5 * Math.sin(Math.PI * smooth(GARDNER, RAT, t))} /></group>
    <group position={[0.9, 1.8, 2.18]}><WallClock time={8 + 14 * smooth(GARDNER + 0.4, RAT - 0.6, t)} /></group>
  </group>
);

// ---------- Lab: a rat on the disk-over-water apparatus ----------
const Rat: React.FC<{t: number; shiver: number}> = ({t, shiver}) => (
  <group position={[Math.sin(t * 40) * 0.003 * shiver, 0, 0]} scale={[1, 1 - 0.12 * shiver, 1]}>
    <Ball p={[0, 0.045, 0]} rad={1} s={[0.045, 0.04, 0.09]} c="#f2efe8" />
    <Ball p={[0, 0.05, -0.095]} rad={1} s={[0.03, 0.028, 0.045]} c="#f2efe8" />
    <Ball p={[0, 0.045, -0.14]} rad={0.008} c="#f0a0a8" detail={0} />
    {[-1, 1].map((s) => <Ball key={s} p={[s * 0.022, 0.08, -0.085]} rad={0.014} s={[1, 1, 0.4]} c="#f4b8c0" detail={0} />)}
    {[-1, 1].map((s) => <Ball key={`e${s}`} p={[s * 0.016, 0.062, -0.122]} rad={0.005} c="#c0203a" detail={0} />)}
    {Array.from({length: 6}, (_, i) => (
      <Ball key={`t${i}`} p={[Math.sin(i * 0.6 + t * 2) * 0.01 * i, 0.02, 0.09 + i * 0.022]} rad={0.007} c="#f0b0b8" detail={0} />
    ))}
  </group>
);

const Lab: React.FC<{t: number}> = ({t}) => {
  const close = t >= WHY;
  const cold = smooth(WHY + 0.5, BRAIN - 0.8, t);
  const spin = (t - RAT) * 0.35;
  return (
    <group>
      <Room day={1 - 0.45 * cold} wall="#e8ecee" floor="#c9ced2" />
      <pointLight position={[0, 2.3, 0]} intensity={1.2 * (1 - 0.5 * cold)} distance={6} color={new THREE.Color('#ffffff').lerp(new THREE.Color('#9fc4ff'), cold).getStyle()} />
      {/* Bench */}
      <Block p={[0, 0.88, 0]} s={[2.4, 0.06, 0.9]} c="#d8dcdf" />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Block key={`${sx}${sz}`} p={[sx * 1.1, 0.43, sz * 0.38]} s={[0.06, 0.86, 0.06]} c="#8a9098" metal />))}
      {/* Water tray, rotating disk, divider, clear cage */}
      <Block p={[0, 0.96, 0]} s={[1.0, 0.1, 0.6]} c="#3a7ab8" e="#1a4a78" ei={0.2} o={0.7} />
      <group position={[0, 1.03, 0]} rotation={[0, spin, 0]}>
        <Cyl p={[0, 0, 0]} rad={0.42} h={0.015} c="#5a5f66" metal />
        <Block p={[0.2, 0.008, 0]} s={[0.3, 0.004, 0.02]} c="#e8c040" />
      </group>
      <Block p={[0, 1.2, 0]} s={[0.01, 0.34, 0.6]} c="#d8eaf4" o={0.35} />
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[1.0, 0.34, 0.6]} />
        <meshStandardMaterial color="#e6f2fa" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <group position={[-0.22, 1.04, -0.05]} rotation={[0, -0.6, 0]}><Rat t={t} shiver={close ? cold : 0} /></group>
      {/* Thermometer beside the cage: the red column drops */}
      <group position={[0.5, 0.91, -0.38]}>
        <Block p={[0, 0.3, 0]} s={[0.07, 0.6, 0.03]} c="#f4f4f2" />
        <Block p={[0, 0.06 + 0.24 * (1 - 0.55 * cold), -0.016]} s={[0.025, 0.48 * (1 - 0.55 * cold), 0.005]} c="#d8202a" />
        <Ball p={[0, 0.03, -0.01]} rad={0.035} c="#d8202a" detail={1} />
      </group>
    </group>
  );
};

// ---------- Brain: neurons, synapses, and astrocytes eating some of them (mouse) ----------
const NODES: V3[] = (() => {
  const r = seeded(5);
  return Array.from({length: 14}, () => {
    const a = r() * Math.PI * 2;
    const b = Math.acos(2 * r() - 1);
    const d = 0.6 + r() * 1.2;
    return [d * Math.sin(b) * Math.cos(a), d * Math.cos(b) * 1.3, d * Math.sin(b) * Math.sin(a)] as V3;
  });
})();
const EDGES = (() => {
  const out: {a: number; b: number; kill: number | null}[] = [];
  for (let i = 0; i < NODES.length; i++) for (let j = i + 1; j < NODES.length; j++) {
    const d = Math.hypot(NODES[i][0] - NODES[j][0], NODES[i][1] - NODES[j][1], NODES[i][2] - NODES[j][2]);
    if (d < 1.35) out.push({a: i, b: j, kill: null});
  }
  // Every other connection gets eaten, one after the other.
  out.forEach((e, k) => { if (k % 2 === 0) e.kill = BRAIN + 2.2 + (k / out.length) * 3.6; });
  return out;
})();

const BrainScene: React.FC<{t: number}> = ({t}) => (
  <group>
    <color attach="background" args={['#0a0818']} />
    <ambientLight intensity={0.6} />
    <pointLight position={[3, 3, 4]} intensity={2} color="#b8a0ff" />
    {NODES.map((p, i) => <Ball key={i} p={p} rad={0.12} c="#7a6ad8" e="#6a5ae8" ei={0.8} />)}
    {EDGES.map((e, k) => {
      const A = NODES[e.a];
      const B = NODES[e.b];
      const gone = e.kill === null ? 0 : smooth(e.kill, e.kill + 0.8, t);
      const mid = mixV(A, B, 0.5);
      const pulse = mixV(A, B, (t * 0.7 + k * 0.37) % 1);
      const eater = e.kill !== null && t > e.kill - 1.4 && gone < 1;
      const near = e.kill !== null ? smooth(e.kill - 1.4, e.kill, t) : 0;
      return (
        <group key={k}>
          <Segment a={A} b={B} w={0.018} color="#a898ff" opacity={1 - gone} />
          {gone < 1 && <Ball p={mid} rad={0.05 * (1 - gone)} c="#ffe45c" e="#ffd23a" ei={1.2} detail={0} />}
          {gone < 0.5 && <Ball p={pulse} rad={0.03} c="#ffffff" e="#ffffff" ei={2} detail={0} />}
          {eater && (
            <group position={mixV([mid[0] * 1.6, mid[1] * 1.6 + 0.4, mid[2] * 1.6], mid, near)} scale={0.11 * (1 + 0.15 * Math.sin(t * 9 + k))}>
              <Ball p={[0, 0, 0]} rad={1} c="#5ad86a" e="#30a040" ei={0.6} />
              {[[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((d, i) => (
                <Ball key={i} p={[d[0] * 1.2, d[1] * 1.2, d[2] * 1.2]} rad={0.45} c="#5ad86a" detail={0} />
              ))}
            </group>
          )}
        </group>
      );
    })}
  </group>
);

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
const around = (t: number, r: number, y: number, speed: number) => V(Math.sin(t * speed) * r, y, Math.cos(t * speed) * r);

export const SHOTS: Shot[] = [
  // Hook: 3 a.m., lying in bed, eyes wide open.
  {from: 0, view: (t, k) => ({pos: V(mix(0.55, 0.45, k), mix(1.9, 1.8, k), mix(1.0, 1.15, k)), target: V(0, 0.78, 1.72), fov: 48})},
  // Night 1: tidying the whole flat.
  {from: NIGHT, view: (t, k) => ({pos: V(mix(0.0, 0.15, k), 1.6, mix(-2.3, -2.1, k)), target: V(0.1, 1.1, 1.1), fov: 60})},
  // 48 h: where are the keys?
  {from: DAY2, view: (t, k) => ({pos: V(mix(-0.3, -0.1, k), 1.55, mix(-1.8, -1.6, k)), target: V(0.5, 1.4, 0.7), fov: 50})},
  // Julien comes in: who is that?
  {from: JULIEN_IN, view: (t, k) => ({pos: V(mix(-0.9, -0.7, k), 1.5, mix(-2.2, -2.0, k)), target: V(1.0, 1.25, 0.5), fov: 54})},
  // Micro-sleeps: close on his face.
  {from: MICRO, view: (t, k) => ({pos: V(0.3, 1.6, mix(-0.75, -0.6, k)), target: V(0.3, 1.45, 0.8), fov: 44})},
  // Highway, chase cam.
  {from: CAR, view: (t, k) => ({pos: V(0.9 + 0.5 * driftAt(t), 2.1, 7.5), target: V(0.3 * driftAt(t), 0.9, -10), fov: 55})},
  // From above: the 30 m driven blind.
  {from: RULER - 0.4, view: (t, k) => ({pos: V(mix(7, 6, k), mix(15, 16, k), mix(42, 44, k)), target: V(0.5, 0, 7), fov: 46})},
  // Night street, over his shoulder: a sign.
  {from: HALLUC, view: (t, k) => ({pos: V(7.8, 1.8, mix(7.6, 5.0, k)), target: V(5.4, 1.7, -2.5), fov: 48})},
  // His face: scared.
  {from: SCARED, view: (t, k) => ({pos: V(6.25, 1.6, mix(0.0, 0.2, k)), target: V(6.4, 1.75, 1.5), fov: 46})},
  // Day 11: crossing off the calendar.
  {from: RECORD, view: (t, k) => ({pos: V(mix(-0.2, 0.0, k), 1.55, mix(-1.5, -1.2, k)), target: V(0.5, 1.45, 1.6), fov: 50})},
  // 1964: fourteen hours of sleep.
  {from: GARDNER, view: (t, k) => ({pos: V(mix(1.1, 0.95, k), 1.65, mix(0.4, 0.55, k)), target: V(0.2, 0.68, 1.15), fov: 46})},
  // The lab: a rat on a disk over water.
  {from: RAT, view: (t, k) => ({pos: V(mix(0.7, 0.6, k), 1.4, mix(-1.0, -0.85, k)), target: V(-0.1, 1.05, 0), fov: 42})},
  // Close on the rat and the thermometer.
  {from: WHY, view: (t, k) => ({pos: V(mix(0.1, 0.05, k), 1.2, mix(-0.75, -0.6, k)), target: V(-0.12, 1.05, -0.12), fov: 42})},
  // Inside a mouse brain.
  {from: BRAIN, view: (t, k) => ({pos: around(t, mix(6.5, 5.2, k), 0.8, 0.12), target: V(0, 0, 0), fov: 50})},
  // Back to bed, still awake.
  {from: PUNCH, view: (t, k) => ({pos: V(mix(-0.55, -0.45, k), mix(1.9, 1.8, k), mix(1.0, 1.15, k)), target: V(0, 0.78, 1.72), fov: 48})},
];
export const CUTS = cutsOf(SHOTS);

const shotAt = (t: number): View => shotAtOf(SHOTS, t, DURATION);

export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const view = shotAt(t);
  const world = worldAt(t);
  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} />
      {world === 'bedroom' && <Bedroom t={t} />}
      {world === 'living' && <Living t={t} />}
      {world === 'highway' && <Highway t={t} />}
      {world === 'street' && <Street t={t} view={view} />}
      {world === 'hospital' && <Hospital t={t} />}
      {world === 'lab' && <Lab t={t} />}
      {world === 'brain' && <BrainScene t={t} />}
    </>
  );
};
