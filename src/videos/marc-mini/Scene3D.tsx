import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Ball, Block, seeded} from '../../assets/kit';
import {CityBase} from '../../assets/city/CityBase';
import {Marc} from '../../shared/characters/Marc';
import {cutsOf, shotAt as shotAtOf, type Shot as ShotOf} from '../../shared/three/shots';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);

// ---------- Shrink: Marc halves at each event (minute) ----------
/** [time in s, minute reached, duration of the shrink in s]. Mirrored in scripts/audio/marc-mini.py. */
const SHRINK: [number, number, number][] = [
  [6.0, 1, 1], [12.0, 2, 1], [18.0, 3, 1], [25.0, 4, 1], [33.0, 5, 1],
  [40.2, 6, 1], [41.4, 7, 1], [47.4, 8, 0.9], [48.4, 9, 0.9], [49.4, 10, 0.9],
  [54.4, 11, 1], [55.6, 12, 1], [56.8, 13, 1], [61.3, 17, 2], [64.0, 20, 2.4],
  [69.2, 21, 1], [70.8, 22, 1], [72.4, 23, 1], [75.4, 25, 0.8], [76.4, 27, 0.8], [77.4, 29, 0.8], [78.3, 31, 0.7], [79.1, 33, 0.7],
];
export const SHRINK_TIMES = SHRINK.map((g) => g[0]);
export const minuteAt = (t: number) => {
  let n = 0;
  for (const [at, to, d] of SHRINK) n += (to - n) * smooth(at, at + d, t) * (t >= at ? 1 : 0);
  return n;
};
/** Marc's height in metres. */
export const heightAt = (t: number) => 1.8 * Math.pow(2, -minuteAt(t));
const MODEL_H = 2.06; // Marc's model height at scale 1
export const CITY_END = 40;
/** Vision blurs (smaller than light), then the picture turns to an electron-microscope grey. */
export const BLUR = [70.8, 71.8, 72.6] as const;
export const DURATION = 85;

// ---------- Camera rig: near/far follow the distance ----------
const Rig: React.FC<{pos: THREE.Vector3; target: THREE.Vector3; fov: number; minNear?: number}> = ({pos, target, fov, minNear = 0.05}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    const d = pos.distanceTo(target);
    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
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

// ---------- World 1: the street (CityBase), metres, 1.8 m to 5 cm ----------
/** Marc ends on the curb stone (x 5 to 5.2, 16 cm high), clear of bollards, bikes and trees. */
const CURB = V(5.1, 0.16, 9.0);
const cityMarc = (t: number) => {
  const z = CURB.z + 6.6 - 1.2 * Math.min(t, 5.5);
  const k = smooth(12, 14.5, t);
  const x = mix(7.2, CURB.x, k);
  // Turns toward the curb while walking, faces the pigeon (-z), then the road (-x).
  const yaw = (Math.PI / 2) * (Math.sin(Math.PI * k) + smooth(18.2, 19.2, t));
  const walk = t < 5.5 || (t > 12 && t < 14.5) ? 1 : 0;
  return {pos: V(x, k < 1 ? 0.15 + 0.01 * k : CURB.y, z), yaw, walk};
};

/** The pigeon walks up the sidewalk and stops in front of Marc. */
const pigeonAt = (t: number) => {
  const k = smooth(12.3, 14.9, t);
  return {pos: V(CURB.x + 0.06, CURB.y, mix(CURB.z - 1.7, CURB.z - 0.45, k)), walk: k > 0 && k < 1 ? 1 : 0};
};

const Pigeon: React.FC<{t: number; walk: number}> = ({t, walk}) => {
  const bob = walk ? Math.sin(t * 14) : Math.sin(t * 3) * 0.3; // the head jerks forward with each step
  return (
    <group rotation={[0, Math.PI, 0]}>
      <Ball p={[0, 0.13, 0.01]} rad={1} s={[0.085, 0.085, 0.15]} c="#8a929e" detail={2} />
      <Ball p={[0, 0.19, -0.075]} rad={0.05} c="#5f7d72" detail={2} />
      <group position={[0, 0.235, -0.1 - 0.02 * bob]}>
        <Ball p={[0, 0, 0]} rad={0.04} c="#6f7784" detail={2} />
        <Block p={[0, -0.005, -0.048]} s={[0.012, 0.012, 0.03]} c="#3b3a3a" />
        {[-1, 1].map((s) => (
          <group key={s}>
            <Ball p={[s * 0.031, 0.012, -0.018]} rad={0.009} c="#e0782c" />
            <Ball p={[s * 0.037, 0.012, -0.02]} rad={0.004} c="#111" />
          </group>
        ))}
      </group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Block p={[s * 0.07, 0.15, 0.05]} s={[0.025, 0.07, 0.17]} r={[0.25, 0, 0]} c="#7a828e" />
          <Block p={[s * 0.083, 0.15, 0.06]} s={[0.004, 0.012, 0.09]} r={[0.25, 0, 0]} c="#2f333a" />
          <Block p={[s * 0.025, 0.03, walk ? 0.02 * Math.sin(t * 14 + s * 1.6) : 0]} s={[0.008, 0.06, 0.008]} c="#c2524d" />
        </group>
      ))}
      <Block p={[0, 0.12, 0.18]} s={[0.075, 0.015, 0.12]} r={[0.2, 0, 0]} c="#3d424b" />
    </group>
  );
};

