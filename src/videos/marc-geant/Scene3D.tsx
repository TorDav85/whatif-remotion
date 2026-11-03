import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {BOX_UP, PAL, seeded} from '../../assets/kit';
import {EiffelTower} from '../../assets/EiffelTower';
import {Person, PEOPLE_PRESETS} from '../../assets/Person';
import {CityBase} from '../../assets/city/CityBase';
import {useGlowTexture} from '../../shared/three/common';
import {SkyDome} from '../../shared/three/SkyDome';
import {EarthGlobe, hotspotVector, lonLatUV} from '../../shared/three/EarthGlobe';
import {Marc} from '../../shared/characters/Marc';
import {UrbanBackdrop} from '../../shared/three/UrbanBackdrop';
import {useParisTerrain} from '../../shared/three/ParisTerrain';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);

// ---------- Growth: Marc doubles at each event (minute) ----------
/** [time in s, minute reached, duration of the growth in s]. Mirrored in scripts/audio/marc-geant.py. */
const GROWTH: [number, number, number][] = [
  [6.0, 1, 1], [12.0, 2, 1], [18.0, 3, 1], [25.0, 4, 1], [33.0, 5, 1],
  [40.2, 6, 1], [41.6, 7, 1], [43.0, 8, 1], [47.6, 9, 1], [49.4, 10, 1],
  [54.4, 11, 1], [55.8, 12, 1], [57.2, 13, 1], [61.3, 17, 2], [64.0, 20, 2.4],
  [69.2, 21, 1], [70.8, 22, 1], [72.4, 23, 1], [75.4, 25, 0.8], [76.4, 26, 0.8], [77.4, 27, 0.8], [78.3, 28, 0.7],
];
export const GROWTH_TIMES = GROWTH.map((g) => g[0]);
export const minuteAt = (t: number) => {
  let n = 0;
  for (const [at, to, d] of GROWTH) n += (to - n) * smooth(at, at + d, t) * (t >= at ? 1 : 0);
  return n;
};
/** Marc's height in metres. */
export const heightAt = (t: number) => 1.8 * Math.pow(2, minuteAt(t));
const MODEL_H = 2.06; // Marc's model height at scale 1
export const CITY_END = 40;
export const BIG_END = 61;

