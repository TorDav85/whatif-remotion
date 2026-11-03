import React, {useMemo} from 'react';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Block} from '../../assets/kit';
import {EiffelTower} from '../../assets/EiffelTower';
import {Person, PEOPLE_PRESETS} from '../../assets/Person';
import {CityBase} from '../../assets/city/CityBase';
import {CameraRig, Stars, useGlowTexture} from '../../shared/three/common';
import {EarthGlobe, hotspotVector, lonLatUV} from '../../shared/three/EarthGlobe';
import {Marc} from '../../shared/characters/Marc';
import {cutsOf, shotAt as shotAtOf, type Shot as ShotOf} from '../../shared/three/shots';

type V3 = [number, number, number];
type View = {pos: V3; target: V3; fov: number; shake?: number};

const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
/** Target that frames two points at once (bisector of both directions). */
const between = (cam: V3, a: V3, b: V3, wa = 0.5): V3 => add(cam, norm(add(norm(sub(a, cam)), norm(sub(b, cam)), 1 / wa - 1)), 100);

// ---------- Story clock ----------
export const IMPACT = 25;
const IMPACT_POS: V3 = [0, 0, -270];
const EIFFEL_Z = -360;
const START: V3 = [70, 430, -1000];

/** Asteroid position: crawls across the sky, then rushes in during the last seconds. */
export const asteroidAt = (t: number): V3 => {
  const e = Math.pow(clamp01(t / IMPACT), 4);
  return mixV(START, IMPACT_POS, e);
};
const after = (t: number) => Math.max(0, t - IMPACT);
/** Ground shock ring (fast) and rolling dust wall (slow), radii in metres from the impact. */
const shockR = (t: number) => 70 * after(t);
export const dustR = (t: number) => 25.2 * after(t);

// ---------- Marc ----------
const MARC_X = 6.4;
const STOP = 14.6;
const RUN = 33.3;
const marcZ = (t: number) => (t < RUN ? 26 - 1.3 * Math.min(t, STOP) : 26 - 1.3 * STOP + 3.2 * (t - RUN));
const marcX = (t: number) => (t < RUN ? MARC_X : mix(MARC_X, 0.9, (t - RUN) / 0.8));
const marcHead = (t: number): V3 => [marcX(t), 1.95, marcZ(t)];

// ---------- Space shot (Paris seen from orbit) ----------
const PARIS = lonLatUV(2.35, 48.86);
const parisNormal = () => {
  const hp = hotspotVector(PARIS.hu, PARIS.hv);
  const yaw = Math.atan2(-hp.x, hp.z);
  return hp.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.55);
};
const N = parisNormal();
const SIDE = new THREE.Vector3(0, 1, 0).cross(N).normalize();
const UP = N.clone().cross(SIDE).normalize();
const orbit = (n: number, s: number, u: number): V3 => {
  const v = N.clone().multiplyScalar(n).addScaledVector(SIDE, s).addScaledVector(UP, u);
  return [v.x, v.y, v.z];
};
const SPACE = {from: 7, to: 11};

// ---------- Camera: one shot per beat ----------
type Shot = ShotOf<View>;