/** One-euro coin standing on its edge, in Marc's local units (he shrinks, the coin doesn't). */
const coinLayout = (H: number) => {
  const s = MODEL_H / H;
  const R = 0.011625 * s;
  const cx = 0.38 + R;
  const hy = Math.min(1.0, R * 1.5);
  const hx = cx - Math.sqrt(Math.max(0, R * R - (hy - R) * (hy - R)));
  return {s, R, cx, hand: [hx + 0.02, hy, -0.14] as V3};
};
const Coin: React.FC<{H: number}> = ({H}) => {
  const {s, R, cx} = coinLayout(H);
  return (
    <group position={[cx, R, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh><cylinderGeometry args={[R, R, 0.00233 * s, 48]} /><meshStandardMaterial color="#e0b850" emissive="#5a4510" metalness={0.3} roughness={0.35} /></mesh>
      <mesh><cylinderGeometry args={[R * 0.68, R * 0.68, 0.0025 * s, 48]} /><meshStandardMaterial color="#d8dce0" emissive="#4a4e52" metalness={0.3} roughness={0.3} /></mesh>
      {Array.from({length: 12}, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * R * 0.84, -0.0013 * s, Math.sin(a) * R * 0.84]}>
            <sphereGeometry args={[R * 0.05, 8, 6]} /><meshStandardMaterial color="#e9d38a" metalness={0.6} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- Ground detail: grains at every scale (metres) ----------
type Layer = {s: number; rin: number; rout: number; n: number; colors: string[]};
const ROCK = ['#a69d8f', '#8f877b', '#b8ad9c', '#7c766d', '#c4b8a3'];
const SAND = ['#d9c39a', '#cdb48a', '#e6d6b4', '#bfa57c', '#f0e6d0'];
const MICRO_LAYERS: Layer[] = [
  {s: 0.004, rin: 0.012, rout: 0.3, n: 900, colors: ROCK},
  {s: 0.0006, rin: 0.0018, rout: 0.04, n: 1100, colors: SAND},
  {s: 8e-5, rin: 2.4e-4, rout: 0.005, n: 1100, colors: SAND},
  {s: 1e-5, rin: 3e-5, rout: 6e-4, n: 1000, colors: ROCK},
  {s: 1.2e-6, rin: 3.6e-6, rout: 7e-5, n: 1000, colors: ['#bdb3a0', '#a89f8e', '#cfc6b4']},
  {s: 1.5e-7, rin: 4.5e-7, rout: 9e-6, n: 900, colors: ['#bdb3a0', '#a89f8e', '#cfc6b4']},
];
const STREET_LAYERS: Layer[] = [
  {s: 0.0012, rin: 0.008, rout: 0.12, n: 300, colors: ROCK},
  {s: 0.0004, rin: 0.0025, rout: 0.03, n: 500, colors: SAND},
];
const GRAIN = new THREE.IcosahedronGeometry(1, 1);
const CURB_BAND: [number, number] = [-0.1, 0.1];

/** Instanced grains, denser near Marc. `front` clears a wedge toward the camera (local -z); `band` keeps only local z in [min, max] (the curb stone). */
const Grains: React.FC<{layers: Layer[]; seed: number; front?: boolean; band?: [number, number]}> = ({layers, seed, front, band}) => {
  const meshes = useMemo(() => layers.map((L, li) => {
    const r = seeded(seed + li * 31);
    const m = new THREE.InstancedMesh(GRAIN, new THREE.MeshStandardMaterial({flatShading: true, roughness: 0.95}), L.n);
    const o = new THREE.Object3D();
    let k = 0;
    for (let i = 0; i < L.n * 3 && k < L.n; i++) {
      const rad = L.rin * Math.pow(L.rout / L.rin, r());
      const a = r() * Math.PI * 2;
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      const s = L.s * (0.45 + r() * 0.9);
      if (front && z < 0 && Math.abs(x) < -z * 0.95 + s && rad < 12 * L.s) continue;
      if (band && (z - s < band[0] || z + s > band[1])) continue;
      o.position.set(x, -s * 0.3, z);
      o.rotation.set(r() * 6, r() * 6, r() * 6);
      o.scale.set(s * (0.8 + r() * 0.4), s * (0.6 + r() * 0.3), s * (0.8 + r() * 0.4));
      o.updateMatrix();
      m.setMatrixAt(k, o.matrix);
      m.setColorAt(k, new THREE.Color(L.colors[Math.floor(r() * L.colors.length)]));
      k++;
    }
    m.count = k;
    m.instanceMatrix.needsUpdate = true;
    return m;
  }), [layers, seed, front, band]);
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
};

// ---------- World 2: Marc's own scale. He stays 2.06 units tall, the world (in metres) grows around him ----------
const Seg: React.FC<{a: V3; b: V3; w: number; c: string}> = ({a, b, w, c}) => {
  const from = V(...a);
  const d = V(...b).sub(from);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  return (
    <mesh position={from.clone().addScaledVector(d, 0.5)} quaternion={q}>
      <cylinderGeometry args={[w, w * 0.8, d.length(), 6]} /><meshStandardMaterial color={c} roughness={0.5} />
    </mesh>
  );
};

/** 5 mm ant, modelled in millimetres, facing -z. */
const Ant: React.FC<{t: number; walk: number}> = ({t, walk}) => {
  const C = '#2b1b13';
  const legs: V3[] = [[0.95, 0, -0.55], [1.1, 0, 0.1], [1.0, 0, 0.8]];
  return (
    <group scale={0.001} position={[0, 0, 0]}>
      <Ball p={[0, 0.85, 1.7]} rad={1} s={[0.95, 0.85, 1.35]} c={C} detail={2} />
      <Ball p={[0, 0.75, 0.55]} rad={0.25} c={C} />
      <Ball p={[0, 0.8, -0.1]} rad={1} s={[0.42, 0.42, 0.8]} c={C} detail={2} />
      <Ball p={[0, 0.95, -1.25]} rad={1} s={[0.6, 0.55, 0.62]} c={C} detail={2} />
      {[-1, 1].map((s) => {
        const wave = Math.sin(t * 9 + s) * 0.15;
        return (
          <group key={s}>
            <Ball p={[s * 0.35, 1.08, -1.6]} rad={0.13} c="#0d0806" />
            <Seg a={[s * 0.2, 1.2, -1.6]} b={[s * 0.55, 1.75, -2.0 + wave]} w={0.05} c={C} />
            <Seg a={[s * 0.55, 1.75, -2.0 + wave]} b={[s * 0.75, 1.4, -2.7 + wave]} w={0.04} c={C} />
            <Seg a={[s * 0.15, 0.7, -1.75]} b={[s * 0.05, 0.6, -2.05]} w={0.07} c="#4a2e1f" />
            {legs.map(([lx, , lz], i) => {
              const ph = walk * Math.sin(t * 16 + i * Math.PI + (s > 0 ? Math.PI : 0)) * 0.35;
              const knee: V3 = [s * lx, 1.25, -0.1 + lz * 0.5 + ph * 0.4];
              return (
                <group key={i}>
                  <Seg a={[s * 0.25, 0.75, -0.1 + lz * 0.3]} b={knee} w={0.06} c={C} />
                  <Seg a={knee} b={[s * (lx + 0.75), 0.02 + Math.max(0, ph) * 0.3, lz + ph]} w={0.045} c={C} />
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};
/** The ant walks toward Marc's feet and stops to sniff him. */
const antAt = (t: number) => {
  const k = smooth(40.4, 45.2, t);
  const from = V(-0.016, 0, -0.004);
  const to = V(-0.0052, 0, -0.0012);
  const dir = to.clone().sub(from);
  return {pos: from.clone().lerp(to, k), yaw: Math.atan2(-dir.x, -dir.z), walk: k > 0 && k < 1 ? 1 : 0};
};

const HAIR_R = 3.5e-5; // a 70 µm hair lying behind Marc
const Hair: React.FC = () => (
  <group position={[0, HAIR_R * 0.9, 3e-4]} rotation={[0, 0, Math.PI / 2]}>
    <mesh><cylinderGeometry args={[HAIR_R, HAIR_R, 0.04, 40]} /><meshStandardMaterial color="#4a3324" roughness={0.45} /></mesh>
    {/* Cuticle scales: overlapping rings every 8 µm near Marc. */}
    {Array.from({length: 60}, (_, i) => (
      <mesh key={i} position={[0, (i - 30) * 8e-6, 0]}>
        <cylinderGeometry args={[HAIR_R * 1.04, HAIR_R * 1.0, 4e-6, 40]} /><meshStandardMaterial color="#5a3f2d" roughness={0.45} />
      </mesh>
    ))}
  </group>
);

const BACTERIA: {p: V3; yaw: number}[] = (() => {
  const r = seeded(51);
  const out: {p: V3; yaw: number}[] = [{p: [1.9e-6, 0, -1.1e-6], yaw: 0.5}, {p: [-2.6e-6, 0, 1.2e-6], yaw: 2.1}];
  for (let i = 0; i < 14; i++) {
    const rad = 3.5e-6 + r() * 12e-6;
    const a = r() * Math.PI * 2;
    out.push({p: [Math.cos(a) * rad, 0, Math.sin(a) * rad], yaw: r() * 6});
  }
  return out;
})();
const BACT = new THREE.CapsuleGeometry(0.45e-6, 1.3e-6, 6, 14).rotateX(Math.PI / 2);
const Bacteria: React.FC<{t: number}> = ({t}) => (
  <>
    {BACTERIA.map((b, i) => {
      const w = Math.sin(t * 1.3 + i) * 0.12;
      return (
        <group key={i} position={[b.p[0] + Math.sin(t * 0.4 + i) * 1e-7, 0.44e-6, b.p[2]]} rotation={[0, b.yaw + w, 0]}>
          <mesh geometry={BACT}><meshStandardMaterial color={i % 3 ? '#86c26e' : '#c9b25a'} roughness={0.6} /></mesh>
          {/* Flagellum: a wavy tail. */}
          {Array.from({length: 8}, (_, k) => (
            <mesh key={k} position={[Math.sin(t * 6 + k * 0.9 + i) * 0.12e-6, 0, 1.15e-6 + k * 0.22e-6]}>
              <sphereGeometry args={[0.05e-6, 6, 4]} /><meshStandardMaterial color="#6d9a58" />
            </mesh>
          ))}
        </group>
      );
    })}
  </>
);

const VIRUSES: {p: V3; spin: number}[] = (() => {
  const r = seeded(63);
  const out: {p: V3; spin: number}[] = [{p: [-2.6e-7, 1.5e-7, 0.3e-7], spin: 0.4}, {p: [2.2e-7, 2.2e-7, 1.2e-7], spin: -0.3}];
  for (let i = 0; i < 12; i++) {
    const rad = 3e-7 + r() * 1.2e-6;
    const a = r() * Math.PI * 2;
    out.push({p: [Math.cos(a) * rad, 5e-8 + r() * 4e-7, Math.sin(a) * rad], spin: r() - 0.5});
  }
  return out;
})();
const SPIKES = new THREE.IcosahedronGeometry(1, 1).attributes.position;
const Virus: React.FC<{t: number; spin: number}> = ({t, spin}) => {
  const dirs = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < SPIKES.count; i += 3) out.push(V(SPIKES.getX(i), SPIKES.getY(i), SPIKES.getZ(i)).normalize());
    return out;
  }, []);
  return (
    <group rotation={[t * spin, t * spin * 0.7, 0]} scale={5e-8}>
      <Ball p={[0, 0, 0]} rad={1} c="#a585d6" detail={2} />
      {dirs.map((d, i) => (
        <group key={i}>
          <Seg a={[d.x, d.y, d.z]} b={[d.x * 1.35, d.y * 1.35, d.z * 1.35]} w={0.05} c="#d4b3f0" />
          <Ball p={[d.x * 1.38, d.y * 1.38, d.z * 1.38]} rad={0.09} c="#e9d0ff" />
        </group>
      ))}
    </group>
  );
};

/** Crystal surface under his feet: atoms as big as he is at minute 33. */
const ATOM_A = 2.5e-10;
const ATOM_R = 1.1e-10;
const Atoms: React.FC = () => {
  const mesh = useMemo(() => {
    const n = 44;
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({color: '#9fb8e8', roughness: 0.35, metalness: 0.1}), n * n);
    const o = new THREE.Object3D();
    let k = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        o.position.set((i - n / 2 + (j % 2) * 0.5) * ATOM_A, -ATOM_R, (j - n / 2) * ATOM_A * 0.866);
        o.scale.setScalar(ATOM_R);
        o.updateMatrix();
        m.setMatrixAt(k++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, []);
  return <primitive object={mesh} />;
};

// ---------- Shots ----------
type View = {pos: THREE.Vector3; target: THREE.Vector3; fov: number};
type Shot = ShotOf<View>;

const cityFrame = (t: number): Frame => {
  const m = cityMarc(t);
  return yawFrame(m.pos, m.yaw, heightAt(t));
};
/** In the micro world Marc stands still at the origin, facing -z, at his model size. */
const MICRO: Frame = yawFrame(V(0, 0, 0), 0, MODEL_H);

export const SHOTS: Shot[] = [
  // Minute 0: Marc walks to work.
  {from: 0, view: (t) => {
    const f = cityFrame(t);
    return {pos: rel(f, 0.75, 0.88, 1.8), target: rel(f, 0.08, 0.8, 0), fov: 50};
  }},
  // Minute 1: adult eye level, looking down on him as he shrinks.
  {from: 6, view: (t) => {
    const f = cityFrame(t);
    return {pos: V(7.9, 1.6, CURB.z - 2.8), target: rel(f, 0, 0.55, 0), fov: 52};
  }},
  // Minute 2: low, from the road: Marc walks to the curb and faces the pigeon.
  {from: 12, view: (t, k) => {
    const f = cityFrame(t);
    const z = CURB.z - 0.22;
    return {pos: V(mix(3.4, 3.6, k), 0.32, z), target: V(mix(f.M.x, CURB.x, 0.6), 0.16 + 0.5 * f.H, z), fov: 50};
  }},
  // Minute 3: from the road, the curb is a cliff.
  {from: 18, view: (t, k) => {
    const f = cityFrame(t);
    return {pos: V(4.5, 0.1, mix(CURB.z + 0.6, CURB.z + 0.5, k)), target: V(CURB.x - 0.08, 0.15 + 0.4 * f.H, CURB.z), fov: 50};
  }},
  // Square-cube law: medium shot, Marc in the lower half under the panel.
  {from: 25, view: (t, k) => {
    const f = cityFrame(t);
    return {pos: rel(f, -0.55, 1.1, mix(2.7, 2.4, k)), target: rel(f, 0, 0.95, 0), fov: 50};
  }},
  // Minute 5: the coin shield, low and close.
  {from: 33, view: (t, k) => {
    const f = cityFrame(t);
    return {pos: rel(f, 0.55, 0.6, mix(2.1, 1.85, k)), target: rel(f, 0.35, 0.5, 0), fov: 50};
  }},
  // Minute 7: the ant comes to sniff him.
  {from: CITY_END, view: (t, k) => ({pos: rel(MICRO, mix(-0.9, -0.75, k), 0.5, 1.65), target: rel(MICRO, -0.3, 0.38, 0.2), fov: 50})},
  // Minute 10: sand grains become rocks, slow orbit.
  {from: 47.4, view: (t, k) => {
    const a = mix(0.45, 0.1, k);
    return {pos: V(Math.sin(a) * 2.3 * MODEL_H, 0.6 * MODEL_H, -Math.cos(a) * 2.3 * MODEL_H), target: rel(MICRO, 0, 0.45, 0), fov: 52};
  }},
  // Minute 13: the hair lies behind him like a fallen trunk.
  {from: 54.4, view: (t, k) => ({pos: rel(MICRO, -0.5, mix(0.75, 0.65, k), 2.3), target: rel(MICRO, 0, 0.55, -0.4), fov: 52})},
  // Minute 20: a bacterium his size.
  {from: 61.3, view: (t, k) => ({pos: rel(MICRO, mix(0.95, 0.8, k), 0.55, 2.1), target: rel(MICRO, 0.35, 0.45, 0.2), fov: 52})},
  // Minute 23: viruses float around him, then the picture blurs.
  {from: 68.5, view: (t, k) => ({pos: rel(MICRO, mix(-0.9, -0.7, k), 0.6, 2.0), target: rel(MICRO, -0.15, 0.5, 0), fov: 52})},
  // Minute 33: standing on atoms, the camera backs off.
  {from: 75.4, view: (t, k) => ({pos: rel(MICRO, -0.9, mix(0.7, 0.95, k), mix(2.1, 2.7, k)), target: rel(MICRO, 0, 0.4, 0), fov: 52})},
];
export const CUTS = cutsOf(SHOTS);

const shotAt = (t: number): View => shotAtOf(SHOTS, t, DURATION);

// ---------- Scene ----------
export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const view = shotAt(t);
  const H = heightAt(t);

  if (t < CITY_END) {
    const m = cityMarc(t);
    const p = pigeonAt(t);
    const coin = t >= 33 ? coinLayout(H) : null;
    return (
      <>
        <Rig pos={view.pos} target={view.target} fov={view.fov} minNear={0.001} />
        <CityBase time={t} seed={42} traffic={t < 12} crowd={false} fogFar={420} focus={view.pos.z - 20}>
          {t >= 12 && t < 18 && (
            <group position={p.pos}><Pigeon t={t} walk={p.walk} /></group>
          )}
          {t >= 18 && (
            <group position={CURB} rotation={[0, Math.PI / 2, 0]}>
              <Grains layers={STREET_LAYERS} seed={7} band={CURB_BAND} />
            </group>
          )}
          <group position={m.pos} rotation={[0, m.yaw, 0]} scale={H / MODEL_H}>
            <Marc t={t} walk={m.walk} cold={t > 19.5 && t < 33 ? 0.6 : 0} rightHand={coin?.hand} />
            {t >= 33 && <Coin H={H} />}
          </group>
        </CityBase>
      </>
    );
  }

  const k = MODEL_H / H;
  const fog = '#d8ccb5';
  const ant = antAt(t);
  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} minNear={0.01} />
      <color attach="background" args={[fog]} />
      <fog attach="fog" args={[fog, 9, 75]} />
      <hemisphereLight color="#f4efe4" groundColor="#8a7e6a" intensity={1.15} />
      <directionalLight color="#fff1d8" intensity={1.7} position={[-3, 6, -2]} />
      <ambientLight intensity={0.2} />
      <group scale={k}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6e-10, 0]} scale={400 * H}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color="#b6a98f" roughness={1} />
        </mesh>
        <Grains layers={MICRO_LAYERS} seed={19} front />
        {t < 47.4 && (
          <group position={ant.pos} rotation={[0, ant.yaw, 0]}><Ant t={t} walk={ant.walk} /></group>
        )}
        {t >= 47.4 && t < 75.4 && <Hair />}
        {t >= 58 && t < 75.4 && <Bacteria t={t} />}
        {t >= 64 && VIRUSES.map((v, i) => (
          <group key={i} position={v.p}><Virus t={t} spin={v.spin} /></group>
        ))}
        {t >= 74 && <Atoms />}
      </group>
      <Marc t={t} walk={0} cold={t > 69 && t < 75 ? 0.5 : 0} />
    </>
  );
};