// ---------- Local camera rig: near/far follow the distance, the scene spans 1 m to 500 000 km ----------
const Rig: React.FC<{pos: THREE.Vector3; target: THREE.Vector3; fov: number; up?: THREE.Vector3; minNear?: number}> = ({pos, target, fov, up, minNear = 0.05}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    const d = pos.distanceTo(target);
    camera.position.copy(pos);
    camera.up.copy(up ?? V(0, 1, 0));
    camera.fov = fov;
    camera.near = Math.max(minNear, d * 0.004);
    camera.far = Math.max(minNear * 30000, d * 400);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

type Frame = {M: THREE.Vector3; R: THREE.Vector3; U: THREE.Vector3; F: THREE.Vector3; H: number};
/** Point expressed in Marc's frame, in multiples of his height. */
const rel = (f: Frame, r: number, u: number, fw: number) =>
  f.M.clone().addScaledVector(f.R, r * f.H).addScaledVector(f.U, u * f.H).addScaledVector(f.F, fw * f.H);
const yawFrame = (M: THREE.Vector3, yaw: number, H: number): Frame => ({
  M, H, U: V(0, 1, 0), R: V(Math.cos(yaw), 0, -Math.sin(yaw)), F: V(-Math.sin(yaw), 0, -Math.cos(yaw)),
});

// ---------- World 1: the street (CityBase), up to 58 m ----------
const cityMarc = (t: number) => {
  const walkA = t < 5.5;
  const z0 = 14 - 1.2 * Math.min(t, 5.5);
  const k = smooth(12, 14.5, t);
  let x = mix(6.4, 0, k);
  let z = mix(z0, 0, k);
  const y = mix(0.15, 0, k);
  let yaw = 0.71 * Math.sin(Math.PI * k);
  let walk = walkA || (t > 12 && t < 14.5) ? 1 : 0;
  let phase = t;
  if (t > 34.5) {
    z = -16 * (t - 34.5);
    walk = 1;
    phase = 34.5 + (t - 34.5) * 0.5;
  }
  if (t > 12 && t < 14.5) yaw = Math.atan2(6.4, 7.4) * Math.sin(Math.PI * k);
  return {pos: V(x, y, z), yaw, walk, phase};
};

// ---------- World 2: Paris seen by a giant, metres, 100 m to 15 km ----------
const BIG_MARC = V(-170, 0, -620);
const BIG_YAW = -Math.PI / 2; // faces +x, toward the tower
const TOWER = V(0, 0, -700);
const PARIS_C = V(0, 0, -400);
const seineZ = (x: number) => -790 + 120 * Math.sin(x / 700);

const DETAIL = 6000;
const useParisTextures = useParisTerrain;
const Roofs: React.FC = () => <UrbanBackdrop seed={42} radius={6000} parcels={9000} cz={-400} />;

const Airliner: React.FC<{p: THREE.Vector3}> = ({p}) => {
  const glow = useGlowTexture();
  const S = 25; // exaggerated, a real 40 m airliner would be a single pixel
  return (
    <group position={p}>
      <group scale={S}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.2, 2.2, 40, 10]} /><meshStandardMaterial color="#f2f2f0" /></mesh>
        <mesh position={[0, 0, -2]}><boxGeometry args={[36, 0.6, 6]} /><meshStandardMaterial color="#d8dde3" /></mesh>
        <mesh position={[0, 4, 17]}><boxGeometry args={[0.6, 8, 5]} /><meshStandardMaterial color="#2b5a8a" /></mesh>
        <mesh position={[0, 0.3, 18]}><boxGeometry args={[13, 0.5, 3.5]} /><meshStandardMaterial color="#d8dde3" /></mesh>
      </group>
      {Array.from({length: 24}, (_, i) => (
        <sprite key={i} position={[(i % 2 ? 1 : -1) * 70, -10, 400 + i * 260]} scale={[180 + i * 18, 180 + i * 18, 1]}>
          <spriteMaterial map={glow} color="#ffffff" transparent opacity={0.5 * (1 - i / 24)} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
};

// ---------- World 3: space, unit = Earth radius ----------
const R_EARTH = 6371000;
const PARIS = lonLatUV(2.35, 48.86);
const N = (() => {
  const hp = hotspotVector(PARIS.hu, PARIS.hv);
  const yaw = Math.atan2(-hp.x, hp.z);
  return hp.applyAxisAngle(V(0, 1, 0), yaw).applyAxisAngle(V(1, 0, 0), 0.55).normalize();
})();
const Q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), N);
const spaceFrame = (t: number): Frame => ({
  M: N.clone(), U: N.clone(), H: heightAt(t) / R_EARTH,
  R: V(1, 0, 0).applyQuaternion(Q), F: V(0, 0, -1).applyQuaternion(Q),
});
const HAND_UP: V3 = [0.3, 2.3, -0.28];
const HAND_DOWN: V3 = [0.3, 0.94, 0];
const handLocal = (t: number): V3 => {
  const k = smooth(75.8, 77.2, t);
  return [mix(HAND_DOWN[0], HAND_UP[0], k), mix(HAND_DOWN[1], HAND_UP[1], k), mix(HAND_DOWN[2], HAND_UP[2], k)];
};
const handWorld = (f: Frame, h: V3) => {
  const s = f.H / MODEL_H;
  return f.M.clone().addScaledVector(f.R, h[0] * s).addScaledVector(f.U, h[1] * s).addScaledVector(f.F, -h[2] * s);
};
const MOON_R = 1.0; // the real Moon is 0.27 Earth radius: exaggerated to read as a marble
const handTop = (t: number) => {
  const f = spaceFrame(t);
  return handWorld(f, handLocal(t)).addScaledVector(f.U, 0.078 * (f.H / MODEL_H) + MOON_R * 0.9);
};
const MOON_ORBIT = handTop(83);
/** The Moon waits where his raised hand will end, then sits in his palm. */
const moonAt = (t: number) => MOON_ORBIT.clone().lerp(handTop(t), smooth(77.2, 78.0, t));

const SpaceStars: React.FC<{at: THREE.Vector3; radius: number}> = ({at, radius}) => {
  const geo = useMemo(() => {
    const r = seeded(77);
    const pts = new Float32Array(1400 * 3);
    for (let i = 0; i < 1400; i++) {
      const u = r() * 2 - 1;
      const a = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pts.set([s * Math.cos(a), u, s * Math.sin(a)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo} position={at} scale={radius}>
      <pointsMaterial color="#ffffff" size={2.2} sizeAttenuation={false} fog={false} />
    </points>
  );
};

// ---------- Shots ----------
type View = {pos: THREE.Vector3; target: THREE.Vector3; fov: number; shake?: number; up?: THREE.Vector3};
type Shot = {from: number; view: (t: number, k: number) => View};

const cityFrame = (t: number): Frame => {
  const m = cityMarc(t);
  return yawFrame(m.pos, m.yaw, heightAt(t));
};
const bigFrame = (t: number): Frame => yawFrame(BIG_MARC, BIG_YAW, heightAt(t));

/** Footstep impulses while the 58 m Marc walks. */
const stomp = (t: number) => (t > 34.5 && t < CITY_END ? Math.pow(Math.max(0, Math.cos(Math.PI * (t - 35.2))), 16) * 2.2 : 0);

export const SHOTS: Shot[] = [
  // Minute 0: Marc walks to work.
  {from: 0, view: (t) => {
    const f = cityFrame(t);
    return {pos: rel(f, 0.22, 0.88, 1.85), target: rel(f, 0, 0.72, 0), fov: 50};
  }},
  // Minute 1: fixed camera, he grows in the frame, a bus passes at his feet.
  {from: 6, view: (t) => {
    const f = cityFrame(t);
    return {pos: V(0.4, 1.8, 1.8), target: rel(f, 0, 0.62, 0), fov: 55};
  }},
  // Minute 2: low angle from the crowd, he steps into the avenue.
  {from: 12, view: (t) => {
    const f = cityFrame(t);
    return {pos: V(-6.2, 1.4, 16), target: rel(f, 0, 0.62, 0), fov: 56};
  }},
  // Minute 3: close on his worried face.
  {from: 18, view: (t, k) => {
    const f = cityFrame(t);
    return {pos: rel(f, -0.3, 0.9, mix(0.75, 0.62, k)), target: rel(f, 0, 0.9, 0), fov: 45};
  }},
  // Square-cube law: from rooftop height, Marc above the roofs.
  {from: 25, view: (t, k) => {
    const f = cityFrame(t);
    return {pos: rel(f, 0.12, 0.62, mix(2.1, 1.85, k)), target: rel(f, 0, 0.55, 0), fov: 52};
  }},
  // Minute 5: street-level camera, every step lands closer.
  {from: 33, view: (t) => {
    const f = cityFrame(t);
    return {pos: V(4, 1.6, -150), target: rel(f, 0, 0.5, 0), fov: 60, shake: stomp(t)};
  }},
  // Minute 8: Marc and the Eiffel Tower side by side; the camera backs off as he grows.
  {from: CITY_END, view: (t) => {
    const H = heightAt(t);
    const D = 1.65 * H + 220;
    return {pos: V(-95, 0.42 * H + 10, -660 + D), target: V(-95, 0.45 * H, -660), fov: 55};
  }},
  // Minute 10: high above Paris, looking down past his shoulder.
  {from: 47, view: (t) => {
    const f = bigFrame(t);
    return {pos: rel(f, -0.7, 0.98, -0.75), target: rel(f, 0.15, 0.25, 0.65), fov: 55};
  }},
  // Minute 13: at chest height, an airliner passes.
  {from: 54, view: (t) => {
    const f = bigFrame(t);
    return {pos: rel(f, 0.55, 0.72, 0.95), target: rel(f, 0, 0.62, 0), fov: 52};
  }},
  // Minute 20: Earth's curve appears beneath him.
  {from: BIG_END, view: (t) => {
    const f = spaceFrame(t);
    return {pos: rel(f, -0.75, 0.42, 1.75), target: rel(f, 0, 0.5, 0), fov: 52, up: N};
  }},
  // Minute 23: taller than the Earth.
  {from: 68, view: (t) => {
    const f = spaceFrame(t);
    return {pos: rel(f, -1.15, 0.3, 2.3), target: rel(f, 0, 0.42, 0), fov: 52, up: N};
  }},
  // Minute 28: he reaches for the Moon.
  {from: 75.2, view: (t) => {
    const f = spaceFrame(t);
    return {pos: rel(f, -0.85, 0.6, 1.9), target: rel(f, 0, 0.62, 0), fov: 52, up: N};
  }},
  // The Moon in his hand.
  {from: 77.6, view: (t, k) => {
    const f = spaceFrame(t);
    const hand = handWorld(f, handLocal(t));
    const pos = hand.clone().addScaledVector(f.F, 0.42 * f.H * mix(1, 0.85, k)).addScaledVector(f.R, -0.16 * f.H).addScaledVector(f.U, -0.12 * f.H);
    return {pos, target: moonAt(t).lerp(hand, 0.5), fov: 45, up: N};
  }},
];
export const CUTS = SHOTS.slice(1).map((s) => s.from);

const shotAt = (t: number): View => {
  let i = SHOTS.length - 1;
  while (i > 0 && t < SHOTS[i].from) i--;
  const end = i + 1 < SHOTS.length ? SHOTS[i + 1].from : 83;
  const v = SHOTS[i].view(t, smooth(SHOTS[i].from, end, t));
  const s = v.shake ?? 0;
  if (s > 0) {
    const d = v.pos.distanceTo(v.target) * 0.012 * s;
    v.target.add(V(Math.sin(t * 41) * d, Math.sin(t * 37 + 1) * d, 0));
  }
  return v;
};

// ---------- Scene ----------
const WATCHERS: {x: number; z: number; preset: number}[] = [
  {x: -6.8, z: 11.5, preset: 0}, {x: -7.6, z: 10.2, preset: 2}, {x: -6.4, z: 9.2, preset: 5},
  {x: -8.0, z: 12.6, preset: 3}, {x: -5.9, z: 12.8, preset: 1}, {x: 6.8, z: 6.0, preset: 4},
];

const MarcModel: React.FC<{t: number; phase: number; walk: number; worried: number; hand?: V3}> = ({phase, walk, worried, hand}) => (
  <Marc t={phase} walk={walk} cold={worried} rightHand={hand} />
);

/**
 * `clearStreet` moves the minute-5 street camera from the parking lane to the roadway, so no
 * parked car fills the foreground (used by the 1.11 short cut; the original film is unchanged).
 */
export const Scene3D: React.FC<{t: number; clearStreet?: boolean}> = ({t, clearStreet}) => {
  const base = shotAt(t);
  const view = clearStreet && t >= 33 && t < CITY_END ? {...base, pos: base.pos.clone().setX(1.2).setY(1.9)} : base;
  const H = heightAt(t);
  const tex = useParisTextures();
  const glow = useGlowTexture();

  if (t < CITY_END) {
    const m = cityMarc(t);
    return (
      <>
        <Rig pos={view.pos} target={view.target} fov={view.fov} />
        <CityBase time={t} seed={42} traffic={t < 12} crowd fogFar={t > 25 ? 700 : 420} focus={view.pos.z - 20}>
          {t >= 12 && WATCHERS.map((w, i) => (
            <group key={i} position={[w.x, 0.15, w.z]} rotation={[0, w.x > 0 ? 0.6 : -0.7, 0]}>
              <Person {...PEOPLE_PRESETS[w.preset]} pose={t > 13 ? 'bras-leves' : 'debout'} />
            </group>
          ))}
          <group position={m.pos} rotation={[0, m.yaw, 0]} scale={H / MODEL_H}>
            <MarcModel t={t} phase={m.phase} walk={m.walk} worried={t > 21.5 && t < 33 ? 0.7 : 0} />
          </group>
        </CityBase>
      </>
    );
  }

  if (t < BIG_END) {
    const fogFar = Math.min(220000, 30 * H);
    const camZ = BIG_MARC.z + 0.55 * heightAt(57.2);
    const plane = V(BIG_MARC.x + 0.45 * heightAt(57.2), 10000, camZ + mix(7000, -7000, (t - 57.5) / 3.5));
    return (
      <>
        <Rig pos={view.pos} target={view.target} fov={view.fov} />
        <group position={view.pos} scale={(view.pos.distanceTo(view.target) * 100) / 600}>
          <SkyDome top={new THREE.Color('#4f86d0')} bottom={new THREE.Color('#e4dccb')} />
        </group>
        <fog attach="fog" args={['#e4dccb', 4 * H, fogFar]} />
        <hemisphereLight color="#9cc0ec" groundColor="#8a7e6a" intensity={1.1} />
        <directionalLight color="#fff1d8" intensity={1.6} position={[60, 80, 40]} />
        <ambientLight intensity={0.25} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, -400]}>
          <planeGeometry args={[600000, 600000]} />
          <meshStandardMaterial map={tex.land} roughness={1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[PARIS_C.x, 0, PARIS_C.z]}>
          <planeGeometry args={[DETAIL, DETAIL]} />
          <meshStandardMaterial map={tex.detail} transparent depthWrite={false} roughness={1} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
        <Roofs />
        <group position={TOWER}>
          <EiffelTower height={324} />
        </group>
        <group position={BIG_MARC} rotation={[0, BIG_YAW, 0]} scale={H / MODEL_H}>
          <MarcModel t={t} phase={t} walk={0} worried={0} />
        </group>
        {t > 57.4 && <Airliner p={plane} />}
      </>
    );
  }

  const f = spaceFrame(t);
  const s = f.H / MODEL_H;
  const camDist = view.pos.length();
  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} up={view.up} minNear={1e-7} />
      <color attach="background" args={['#03040a']} />
      <SpaceStars at={view.pos} radius={Math.max(50, camDist * 50)} />
      <ambientLight intensity={0.35} />
      <directionalLight position={N.clone().multiplyScalar(5).add(V(3, 2, 4))} intensity={2.6} />
      <EarthGlobe hu={PARIS.hu} hv={PARIS.hv} />
      <mesh scale={1.025}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial color="#7fb2ff" transparent opacity={0.18} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {t > 74 && (
        <group position={moonAt(t)}>
          <mesh scale={MOON_R}>
            <icosahedronGeometry args={[1, 3]} />
            <meshStandardMaterial color="#cfcac0" flatShading roughness={1} />
          </mesh>
          <sprite scale={[MOON_R * 4, MOON_R * 4, 1]}>
            <spriteMaterial map={glow} color="#fff8e6" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      )}
      <group position={f.M} quaternion={Q} scale={s}>
        <MarcModel t={t} phase={t} walk={0} worried={0} hand={t > 75.8 ? handLocal(t) : undefined} />
      </group>
    </>
  );
};