export const SHOTS: Shot[] = [
  // Hook: the whole avenue, the tower, and a bright dot already in the sky.
  {from: 0, view: (t, k) => ({pos: mixV([28, 52, 66], [22, 46, 54], k), target: [62, 118, -360], fov: 55})},
  // Marc walks to work, framed 3/4 front.
  {from: 3.2, view: (t) => {
    const z = marcZ(t);
    return {pos: [4.75, 1.62, z - 3.1], target: [MARC_X - 0.2, 1.5, z], fov: 50};
  }},
  // Space: the rock overtakes the camera and dives toward Paris.
  {from: SPACE.from, view: (t, k) => ({pos: mixV(orbit(4.3, 0.9, 0.35), orbit(4.0, 0.8, 0.3), k), target: orbit(1, 0, 0.1), fov: 40})},
  // Low angle from the street: a second star in broad daylight.
  {from: 11, view: (t, k) => {
    const pos = mixV([0, 1.4, 14], [0, 1.15, 12.8], k);
    const d = norm(sub(asteroidAt(t), pos));
    return {pos, target: add(pos, [d[0], d[1] - 0.24, d[2]], 100), fov: 55};
  }},
  // Close-up: Marc looks up, phone screaming.
  {from: STOP, view: (t, k) => {
    const z = marcZ(t);
    return {pos: mixV([MARC_X - 0.6, 1.66, z - 1.75], [MARC_X - 0.5, 1.64, z - 1.45], k), target: [MARC_X, 1.9, z], fov: 45, shake: 0.08};
  }},
  // Street level: the crowd panics, the fireball grows above the tower.
  {from: 18.4, view: (t, k) => {
    const pos = mixV([0.3, 1.3, 16], [0.3, 1.2, 14.8], k);
    return {pos, target: between(pos, [0, 60, EIFFEL_Z], asteroidAt(t)), fov: 56, shake: 0.15 + 0.2 * k};
  }},
  // Last seconds: high above the street, the rock hits in front of the tower.
  {from: 22.2, view: (t, k) => {
    const pos = mixV([-8, 20, 34], [-7, 17, 28], k);
    return {pos, target: between(pos, [0, 30, EIFFEL_Z], asteroidAt(t), 0.55), fov: 54, shake: 0.3 + 0.7 * k};
  }},
  // Aftermath: wide view, fireball and shock ring.
  {from: IMPACT, view: (t, k) => ({pos: mixV([72, 46, 40], [64, 54, 22], k), target: [0, 48, -280], fov: 54, shake: 1.2 * (1 - k) + 0.25})},
  // The tower bends under the blast, seen from the side.
  {from: 29, view: (t, k) => ({pos: mixV([-215, 34, -322], [-200, 40, -332], k), target: [0, 56, EIFFEL_Z], fov: 50, shake: 0.5})},
  // Marc runs toward us, the dust wall rolling down the avenue behind him.
  {from: RUN, view: (t, k) => {
    const z = marcZ(t);
    return {pos: [0, 1.6, z + 5.2], target: [0.4, 4.2, z - 30], fov: 58, shake: 0.35 + 0.5 * k};
  }},
];
export const CUTS = cutsOf(SHOTS);

const shotAt = (t: number): View => shotAtOf(SHOTS, t, 40);

const shaken = (v: View, t: number): View => {
  const s = v.shake ?? 0;
  if (s <= 0) return v;
  const d = Math.hypot(...sub(v.target, v.pos));
  const a = s * 0.012 * d;
  const j = (f: number, p: number) => Math.sin(t * f + p) * Math.sin(t * f * 0.37 + p * 2);
  return {...v, target: add(v.target, [j(31, 1) * a, j(27, 4) * a, j(23, 7) * a]), pos: add(v.pos, [j(19, 2) * s * 0.05, j(17, 5) * s * 0.05, 0])};
};

// ---------- Sky ----------
const SKY = [
  {t: 0, top: '#5b8fd1', bottom: '#e9e1cf'},
  {t: 17, top: '#5f8ccc', bottom: '#ece0c8'},
  {t: 24.9, top: '#8a7aa8', bottom: '#f6c78e'},
  {t: 25.6, top: '#c9764a', bottom: '#ffd9a0'},
  {t: 30, top: '#6a4638', bottom: '#d89a64'},
  {t: 36, top: '#3e322e', bottom: '#a8805e'},
];
const skyAt = (t: number) => {
  let i = 0;
  while (i < SKY.length - 2 && t > SKY[i + 1].t) i++;
  const a = SKY[i];
  const b = SKY[i + 1];
  const k = smooth(a.t, b.t, t);
  const c = (x: string, y: string) => '#' + new THREE.Color(x).lerp(new THREE.Color(y), k).getHexString();
  return {top: c(a.top, b.top), bottom: c(a.bottom, b.bottom)};
};

// ---------- Asteroid ----------
const Asteroid: React.FC<{t: number; p: V3; radius: number; glowSize: number; tail: number}> = ({t, p, radius, glowSize, tail}) => {
  const glow = useGlowTexture();
  const rock = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const s = 0.82 + 0.3 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1);
      pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * s, pos.getZ(i) * s);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const dir = norm(sub(START, IMPACT_POS));
  return (
    <group>
      <mesh geometry={rock} position={p} scale={radius} rotation={[t * 0.7, t * 1.1, 0]}>
        <meshBasicMaterial color="#ffb070" fog={false} />
      </mesh>
      <sprite position={p} scale={[glowSize, glowSize, 1]}>
        <spriteMaterial map={glow} color="#fff1d0" fog={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {Array.from({length: 14}, (_, i) => {
        const k = (i + 1) / 14;
        const s = glowSize * (0.75 - k * 0.55);
        return (
          <sprite key={i} position={add(p, dir, tail * k)} scale={[s, s, 1]}>
            <spriteMaterial map={glow} color={i < 4 ? '#ffd28a' : '#ff8a3a'} fog={false} transparent opacity={0.85 * (1 - k)} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        );
      })}
    </group>
  );
};

