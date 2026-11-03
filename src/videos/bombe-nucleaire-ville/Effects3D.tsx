import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Ball, Block, BOX, Cyl, Mat, PAL, seeded} from '../../assets/kit';
import {DetailBlocks, type DetailBlock} from '../../assets/details';
import {smooth} from '../../core/animation';
import {useGlowTexture} from '../../shared/three/common';
import {Inst} from '../../shared/three/instanced';

export type EffectOrigin = [number, number, number];

// This is a condensed illustration, not a scale model of a particular weapon.
// The whole animation is sampled from the film clock, including turbulence.
const CLOUD = new THREE.IcosahedronGeometry(1, 1);
const DEBRIS = new THREE.BoxGeometry(1, 1, 1);
const STONE = new THREE.Color('#665e55');
const SOOT = new THREE.Color('#35383b');
const EMBER = new THREE.Color('#ee8d42');
const PALE = new THREE.Color('#fff0b4');
const RING = new THREE.RingGeometry(0.975, 1, 96);
const FIRE_GEO = (() => {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const p = geometry.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const amber = new THREE.Color('#e7591b');
  const gold = new THREE.Color('#ffb14c');
  const white = new THREE.Color('#fff0b9');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    const triangle = Math.sin(i * 4.79) * 0.5 + 0.5;
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const heat = Math.min(1, Math.max(0, 0.28 + y * 0.4 - z * 0.1 + triangle * 0.35));
    c.copy(amber).lerp(gold, Math.min(1, heat * 1.8)).lerp(white, smooth(0.35, 0.95, heat));
    for (let k = 0; k < 3; k++) {
      const j = i + k;
      const ripple = 1 + Math.sin(p.getX(j) * 9 + p.getY(j) * 7) * Math.cos(p.getZ(j) * 8) * 0.045;
      p.setXYZ(j, p.getX(j) * ripple, p.getY(j) * ripple, p.getZ(j) * ripple);
      colors[j * 3] = c.r; colors[j * 3 + 1] = c.g; colors[j * 3 + 2] = c.b;
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
})();

const makeSeeds = (n: number, seed: number) => {
  const random = seeded(seed);
  return Array.from({length: n}, () => ({a: random(), b: random(), c: random(), d: random()}));
};
const CAP = makeSeeds(132, 83119);
const STEM = makeSeeds(64, 83120);
const DUST = makeSeeds(112, 83121);
const BITS = makeSeeds(76, 83122);
const FIRE_CELLS = makeSeeds(58, 83125);
const LIP = makeSeeds(86, 83126);
const WISPS = makeSeeds(68, 83127);
const JETS = makeSeeds(22, 83128);
const FALL = makeSeeds(144, 83123);
const HAZE = makeSeeds(32, 83124);

export type NuclearEffectsProps = {
  t: number;
  origin?: EffectOrigin;
  impact?: number;
};

/** Fireball, rising cloud and blast dust, in deliberately compressed film time. */
export const NuclearEffects: React.FC<NuclearEffectsProps> = ({t, origin = [0, 0, -120], impact = 8}) => {
  const glow = useGlowTexture();
  const dt = Math.max(0, t - impact);
  if (t < impact) return null;
  const birth = smooth(0, 0.65, dt);
  const formation = smooth(1.5, 15, dt);
  const crownHeight = 12 + 46 * formation + 2.5 * smooth(15, 38, dt);
  const cloudRadius = 7 + 22 * formation;
  const cooling = smooth(2, 19, dt);
  const fire = Math.max(0.001, (7 + 12 * smooth(0, 2, dt)) * birth * (1 - smooth(3.5, 10, dt)));
  const shock = 10 + dt * 9.3;
  const dustRadius = 5 + dt * 6.8;
  const cloudBirth = smooth(1, 4, dt);
  const cloudGlow = new THREE.Color('#a5481b').multiplyScalar((1 - cooling) * 0.42);
  const cellAge = smooth(0.08, 1.4, dt) * (1 - smooth(4.2, 9.5, dt));

  return <group position={origin}>
    {dt < 11 && <>
      <mesh position={[0, 9 + 8 * smooth(0, 4, dt), 0]} scale={[fire, fire * 0.95, fire]} geometry={FIRE_GEO} rotation={[0, t * 0.035, 0]}>
        <meshBasicMaterial color={new THREE.Color('#ffffff').lerp(new THREE.Color('#d66830'), smooth(2.5, 9, dt))} vertexColors fog={false}/>
      </mesh>
      <Inst count={FIRE_CELLS.length} geo={CLOUD} basic fog={false} update={(i, obj, color) => {
        const s = FIRE_CELLS[i];
        const latitude = -0.85 + s.a * 1.7;
        const around = i * 2.399963 + t * 0.045;
        const ringRadius = Math.sqrt(1 - latitude * latitude);
        const radial = fire * (0.94 + s.c * 0.1);
        obj.position.set(Math.cos(around) * ringRadius * radial, 9 + 8 * smooth(0, 4, dt) + latitude * radial * 0.92, Math.sin(around) * ringRadius * radial);
        const radius = fire * (0.09 + s.d * 0.095) * cellAge;
        obj.scale.set(radius * 1.3, radius * (0.85 + s.b * 0.5), radius);
        obj.rotation.set(s.b * 4, s.c * 6 + t * 0.08, s.a * 4);
        color.set('#d94e17').lerp(new THREE.Color('#ffbc52'), 0.25 + s.b * 0.6).lerp(PALE, Math.max(0, latitude) * (1 - smooth(2, 6, dt)) * 0.65);
      }}/>
      <Inst count={JETS.length} geo={CLOUD} basic fog={false} update={(i, obj, color) => {
        const s = JETS[i];
        const a = i / JETS.length * Math.PI * 2;
        const jet = smooth(0.2 + s.a, 2 + s.b, dt) * (1 - smooth(4 + s.b, 8, dt));
        const radial = fire * (0.85 + s.c * 0.45);
        obj.position.set(Math.cos(a) * radial, 2 + jet * (3 + s.d * 9), Math.sin(a) * radial);
        obj.scale.set((1 + s.c) * jet, (3 + s.d * 6) * jet, (1 + s.b) * jet);
        obj.rotation.set(Math.sin(a) * 0.35, a, -Math.cos(a) * 0.35);
        color.set('#bd4a1d').lerp(EMBER, s.c * 0.8);
      }}/>
      <sprite position={[0, 13, 0]} scale={[135 * Math.exp(-dt * 0.36), 135 * Math.exp(-dt * 0.36), 1]}>
        <spriteMaterial map={glow} color="#ffc278" transparent opacity={0.65 * Math.exp(-dt * 0.3)} depthWrite={false} fog={false} blending={THREE.AdditiveBlending}/>
      </sprite>
    </>}

    <Inst count={STEM.length} geo={CLOUD} emissive={cloudGlow} fog={false} update={(i, obj, color) => {
      const s = STEM[i];
      const level = i / (STEM.length - 1);
      const angle = i * 2.399963 + t * (0.03 + level * 0.012);
      const radius = (2.7 + 2.6 * Math.sin(level * Math.PI)) * cloudBirth;
      const curl = 1.3 + level * 1.1 + Math.sin(level * 13 + t * 0.15) * 0.65;
      obj.position.set(Math.cos(angle) * curl, 3 + level * (crownHeight - 7), Math.sin(angle) * curl);
      obj.scale.set(radius * (0.72 + s.b * 0.52), radius * (1.15 + s.c * 0.9), radius);
      obj.rotation.set(s.b + t * 0.02, s.c + t * 0.035, s.a);
      const interiorHeat = (1 - smooth(3, 17, dt)) * (0.4 + Math.sin(level * 17 + t * 0.2) * 0.15);
      color.copy(STONE).lerp(SOOT, s.d * 0.4).lerp(EMBER, interiorHeat).multiplyScalar(0.82 + s.b * 0.35);
    }}/>

    <Inst count={CAP.length} geo={CLOUD} emissive={cloudGlow} fog={false} update={(i, obj, color) => {
      const s = CAP[i];
      const lower = i < 64;
      const middle = i >= 64 && i < 112;
      const local = lower ? i / 64 : middle ? (i - 64) / 48 : s.a;
      const angle = local * Math.PI * 2 + (lower ? -1 : 1) * t * 0.015;
      const spread = lower ? cloudRadius * (0.82 + 0.1 * s.b) : middle ? cloudRadius * (0.48 + 0.18 * s.b) : Math.sqrt(s.b) * cloudRadius * 0.28;
      const height = lower ? -2 + s.c * 3.4 : middle ? 4.2 + s.c * 3.5 : 9 + s.c * 3;
      const billow = Math.sin(t * 0.21 + local * 17) * 0.7;
      obj.position.set(Math.cos(angle) * spread, crownHeight + height + billow, Math.sin(angle) * spread);
      const r = (4.9 + s.d * 3.3) * cloudBirth * (0.62 + formation * 0.38);
      obj.scale.set(r * (lower ? 1.2 : 1.25), r * (lower ? 0.6 : middle ? 0.9 : 0.85), r * 1.06);
      obj.rotation.set(s.a + t * 0.025, s.b + t * 0.022, s.d);
      color.copy(STONE).lerp(SOOT, lower ? 0.23 + s.c * 0.2 : s.c * 0.17).lerp(EMBER, (1 - cooling) * (lower ? 0.55 : 0.76));
      color.multiplyScalar(0.77 + s.a * 0.52 + (middle ? 0.09 : 0));
    }}/>

    {/* Smaller rolling curls articulate the lip instead of a single row of beads. */}
    <Inst count={LIP.length} geo={CLOUD} emissive={cloudGlow} fog={false} update={(i, obj, color) => {
      const s = LIP[i];
      const angle = i / LIP.length * Math.PI * 2 + t * 0.026;
      const radius = cloudRadius * (0.91 + 0.13 * s.b);
      const curl = Math.sin(angle * 8 + t * 0.14);
      obj.position.set(Math.cos(angle) * radius, crownHeight - 2.8 + curl * 0.8 + s.c * 3.5, Math.sin(angle) * radius);
      const size = (1.9 + s.d * 1.9) * cloudBirth * (0.7 + formation * 0.3);
      obj.scale.set(size * 1.2, size * 0.83, size);
      obj.rotation.set(s.a + t * 0.03, angle, s.d);
      color.copy(SOOT).lerp(STONE, s.b * 0.7).lerp(new THREE.Color('#dc8043'), (1 - smooth(4, 18, dt)) * 0.45);
    }}/>

    <Inst count={WISPS.length} geo={CLOUD} fog={false} update={(i, obj, color) => {
      const s = WISPS[i];
      const capPart = i % 3 !== 0;
      const angle = s.a * Math.PI * 2 + t * 0.03;
      const radial = capPart ? cloudRadius * (0.88 + s.b * 0.22) : 4 + s.b * 3;
      const y = capPart ? crownHeight + 1 + s.c * 8 : 5 + s.c * (crownHeight - 6);
      obj.position.set(Math.cos(angle) * radial, y + Math.sin(t * 0.18 + s.d * 6) * 0.5, Math.sin(angle) * radial);
      const size = (0.8 + s.d * 1.4) * cloudBirth;
      obj.scale.set(size * 1.3, size * 1.25, size);
      obj.rotation.set(s.a, t * 0.03, s.d);
      color.copy(STONE).lerp(new THREE.Color('#9b8b74'), s.b * 0.55).lerp(EMBER, (1 - cooling) * 0.5);
    }}/>

    {dt < 20 && <mesh position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={RING} scale={[shock, shock, 1]}>
      <meshBasicMaterial color="#f6dfba" transparent opacity={(1 - smooth(9, 20, dt)) * 0.78} side={THREE.DoubleSide} depthWrite={false} fog={false}/>
    </mesh>}

    {dt < 35 && <Inst count={DUST.length} geo={CLOUD} fog={false} transparent opacity={0.43 * smooth(0.5, 3.5, dt) * (1 - smooth(22, 35, dt))} update={(i, obj, color) => {
      const s = DUST[i];
      const angle = (i + s.a * 0.95) / DUST.length * Math.PI * 2;
      const radius = dustRadius * (0.86 + s.c * 0.24) + (s.a - 0.5) * 15;
      obj.position.set(Math.cos(angle) * radius, 0.5 + s.b * 3.5, Math.sin(angle) * radius);
      const r = 1 + dt * 0.12 + s.c * 2.1;
      obj.scale.set(r * (1.25 + s.a), r * (0.35 + s.b * 0.7), r * (1.1 + s.d));
      obj.rotation.set(0, s.d * 6, 0);
      color.set('#a1937e').lerp(STONE, s.b * 0.5);
    }}/>}

    <Inst count={BITS.length} geo={DEBRIS} update={(i, obj, color) => {
      const s = BITS[i];
      const age = Math.max(0, dt - 1.5 - s.a * 3);
      const angle = s.b * Math.PI * 2;
      const radius = 10 + age * (1.2 + s.c * 2.2);
      const y = Math.max(0.17, 1 + age * (3 + s.d * 5) - age * age * 1.7);
      obj.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const size = smooth(1.5, 2, dt) * (0.2 + s.c * 0.7);
      obj.scale.set(size, size * 0.45, size * 1.6);
      obj.rotation.set(s.a + Math.min(age, 6), s.b * 6, s.c * 3);
      color.set(i % 3 === 0 ? PAL.zincDark : PAL.stoneDark);
    }}/>
  </group>;
};

export type FalloutPlumeProps = {
  t: number;
  origin?: EffectOrigin;
  start?: number;
};

/** Visible dust carried downwind in a qualitative aerial diagram. */
export const FalloutPlume: React.FC<FalloutPlumeProps> = ({t, origin = [0, 0, -120], start = 40}) => {
  const age = Math.max(0, t - start);
  const appear = smooth(start, start + 0.75, t);
  if (t < start) return null;
  return <group position={origin}>
    <Inst count={HAZE.length} geo={CLOUD} basic transparent opacity={0.21 * appear} fog={false} update={(i, obj, color) => {
      const s = HAZE[i];
      const along = i / (HAZE.length - 1);
      const x = 3 + along * (95 + age * 6);
      obj.position.set(x, 4 + (1 - along) * 11 + s.b * 4, (s.a - 0.5) * (12 + along * 32));
      obj.scale.set(10 + along * 10, 2.5 + s.c * 3, 4 + along * 9);
      obj.rotation.y = s.d * 2;
      color.set('#d3a77c').lerp(new THREE.Color('#927b66'), along);
    }}/>
    <Inst count={FALL.length} geo={CLOUD} basic fog={false} update={(i, obj, color) => {
      const s = FALL[i];
      const along = s.a;
      const drift = age * (3 + s.c * 2);
      obj.position.set(7 + along * 126 + drift, 2 + (1 - along) * 28 + s.d * 5 - age * 0.6, (s.b - 0.5) * (9 + along * 49) + Math.sin(t * 0.4 + i) * 0.8);
      const radius = (0.24 + s.d * 0.56) * appear;
      obj.scale.setScalar(radius);
      obj.rotation.set(s.a, t * 0.25 + s.b, s.d);
      color.set(i % 4 === 0 ? '#f8d49c' : '#b9a68d');
    }}/>
  </group>;
};

const WALL_JOINTS: DetailBlock[] = [];
const ROOM_WOOD: DetailBlock[] = [];
const ROOM_METAL: DetailBlock[] = [];
const RADIO_GRILLE: DetailBlock[] = [];
const BOLTS: {p: EffectOrigin; axis: number}[] = [];
for (const side of [-1, 1]) {
  for (const y of [0.75, 1.5, 2.25]) WALL_JOINTS.push({p: [side * 2.989, y, 0], s: [0.012, 0.016, 6]});
  for (const z of [-2.3, -0.8, 0.7, 2.2]) WALL_JOINTS.push({p: [side * 2.987, 1.5, z], s: [0.014, 2.96, 0.015]});
  for (let i = 0; i < 5; i++) ROOM_WOOD.push({p: [side * (2.17 + i * 0.14), 0.56, 0.75], s: [0.12, 0.105, 2.8]});
  for (const y of [0.84, 1.02]) ROOM_WOOD.push({p: [side * 2.77, y, 0.75], s: [0.1, 0.13, 2.8]});
  for (const z of [-0.25, 1.75]) {
    ROOM_METAL.push({p: [side * 2.45, 0.25, z], s: [0.56, 0.48, 0.08]});
    ROOM_METAL.push({p: [side * 2.45, 0.045, z], s: [0.7, 0.07, 0.2]});
    BOLTS.push({p: [side * 2.45, 0.618, z], axis: 0});
  }
}
for (const side of [-1, 1]) {
  for (const y of [0.75, 1.5, 2.25]) WALL_JOINTS.push({p: [side * 1.95, y, 2.987], s: [2.2, 0.017, 0.014]});
  for (const x of [1.35, 2.55]) WALL_JOINTS.push({p: [side * x, 1.5, 2.986], s: [0.014, 2.96, 0.015]});
  for (let row = 0; row < 7; row++) BOLTS.push({p: [side * 0.731, 0.22 + row * 0.33, 2.742], axis: 1});
}
for (let i = 0; i < 11; i++) RADIO_GRILLE.push({p: [1.75, 1.342 + i * 0.03, 2.355], s: [0.3, 0.012, 0.018]});
for (let i = 0; i < 7; i++) RADIO_GRILLE.push({p: [1.61 + i * 0.047, 1.49, 2.35], s: [0.009, 0.31, 0.018]});
const BOLT_GEO = new THREE.CylinderGeometry(0.018, 0.018, 0.016, 6);
const PANE = new THREE.PlaneGeometry(1, 1);
const ROOM_STAINS = makeSeeds(34, 83130);
const ROOM_DUST = makeSeeds(38, 83131);
const CRACK_GEO = (() => {
  const geometry = new THREE.BufferGeometry();
  const points = [1.9, 2.99, 2.977, 1.96, 2.71, 2.977, 1.96, 2.71, 2.977, 1.86, 2.54, 2.977,
    1.86, 2.54, 2.977, 1.97, 2.25, 2.977, 1.96, 2.71, 2.977, 2.15, 2.63, 2.977,
    -2.3, 0.05, 2.977, -2.24, 0.24, 2.977, -2.24, 0.24, 2.977, -2.33, 0.45, 2.977];
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
})();

const canvasTexture = (width: number, height: number, paint: (g: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d')!;
  paint(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const useRoomTextures = () => useMemo(() => {
  const concrete = canvasTexture(512, 512, (g) => {
    const r = seeded(74128);
    g.fillStyle = '#c5cbc6'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      const n = 100 + Math.floor(r() * 95);
      g.fillStyle = `rgba(${n},${n + 4},${n + 1},${0.07 + r() * 0.16})`;
      const s = 0.5 + r() * 2.5;
      g.fillRect(r() * 512, r() * 512, s, s);
    }
    for (const y of [126, 254, 382]) {
      g.fillStyle = 'rgba(55,70,64,.11)'; g.fillRect(0, y, 512, 2);
      g.fillStyle = 'rgba(235,239,226,.2)'; g.fillRect(0, y + 2, 512, 1);
    }
  });
  const sign = canvasTexture(768, 256, (g) => {
    g.fillStyle = '#d9dfca'; g.fillRect(0, 0, 768, 256);
    g.fillStyle = '#264a48'; g.fillRect(12, 12, 744, 232);
    g.strokeStyle = '#bfcfba'; g.lineWidth = 3; g.strokeRect(26, 26, 716, 204);
    g.fillStyle = '#e4e6d3'; g.font = 'bold 100px Arial'; g.fillText('ABRI 04', 48, 132);
    g.font = '24px Arial'; g.fillText('SOUS-SOL  /  SECTEUR B', 53, 185);
    g.fillRect(642, 75, 48, 14); g.fillRect(659, 58, 14, 48);
  });
  const plan = canvasTexture(512, 640, (g) => {
    const r = seeded(7139);
    g.fillStyle = '#dfdbc8'; g.fillRect(0, 0, 512, 640);
    g.fillStyle = '#395451'; g.font = 'bold 37px Arial'; g.fillText('PLAN DU SOUS-SOL', 24, 56);
    g.font = '19px Arial'; g.fillText('BÂTIMENT B — NIVEAU -1', 25, 89);
    g.strokeStyle = '#57665d'; g.lineWidth = 7; g.strokeRect(38, 142, 435, 335);
    for (const x of [130, 320]) {g.beginPath(); g.moveTo(x, 142); g.lineTo(x, 477); g.stroke();}
    for (const y of [244, 366]) {g.beginPath(); g.moveTo(38, y); g.lineTo(473, y); g.stroke();}
    g.fillStyle = '#589082'; g.fillRect(137, 373, 176, 96);
    g.fillStyle = '#e7edda'; g.font = 'bold 22px Arial'; g.fillText('ABRI', 190, 428);
    g.fillStyle = '#a66c42'; g.beginPath(); g.arc(205, 420, 10, 0, 6.29); g.fill();
    g.fillStyle = '#66766a'; g.font = '17px Arial'; g.fillText('VOUS ÊTES ICI', 44, 529);
    for (let i = 0; i < 5; i++) g.fillRect(45, 558 + i * 10, 125 + r() * 260, 3);
    g.strokeStyle = '#b2ab94'; g.lineWidth = 2; g.strokeRect(12, 12, 488, 616);
  });
  const tuning = canvasTexture(512, 160, (g) => {
    g.fillStyle = '#9ba88c'; g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#253a35'; g.font = '28px Arial'; g.fillText('FM   88   92   96   100   104', 12, 40);
    for (let i = 0; i < 42; i++) g.fillRect(14 + i * 11.5, 60, 2, i % 5 ? 18 : 31);
    g.fillStyle = '#b14d35'; g.fillRect(302, 50, 5, 70);
    g.fillStyle = '#253a35'; g.font = '18px Arial'; g.fillText('AM     •     FM     •     SW', 95, 144);
  });
  const glassDirt = canvasTexture(512, 320, (g) => {
    const r = seeded(75918);
    const edge = g.createRadialGradient(250, 150, 50, 250, 150, 280);
    edge.addColorStop(0, 'rgba(137,147,126,.025)'); edge.addColorStop(0.65, 'rgba(110,126,111,.12)'); edge.addColorStop(1, 'rgba(65,83,70,.55)');
    g.fillStyle = edge; g.fillRect(0, 0, 512, 320);
    for (let i = 0; i < 95; i++) {
      g.strokeStyle = `rgba(190,202,173,${0.04 + r() * 0.15})`; g.lineWidth = 0.4 + r() * 1.4;
      const x = r() * 512, y = r() * 320;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8 + r() * 22, y + 40 + r() * 85); g.stroke();
    }
    g.strokeStyle = 'rgba(226,232,202,.2)'; g.lineWidth = 5; g.beginPath(); g.moveTo(40, 35); g.lineTo(160, 55); g.lineTo(220, 45); g.stroke();
  });
  return {concrete, sign, plan, tuning, glassDirt};
}, []);

const ConcreteBlock: React.FC<{p: EffectOrigin; s: EffectOrigin; map: THREE.Texture; color: string}> = ({p, s, map, color}) =>
  <mesh geometry={BOX} position={p} scale={s}><meshStandardMaterial map={map} color={color} roughness={0.98} flatShading /></mesh>;

const PrintedPanel: React.FC<{p: EffectOrigin; size: [number, number]; map: THREE.Texture}> = ({p, size, map}) =>
  <mesh geometry={PANE} position={p} rotation={[0, Math.PI, 0]} scale={[size[0], size[1], 1]}><meshStandardMaterial map={map} roughness={0.85} /></mesh>;

export const SHELTER_DOOR = {handle: [-0.52, 1.15, 2.76] as EffectOrigin, window: [0, 1.9, 2.855] as EffectOrigin};
export const SHELTER_KNOCKS = [50.5, 51.2, 52] as const;
export type ShelterRoomProps = {t: number; doorTension?: number; revealShadow?: number; knockTimes?: readonly number[]};

/** Detailed cold-concrete shelter with one warm practical lamp. The -z wall is open. */
export const ShelterRoom: React.FC<ShelterRoomProps> = ({t, doorTension, revealShadow, knockTimes = SHELTER_KNOCKS}) => {
  const maps = useRoomTextures();
  const tension = Math.max(0, Math.min(1, doorTension ?? smooth(55.4, 57.2, t)));
  const shadow = Math.max(0, Math.min(1, revealShadow ?? smooth(54.8, 55.7, t)));
  const vibration = knockTimes.reduce((sum, at) => {
    const d = t - at;
    return sum + (d >= 0 && d < 0.25 ? Math.sin(d * 80) * Math.exp(-d * 20) * 0.012 : 0);
  }, 0);
  const radioBlink = 0.5 + Math.sin(t * 4) * 0.12;
  return <group>
    <ConcreteBlock p={[0, -0.17, 0]} s={[6.6, 0.34, 6.8]} color="#697775" map={maps.concrete}/>
    <ConcreteBlock p={[0, 3.25, 0]} s={[6.6, 0.4, 6.8]} color="#7d8984" map={maps.concrete}/>
    <ConcreteBlock p={[-3.2, 1.5, 0]} s={[0.4, 3, 6.8]} color="#8a9691" map={maps.concrete}/>
    <ConcreteBlock p={[3.2, 1.5, 0]} s={[0.4, 3, 6.8]} color="#86948f" map={maps.concrete}/>
    {/* The doorway is a real opening, including behind the frosted window. */}
    <ConcreteBlock p={[-2.05, 1.5, 3.2]} s={[2.5, 3, 0.4]} color="#82918a" map={maps.concrete}/>
    <ConcreteBlock p={[2.05, 1.5, 3.2]} s={[2.5, 3, 0.4]} color="#82918a" map={maps.concrete}/>
    <ConcreteBlock p={[0, 2.76, 3.2]} s={[1.6, 0.48, 0.4]} color="#82918a" map={maps.concrete}/>
    <DetailBlocks blocks={WALL_JOINTS} color="#586861"/>
    <DetailBlocks blocks={ROOM_WOOD} color="#967752"/>
    <DetailBlocks blocks={ROOM_METAL} color="#304741" metal/>
    {[-2, 0, 2].map((z) => <Block key={z} p={[0, 2.95, z]} s={[6.2, 0.18, 0.17]} c="#9da79b"/>)}
    <lineSegments geometry={CRACK_GEO}><lineBasicMaterial color="#4f6059" transparent opacity={0.65}/></lineSegments>
    <Inst count={ROOM_STAINS.length} geo={CLOUD} transparent opacity={0.12} update={(i, obj, color) => {
      const s = ROOM_STAINS[i];
      const side = i % 2 ? 1 : -1;
      obj.position.set(side * 2.983, 0.1 + s.a * 0.58, -2.5 + s.b * 5.6);
      obj.scale.set(0.009, 0.12 + s.c * 0.28, 0.12 + s.d * 0.5);
      color.set('#344e43');
    }}/>
    <Inst count={BOLTS.length} geo={BOLT_GEO} update={(i, obj, color) => {
      obj.position.set(...BOLTS[i].p); obj.rotation.x = BOLTS[i].axis ? Math.PI / 2 : 0; color.set('#a4b0a9');
    }}/>

    {/* Printed wayfinding, a worn plan and a proper ventilation grille. */}
    <Block p={[-1.8, 2.1, 2.94]} s={[1.75, 0.61, 0.05]} c="#334f48"/>
    <PrintedPanel p={[-1.8, 2.1, 2.906]} size={[1.65, 0.55]} map={maps.sign}/>
    <Block p={[-1.8, 1.25, 2.945]} s={[1.01, 1.27, 0.04]} c="#5d6a5f"/>
    <PrintedPanel p={[-1.8, 1.25, 2.916]} size={[0.95, 1.19]} map={maps.plan}/>
    <Block p={[-2.22, 2.63, 2.87]} s={[0.93, 0.33, 0.17]} c="#3e5550" metal/>
    {Array.from({length: 9}, (_, i) => <Block key={i} p={[-2.61 + i * 0.096, 2.63, 2.773]} s={[0.035, 0.24, 0.035]} c="#a9b6a9"/>)}
    <Cyl p={[0, 2.75, 2.72]} rad={0.045} h={5.55} r={[0, 0, Math.PI / 2]} c="#687d76" metal seg={8}/>
    <Cyl p={[2.78, 2.05, 2.72]} rad={0.045} h={1.4} c="#687d76" metal seg={8}/>
    <Cyl p={[-2.9, 2.5, 0]} rad={0.032} h={5.9} r={[Math.PI / 2, 0, 0]} c="#566c66" metal seg={8}/>
    {[-2.5, -1.25, 0, 1.25, 2.5].map((x) => <Block key={x} p={[x, 2.75, 2.79]} s={[0.08, 0.18, 0.06]} c="#344b45" metal/>)}
    <Block p={[2.48, 1.91, 2.9]} s={[0.41, 0.53, 0.14]} c="#566b63" metal/>
    <Block p={[2.48, 1.91, 2.812]} s={[0.32, 0.43, 0.025]} c="#bdc6b5"/>
    <Block p={[2.48, 1.95, 2.787]} s={[0.075, 0.17, 0.035]} c="#344b45"/>
    <Ball p={[2.58, 1.77, 2.785]} rad={0.022} c="#c99856" detail={0}/>

    <group position={[0, 0, vibration]}>
      {/* Four steel panels leave a small, irregularly dirty real glass aperture. */}
      <Block p={[0, 0.825, 2.96]} s={[1.33, 1.65, 0.16]} c="#455f5b" metal/>
      <Block p={[0, 2.245, 2.96]} s={[1.33, 0.23, 0.16]} c="#455f5b" metal/>
      {[-1, 1].map((side) => <Block key={side} p={[side * 0.483, 1.9, 2.96]} s={[0.365, 0.5, 0.16]} c="#455f5b" metal/>)}
      <Block p={[0, 2.45, 2.82]} s={[1.6, 0.16, 0.23]} c="#263f3a" metal/>
      {[-1, 1].map((side) => <group key={side}>
        <Block p={[side * 0.73, 1.2, 2.82]} s={[0.13, 2.4, 0.23]} c="#263f3a" metal/>
        <Block p={[side * 0.325, 1.9, 2.842]} s={[0.055, 0.58, 0.06]} c="#253d37" metal/>
      </group>)}
      {[1.61, 2.19].map((y) => <Block key={y} p={[0, y, 2.842]} s={[0.7, 0.06, 0.06]} c="#253d37" metal/>)}
      {[0.42, 1.05, 1.6].map((y) => <group key={y}>
        <Cyl p={[0.646, y, 2.82]} rad={0.042} h={0.19} c="#a2ada3" metal seg={8}/>
        <Block p={[0.6, y, 2.835]} s={[0.13, 0.12, 0.025]} c="#657b70" metal/>
      </group>)}
      <Block p={[0, 0.14, 2.858]} s={[1.16, 0.13, 0.025]} c="#91a097" metal/>
      <Block p={[0, 0.87, 2.864]} s={[1.16, 0.035, 0.018]} c="#324d45"/>
      <group position={SHELTER_DOOR.handle}>
        <Cyl p={[0, 0, 0.035]} rad={0.072} h={0.026} r={[Math.PI / 2, 0, 0]} c="#aeb7aa" metal seg={12}/>
        <Cyl p={[0, 0, -0.007]} rad={0.034} h={0.09} r={[Math.PI / 2, 0, 0]} c="#c7ccbd" metal seg={12}/>
        <group rotation={[0, 0, -0.48 * tension]}>
          <Block p={[0.135, 0, -0.048]} s={[0.27, 0.055, 0.055]} c="#a9b5aa" metal/>
          <Block p={[0.262, 0.007, -0.048]} s={[0.04, 0.071, 0.066]} c="#c8cdbf" metal/>
        </group>
        <Cyl p={[0, -0.19, 0.038]} rad={0.022} h={0.025} r={[Math.PI / 2, 0, 0]} c="#243c36" seg={8}/>
      </group>
      <mesh geometry={PANE} position={SHELTER_DOOR.window} rotation={[0, Math.PI, 0]} scale={[0.6, 0.5, 1]} renderOrder={2}>
        <meshStandardMaterial color="#b1c3ae" roughness={0.36} metalness={0.06} transparent opacity={0.34} depthWrite={false}/>
      </mesh>
      <mesh geometry={PANE} position={[0, 1.9, 2.846]} rotation={[0, Math.PI, 0]} scale={[0.6, 0.5, 1]} renderOrder={3}>
        <meshBasicMaterial map={maps.glassDirt} transparent depthWrite={false}/>
      </mesh>
    </group>
    {/* A partial head and blue shoulder behind frosted glass, with no visible face. */}
    <Block p={[0, 1.9, 3.39]} s={[0.65, 0.56, 0.02]} c="#a4b59c" e="#b9c7a3" ei={0.18}/>
    {shadow > 0 && <group position={[0.025 + Math.sin(t * 0.8) * 0.009, 0, 3.15]} scale={[shadow, 1, 1]}>
      <mesh geometry={CLOUD} position={[0, 1.94, 0]} scale={[0.175, 0.205, 0.085]}><meshBasicMaterial color="#22332f"/></mesh>
      <Block p={[0.055, 1.65, 0.025]} s={[0.55, 0.24, 0.1]} c="#344f67"/>
      <Block p={[0.11, 1.72, -0.015]} s={[0.15, 0.09, 0.05]} c="#283d4e"/>
    </group>}

    {/* A portable radio with actual lattice, tuning scale, controls and carry handle. */}
    <Block p={[1.58, 1.21, 2.62]} s={[1.2, 0.09, 0.55]} c="#65746a"/>
    {[1.12, 2.04].map((x) => <Block key={x} p={[x, 1.1, 2.79]} s={[0.065, 0.27, 0.3]} r={[0.4, 0, 0]} c="#344c43" metal/>)}
    <Block p={[1.58, 1.49, 2.57]} s={[0.83, 0.48, 0.35]} c="#334b47"/>
    <Block p={[1.58, 1.49, 2.38]} s={[0.78, 0.42, 0.035]} c="#6d7b6e"/>
    <Block p={[1.75, 1.49, 2.352]} s={[0.36, 0.33, 0.018]} c="#182c29"/>
    <DetailBlocks blocks={RADIO_GRILLE} color="#718779" metal/>
    <Block p={[1.35, 1.59, 2.345]} s={[0.24, 0.105, 0.025]} c="#2f4038"/>
    <PrintedPanel p={[1.35, 1.59, 2.327]} size={[0.22, 0.085]} map={maps.tuning}/>
    {[1.29, 1.44].map((x, i) => <group key={x}>
      <Cyl p={[x, 1.405, 2.325]} rad={i ? 0.038 : 0.052} h={0.045} r={[Math.PI / 2, 0, 0]} c="#263d35" metal seg={12}/>
      <Block p={[x, 1.42, 2.298]} s={[0.008, 0.028, 0.007]} c="#d8d7bd"/>
    </group>)}
    <Ball p={[1.35, 1.72, 2.335]} rad={0.012} c="#9ec18e" e="#96c88c" ei={radioBlink} detail={1}/>
    {[1.3, 1.86].map((x) => <Block key={x} p={[x, 1.82, 2.58]} s={[0.042, 0.16, 0.06]} c="#263e36"/>)}
    <Block p={[1.58, 1.9, 2.58]} s={[0.6, 0.04, 0.06]} c="#263e36"/>
    <Cyl p={[1.92, 2.08, 2.6]} rad={0.011} h={0.72} c="#aebeb2" metal seg={6}/>
    <Cyl p={[1.92, 2.48, 2.6]} rad={0.007} h={0.18} c="#d1d8ca" metal seg={6}/>
    <Ball p={[1.92, 2.575, 2.6]} rad={0.012} c="#d1d8ca" detail={0}/>
    <Cyl p={[2.28, 1.11, 2.77]} rad={0.012} h={0.6} c="#293d32" seg={6}/>

    {/* Supplies, labels, caps, box straps and a small emergency torch. */}
    {[-0.3, 0.03, 0.36, 0.69].map((z, i) => <group key={z}>
      <Cyl p={[-2.45, 0.87, z]} rad={0.078} h={0.44} c="#75a3a6" seg={10}/>
      <Cyl p={[-2.45, 1.11, z]} rad={0.043} h={0.055} c="#d0d3bf" seg={8}/>
      <Cyl p={[-2.45, 0.88, z]} rad={0.08} h={0.12} c={i % 2 ? '#d4d9c3' : '#9fbdb3'} seg={10}/>
    </group>)}
    <Block p={[-2.45, 0.88, 1.48]} s={[0.5, 0.48, 0.63]} c="#a4926e"/>
    <Block p={[-2.45, 0.88, 1.153]} s={[0.1, 0.48, 0.016]} c="#d0c2a0"/>
    <Block p={[-2.45, 1.127, 1.48]} s={[0.1, 0.014, 0.63]} c="#d0c2a0"/>
    <Block p={[-2.45, 0.93, 1.143]} s={[0.29, 0.11, 0.012]} c="#d8d7bd"/>
    <Block p={[-2.39, 0.8, 2.13]} s={[0.5, 0.33, 0.44]} c="#8e9d8b"/>
    <Block p={[-2.39, 0.88, 1.902]} s={[0.19, 0.05, 0.016]} c="#d6d9be"/>
    <Cyl p={[-2.5, 0.71, -0.63]} rad={0.062} h={0.42} r={[Math.PI / 2, 0, 0]} c="#526d60" seg={8}/>
    <Cyl p={[-2.5, 0.71, -0.86]} rad={0.084} h={0.07} r={[Math.PI / 2, 0, 0]} c="#b9c4b4" seg={8}/>

    {/* Caged amber bulb; concrete remains cooler than its small pool of light. */}
    <Cyl p={[0, 2.86, 0.5]} rad={0.025} h={0.26} c={PAL.iron} seg={6}/>
    <Ball p={[0, 2.65, 0.5]} rad={0.12} c="#ffe0a2" e="#ffb95e" ei={0.8} detail={1}/>
    {[-0.13, 0.13].map((x) => <Block key={x} p={[x, 2.65, 0.5]} s={[0.018, 0.3, 0.018]} c="#31483e"/>)}
    {[-0.13, 0.13].map((z) => <Block key={z} p={[0, 2.65, 0.5 + z]} s={[0.018, 0.3, 0.018]} c="#31483e"/>)}
    {[2.49, 2.79].map((y) => <Cyl key={y} p={[0, y, 0.5]} rad={0.16} h={0.025} c="#31483e" seg={8}/>)}
    <pointLight position={[0, 2.48, 0.5]} color="#ffcf8f" intensity={12} distance={8} decay={2}/>
    <mesh geometry={PANE} position={[0, 0.012, -2.35]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.8, 0.06, 1]}><Mat color="#c0b183"/></mesh>
    <Inst count={ROOM_DUST.length} geo={CLOUD} basic transparent opacity={0.16} update={(i, obj, color) => {
      const s = ROOM_DUST[i];
      obj.position.set((s.a - 0.5) * 4.9 + Math.sin(t * 0.14 + i) * 0.03, 0.2 + s.b * 2.5 + Math.sin(t * 0.21 + i) * 0.025, -1.5 + s.c * 4.2);
      obj.scale.setScalar(0.003 + s.d * 0.005); color.set('#d6d7bc');
    }}/>
  </group>;
};