// ---------- Impact ----------
const Impact: React.FC<{t: number}> = ({t}) => {
  const glow = useGlowTexture();
  const dt = after(t);
  if (dt <= 0) return null;
  const [x, , z] = IMPACT_POS;
  const ball = 70 * Math.sqrt(smooth(0, 3, dt));
  const hot = new THREE.Color('#fff6dc').lerp(new THREE.Color('#ff7a2a'), smooth(0.2, 2.2, dt)).lerp(new THREE.Color('#5e4a3c'), smooth(2.5, 8, dt));
  const cap = smooth(2, 9, dt);
  const ring = shockR(t);
  const dust = dustR(t);
  return (
    <group>
      <mesh position={[x, 0, z]} scale={[ball, ball * 0.9, ball]}>
        <sphereGeometry args={[1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={hot} fog={false} transparent opacity={0.96} />
      </mesh>
      {cap > 0 && (
        <>
          <mesh position={[x, 35 + 55 * cap, z]}>
            <cylinderGeometry args={[16, 26, 70 + 110 * cap, 12, 1, true]} />
            <meshBasicMaterial color="#6d5646" fog={false} transparent opacity={0.85 * cap} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[x, 80 + 100 * cap, z]} scale={[40 + 50 * cap, (40 + 50 * cap) * 0.55, 40 + 50 * cap]}>
            <sphereGeometry args={[1, 20, 12]} />
            <meshBasicMaterial color={new THREE.Color('#ff9a4a').lerp(new THREE.Color('#5a463a'), cap)} fog={false} transparent opacity={0.92 * cap} />
          </mesh>
        </>
      )}
      {dt < 6 && (
        <mesh position={[x, 0.7, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(0.1, ring - 8), ring, 64]} />
          <meshBasicMaterial color="#fff3e0" transparent opacity={0.75 * (1 - dt / 6)} side={THREE.DoubleSide} fog={false} depthWrite={false} />
        </mesh>
      )}
      <sprite position={[x, 30, z]} scale={[320 * Math.exp(-dt * 0.5), 320 * Math.exp(-dt * 0.5), 1]}>
        <spriteMaterial map={glow} color="#fff0c8" fog={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh position={[x, 15, z]}>
        <cylinderGeometry args={[dust, dust + 4, 30, 72, 1, true]} />
        <meshBasicMaterial color="#5e4a3a" fog={false} side={THREE.DoubleSide} />
      </mesh>
      {dust > 120 && Array.from({length: 28}, (_, i) => {
        // Billowing crest on the side facing the avenue, so the wall reads from street level.
        const a = -0.32 + (0.64 * i) / 27;
        const r = 9 + 4 * Math.sin(i * 2.7 + t * 1.7);
        return (
          <mesh key={i} position={[x + dust * Math.sin(a), 28 + 3 * Math.sin(i * 1.9 + t * 2.3), z + dust * Math.cos(a)]} scale={[r, r * 0.8, r]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial color={i % 3 ? '#8a6e56' : '#a3876c'} fog={false} />
          </mesh>
        );
      })}
      <pointLight position={[x, 40, z]} color="#ff9c55" intensity={0.6 + 6 * Math.exp(-dt * 1.2)} distance={1400} decay={0} />
    </group>
  );
};

// ---------- Small props ----------
const Phone: React.FC<{p: V3; t: number}> = ({p, t}) => {
  const on = Math.sin(t * 14) > 0 ? 1 : 0.35;
  return (
    <group position={p} rotation={[0.35, 0, 0]}>
      <Block p={[0, 0, 0]} s={[0.075, 0.15, 0.012]} c="#141518" />
      <Block p={[0, 0, 0.008]} s={[0.064, 0.13, 0.004]} c="#ff4a3a" e="#ff3a2a" ei={on * 2.4} />
      <pointLight position={[0, 0, 0.12]} color="#ff4a3a" intensity={on * 0.9} distance={1.2} decay={1.4} />
    </group>
  );
};

const WATCHERS: {x: number; z: number; preset: number}[] = [
  {x: -6.6, z: 7.8, preset: 0},
  {x: -7.6, z: 6.6, preset: 2},
  {x: -7.0, z: 9.4, preset: 5},
  {x: -8.2, z: 8.6, preset: 3},
  {x: 7.6, z: 4.8, preset: 1},
  {x: 8.1, z: 3.6, preset: 4},
];

// ---------- Scene ----------
export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const cam = shaken(shotAt(t), t);
  const space = t >= SPACE.from && t < SPACE.to;

  if (space) {
    const k = smooth(SPACE.from, SPACE.to, t);
    const rock = mixV(orbit(4.45, 0.82, 0.3), orbit(1.25, 0.03, 0.04), Math.pow(k, 0.7));
    return (
      <>
        <color attach="background" args={['#04050a']} />
        <CameraRig position={cam.pos} target={cam.target} fov={cam.fov} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 2, 5]} intensity={2.4} />
        <Stars />
        <EarthGlobe hu={PARIS.hu} hv={PARIS.hv} />
        <SpaceRock t={t} p={rock} />
      </>
    );
  }

  const sky = skyAt(t);
  const ast = asteroidAt(t);
  const e = Math.pow(clamp01(t / IMPACT), 4);
  const pre = t < IMPACT;
  const bend = -0.3 * smooth(26.3, 31.5, t) + Math.sin(t * 9) * 0.012 * smooth(26.3, 27, t) * (1 - smooth(31, 33, t));
  const panic = t > 18.4;
  const z = marcZ(t);
  const running = t >= RUN;

  return (
    <>
      <CameraRig position={cam.pos} target={cam.target} fov={cam.fov} />
      <CityBase time={Math.min(t, 15.5)} seed={42} eiffel={false} skyTop={sky.top} skyBottom={sky.bottom}
        fogFar={t > RUN ? 320 : t >= IMPACT ? 700 : 420} traffic={t < 29} crowd focus={cam.pos[2] - 20}>
        <group position={[0, 0, EIFFEL_Z]} rotation={[bend, 0, 0]}>
          <EiffelTower height={120} />
        </group>
        {pre && <Asteroid t={t} p={ast} radius={7 + 5 * e} glowSize={45 + 110 * e} tail={60 + 160 * e} />}
        {pre && <pointLight position={ast} color="#ffb070" intensity={2.2 * e * e} distance={2000} decay={0} />}
        <Impact t={t} />
        {WATCHERS.map((w, i) => (
          <group key={i} position={[w.x, 0.15, w.z]} rotation={[0, w.x > 0 ? 0.5 : -0.4, 0]}>
            <Person {...PEOPLE_PRESETS[w.preset]} pose={panic ? 'bras-leves' : 'debout'} />
          </group>
        ))}
        <group position={[marcX(t), running ? 0 : 0.15, z]} rotation={[0, running ? Math.PI : 0, 0]}>
          <Marc t={t} walk={t < STOP ? 1 : running ? 1.6 : 0} cold={t >= STOP && !running ? 0.9 : 0}
            rightHand={t >= STOP && !running ? [0.16, 1.5, -0.3] : undefined} />
          {t >= STOP && !running && <Phone p={[0.16, 1.52, -0.36]} t={t} />}
        </group>
      </CityBase>
    </>
  );
};

const SpaceRock: React.FC<{t: number; p: V3}> = ({t, p}) => {
  const glow = useGlowTexture();
  const back = norm(sub(p, orbit(1, 0, 0)));
  return (
    <group>
      <mesh position={p} rotation={[t, t * 1.3, 0]}>
        <icosahedronGeometry args={[0.035, 0]} />
        <meshStandardMaterial color="#6b5a4c" flatShading />
      </mesh>
      {Array.from({length: 10}, (_, i) => {
        const k = i / 10;
        const s = 0.16 * (1 - k * 0.8);
        return (
          <sprite key={i} position={add(p, back, 0.03 + k * 0.5)} scale={[s, s, 1]}>
            <spriteMaterial map={glow} color={i < 3 ? '#ffd9a0' : '#ff8a3a'} transparent opacity={0.8 * (1 - k)} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        );
      })}
    </group>
  );
};
