import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useGlowTexture} from '../../shared/three/common';
import {SkyDome} from '../../shared/three/SkyDome';
import {rng, smooth} from '../../core/animation';
import {gradeColor, gradeNum, timeAtTemp} from './curve';

// ---------- Géométries partagées ----------
export const BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
export const CUBE = new THREE.BoxGeometry(1, 1, 1);
export const PANE = new THREE.PlaneGeometry(1, 1);
export const ICO = new THREE.IcosahedronGeometry(1, 0);
export const CONE = new THREE.ConeGeometry(0.5, 1, 5).translate(0, 0.5, 0);
export const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0);
export const WHEEL = new THREE.CylinderGeometry(0.5, 0.5, 1, 8).rotateZ(Math.PI / 2);

export const C = (h: string) => new THREE.Color(h);
export const TOY = ['#ff6b8b', '#ffd23f', '#3bceac', '#4cc9f0', '#ff8c42', '#9b7bff', '#7ae582', '#ff5d73', '#5aa9ff', '#f9a8d4'];
export const CHAR = C('#2b211d');
export const EMBER = C('#ff7a1a');

/** Couleur « jouet » abîmée par la chaleur : roussie, puis carbonisée, puis rougeoyante. */
export const heatColor = (out: THREE.Color, base: THREE.Color, c: number, k = 1) => {
  out.copy(base);
  out.lerp(C('#8a6a4a'), smooth(150, 320, c) * 0.35 * k);
  out.lerp(CHAR, smooth(300, 620, c) * k);
  out.lerp(C('#c8361a'), smooth(700, 1050, c) * 0.75);
  return out;
};
/** Lueur d'incandescence commune (émissive) : rouge sombre vers 600 °C, orange vif à 1 100 °C. */
export const glowOf = (c: number) => C('#ff3a10').multiplyScalar(smooth(560, 1100, c) * 0.55);

type Upd = (i: number, d: THREE.Object3D, col: THREE.Color) => void;

/** Mesh instancié recalculé à chaque frame à partir du temps (jamais de useFrame). */
export const Inst: React.FC<{
  count: number;
  geo: THREE.BufferGeometry;
  update: Upd;
  basic?: boolean;
  emissive?: THREE.Color;
  transparent?: boolean;
  opacity?: number;
  additive?: boolean;
  double?: boolean;
  fog?: boolean;
}> = ({count, geo, update, basic, emissive, transparent, opacity = 1, additive, double, fog = true}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({d: new THREE.Object3D(), c: new THREE.Color()}), []);
  useLayoutEffect(() => {
    const m = ref.current!;
    const {d, c} = tmp;
    for (let i = 0; i < count; i++) {
      d.position.set(0, 0, 0);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
      c.set('#ffffff');
      update(i, d, c);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor!.needsUpdate = true;
  });
  const common = {
    transparent: transparent || additive,
    opacity,
    side: double ? THREE.DoubleSide : THREE.FrontSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: !(transparent || additive),
    fog,
  };
  return (
    <instancedMesh ref={ref} args={[geo, undefined, count] as any} frustumCulled={false}>
      {basic ? <meshBasicMaterial {...common} /> : <meshStandardMaterial flatShading emissive={emissive ?? C('#000000')} {...common} />}
    </instancedMesh>
  );
};
const hide = (d: THREE.Object3D) => d.scale.set(0, 0, 0);

// ---------- Ciel, brume, lumière, soleil (tout vient de la température) ----------
const useDisc = () =>
  useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d')!;
    const gr = g.createRadialGradient(64, 64, 40, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(64, 64, 64, 0, Math.PI * 2);
    g.fill();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

export const HeatEnv: React.FC<{c: number; sunDir?: [number, number, number]; fogScale?: number; sunScale?: number; noSun?: boolean}> = ({
  c,
  sunDir = [0.35, 0.32, -1],
  fogScale = 1,
  sunScale = 1,
  noSun,
}) => {
  const glow = useGlowTexture();
  const disc = useDisc();
  const top = gradeColor(c, 'skyTop');
  const bottom = gradeColor(c, 'skyBottom');
  const fog = gradeColor(c, 'fog');
  const light = gradeColor(c, 'light');
  const sun = gradeColor(c, 'sun');
  const far = gradeNum(c, 'fogFar') * fogScale;
  const size = gradeNum(c, 'sunSize') * 2 * sunScale;
  const dir = new THREE.Vector3(...sunDir).normalize();
  const sp = dir.clone().multiplyScalar(420);
  return (
    <>
      <SkyDome top={top} bottom={bottom} />
      <fog attach="fog" args={[fog, far * 0.12, far]} />
      <hemisphereLight color={top.clone().lerp(C('#ffffff'), 0.35)} groundColor={C('#8a7060').lerp(C('#ff3a10'), smooth(500, 1100, c))} intensity={1.55} />
      <directionalLight color={light} intensity={1.7 - smooth(300, 800, c) * 0.6} position={[sp.x, Math.max(sp.y, 60), sp.z]} />
      <ambientLight color={C('#ff4a1a')} intensity={smooth(400, 1100, c) * 0.6} />
      {!noSun && (
        <group position={sp}>
          <sprite scale={[size, size, 1]}>
            <spriteMaterial map={disc} color={sun} fog={false} depthWrite={false} transparent />
          </sprite>
          <sprite scale={[size * 3.2, size * 3.2, 1]}>
            <spriteMaterial map={glow} color={sun} opacity={0.6} fog={false} depthWrite={false} transparent blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      )}
    </>
  );
};

// ---------- Personnage voxel qui marche ----------
export type Walker = {x: number; z: number; dir: number; speed: number; phase: number; shirt: string; pants: string; skin: string; hair: string; h: number};

export const makeWalkers = (n: number, seed: number, area: (r: () => number) => {x: number; z: number; dir: number}) => {
  const r = rng(seed);
  const skins = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
  const hairs = ['#2b1d14', '#5a3a22', '#d9a441', '#111111', '#8a3b1f'];
  return Array.from({length: n}, () => {
    const a = area(r);
    return {
      ...a, speed: 0.9 + r() * 0.6, phase: r() * 10,
      shirt: TOY[Math.floor(r() * TOY.length)], pants: ['#2f3e66', '#3a3a3a', '#6b4b2a', '#1f6f8b'][Math.floor(r() * 4)],
      skin: skins[Math.floor(r() * skins.length)], hair: hairs[Math.floor(r() * hairs.length)], h: 0.92 + r() * 0.16,
    } as Walker;
  });
};

/** Un passant en blocs. `pace` : 1 = marche normale, 0 = immobile ; `slump` penche le buste (chaleur). */
export const Person: React.FC<{w: Walker; t: number; pace?: number; slump?: number; c: number; pos: [number, number, number]; rot: number}> = ({
  w,
  t,
  pace = 1,
  slump = 0,
  c,
  pos,
  rot,
}) => {
  const sw = Math.sin((t * w.speed * 6.5 + w.phase) * pace) * 0.65 * pace;
  const bob = Math.abs(Math.cos((t * w.speed * 6.5 + w.phase) * pace)) * 0.06 * pace;
  const col = (h: string) => heatColor(new THREE.Color(), C(h), c, 0.6);
  const mat = (h: string) => <meshStandardMaterial color={col(h)} flatShading />;
  return (
    <group position={[pos[0], pos[1] + bob, pos[2]]} rotation={[0, rot, 0]} scale={w.h}>
      {[-1, 1].map((s) => (
        <group key={`l${s}`} position={[s * 0.13, 0.82, 0]} rotation={[s * sw, 0, 0]}>
          <mesh position={[0, -0.41, 0]} scale={[0.2, 0.82, 0.22]} geometry={CUBE}>
            {mat(w.pants)}
          </mesh>
        </group>
      ))}
      <group rotation={[slump, 0, 0]} position={[0, 0.82, 0]}>
        <mesh position={[0, 0.36, 0]} scale={[0.52, 0.72, 0.3]} geometry={CUBE}>
          {mat(w.shirt)}
        </mesh>
        {[-1, 1].map((s) => (
          <group key={`a${s}`} position={[s * 0.34, 0.68, 0]} rotation={[-s * sw * 0.8, 0, 0]}>
            <mesh position={[0, -0.32, 0]} scale={[0.16, 0.64, 0.18]} geometry={CUBE}>
              {mat(w.shirt)}
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.98, 0]} scale={[0.44, 0.44, 0.44]} geometry={CUBE}>
          {mat(w.skin)}
        </mesh>
        <mesh position={[0, 1.2, -0.02]} scale={[0.46, 0.12, 0.47]} geometry={CUBE}>
          {mat(w.hair)}
        </mesh>
      </group>
    </group>
  );
};

// ---------- Arbres : feuillage qui roussit puis disparaît, branches nues ----------
export type TreeT = {x: number; y?: number; z: number; s: number; tone: number};
export const Trees: React.FC<{list: TreeT[]; c: number}> = ({list, c}) => {
  const brown = smooth(90, 190, c);
  const bare = smooth(150, 240, c);
  const leaf = new THREE.Color();
  return (
    <>
      <Inst
        count={list.length}
        geo={CYL}
        update={(i, d, col) => {
          const tr = list[i];
          d.position.set(tr.x, tr.y ?? 0, tr.z);
          d.scale.set(0.35 * tr.s, 2.4 * tr.s, 0.35 * tr.s);
          heatColor(col, C('#7a4a2a'), c);
        }}
      />
      {/* branches (toujours là, visibles quand le feuillage tombe) */}
      <Inst
        count={list.length * 3}
        geo={CYL}
        update={(i, d, col) => {
          const tr = list[Math.floor(i / 3)];
          const k = i % 3;
          d.position.set(tr.x, (tr.y ?? 0) + 2.2 * tr.s, tr.z);
          d.rotation.set(0.75 * Math.cos(k * 2.1 + tr.tone * 6), k * 2.1 + tr.tone * 6, 0.75 * Math.sin(k * 2.1 + tr.tone * 6));
          d.scale.set(0.14 * tr.s, 1.6 * tr.s, 0.14 * tr.s);
          heatColor(col, C('#6a3e22'), c);
        }}
      />
      <Inst
        count={list.length}
        geo={ICO}
        update={(i, d, col) => {
          const tr = list[i];
          const s = tr.s * (1 - bare * (0.6 + tr.tone * 0.4));
          if (s < 0.05) return hide(d);
          d.position.set(tr.x, (tr.y ?? 0) + 3.3 * tr.s, tr.z);
          d.scale.set(1.5 * s, 1.35 * s, 1.5 * s);
          d.rotation.y = i * 1.7;
          leaf.setHSL(0.28 + tr.tone * 0.07, 0.62, 0.42 + tr.tone * 0.08);
          col.copy(leaf).lerp(C('#b08a3a'), brown).lerp(C('#5a3a1e'), bare);
        }}
      />
    </>
  );
};

// ---------- Lampadaires ----------
export const Lamps: React.FC<{list: [number, number][]; c: number; h?: number}> = ({list, c, h = 4.2}) => {
  const melt = smooth(620, 760, c); // l'aluminium fond : les mâts s'affaissent
  return (
    <>
      <Inst
        count={list.length}
        geo={CYL}
        update={(i, d, col) => {
          const [x, z] = list[i];
          d.position.set(x, 0, z);
          d.rotation.z = melt * (0.3 + (i % 3) * 0.25) * (i % 2 ? 1 : -1);
          d.scale.set(0.14, h * (1 - melt * 0.3), 0.14);
          heatColor(col, C('#2f3a4a'), c, 0.5);
        }}
      />
      <Inst
        count={list.length}
        geo={CUBE}
        update={(i, d, col) => {
          const [x, z] = list[i];
          const ang = melt * (0.3 + (i % 3) * 0.25) * (i % 2 ? 1 : -1);
          const L = h * (1 - melt * 0.3);
          d.position.set(x - Math.sin(ang) * L, Math.cos(ang) * L + 0.1, z);
          d.scale.set(0.5, 0.3, 0.5);
          col.set('#fff3c0');
        }}
      />
    </>
  );
};

// ---------- Immeubles jouets + fenêtres (s'allument puis éclatent) ----------
export type Bld = {x: number; z: number; w: number; d: number; h: number; col: THREE.Color; k: number};

export const makeBlocks = (seed: number, opts: {cols: number; rows: number; block: number; street: number; hMin: number; hVar: number; skip?: (x: number, z: number) => boolean}) => {
  const r = rng(seed);
  const out: Bld[] = [];
  const pitch = opts.block + opts.street;
  for (let i = 0; i < opts.cols; i++)
    for (let j = 0; j < opts.rows; j++) {
      const bx = (i - (opts.cols - 1) / 2) * pitch;
      const bz = (j - (opts.rows - 1) / 2) * pitch;
      // chaque îlot = 2×2 immeubles
      for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        const w = opts.block / 2 - 0.6 - r() * 1.2;
        const d = opts.block / 2 - 0.6 - r() * 1.2;
        const x = bx + (ox * opts.block) / 4;
        const z = bz + (oz * opts.block) / 4;
        if (opts.skip?.(x, z)) continue;
        out.push({x, z, w, d, h: opts.hMin + Math.pow(r(), 1.5) * opts.hVar, col: C(TOY[Math.floor(r() * TOY.length)]), k: r()});
      }
    }
  return out;
};

export const Buildings: React.FC<{list: Bld[]; c: number; sink?: number}> = ({list, c, sink = 0}) => {
  const glow = glowOf(c);
  return (
    <Inst
      count={list.length}
      geo={BOX}
      emissive={glow}
      update={(i, d, col) => {
        const b = list[i];
        const melt = sink * (0.4 + b.k * 0.6);
        d.position.set(b.x, -melt * b.h * 0.6, b.z);
        d.scale.set(b.w, b.h * (1 - melt * 0.35), b.d);
        heatColor(col, b.col, c, 0.55 + b.k * 0.45);
      }}
    />
  );
};

export type Win = {x: number; y: number; z: number; ry: number; igniteC: number; burstC: number; burstT: number; ph: number; b: Bld};

/** Fenêtres sur les quatre faces. Seuils propres à chaque fenêtre, instant d'éclatement calculé depuis la courbe. */
export const makeWindows = (list: Bld[], seed: number, floorH = 2.6) => {
  const r = rng(seed);
  const out: Win[] = [];
  for (const b of list) {
    const floors = Math.max(1, Math.floor((b.h - 1) / floorH));
    const faces: [number, number, number, number][] = [
      [0, b.d / 2 + 0.03, 0, b.w],
      [Math.PI, -b.d / 2 - 0.03, 0, b.w],
      [Math.PI / 2, b.w / 2 + 0.03, 1, b.d],
      [-Math.PI / 2, -b.w / 2 - 0.03, 1, b.d],
    ];
    for (const [ry, off, axis, span] of faces) {
      const cols = Math.max(1, Math.floor(span / 1.8));
      for (let f = 0; f < floors; f++)
        for (let k = 0; k < cols; k++) {
          const u = -span / 2 + ((k + 0.5) * span) / cols;
          const igniteC = 280 + r() * 170;
          const burstC = 442 + r() * 90;
          out.push({
            x: b.x + (axis === 0 ? u : off), y: 1.6 + f * floorH, z: b.z + (axis === 0 ? off : -u * Math.sign(Math.sin(ry) || 1)),
            ry, igniteC, burstC, burstT: timeAtTemp(burstC), ph: r() * 10, b,
          });
        }
    }
  }
  return out;
};

export const Windows: React.FC<{list: Win[]; c: number; t: number; sink?: number}> = ({list, c, t, sink = 0}) => {
  const day = C('#cfeaff');
  const lit = C('#ffb347');
  const hot = C('#ff5a1a');
  const hole = C('#2a0a04');
  return (
    <Inst
      count={list.length}
      geo={PANE}
      basic
      update={(i, d, col) => {
        const w = list[i];
        const melt = sink * (0.4 + w.b.k * 0.6);
        const topY = w.b.h * (1 - melt * 0.35) - melt * w.b.h * 0.6;
        const y = w.y - melt * w.b.h * 0.6;
        if (y + 0.7 > topY) return hide(d);
        d.position.set(w.x, y, w.z);
        d.rotation.y = w.ry;
        d.scale.set(1.0, 1.25, 1);
        const flick = 0.75 + 0.25 * Math.sin(t * 11 + w.ph * 7) * Math.sin(t * 6.3 + w.ph);
        if (c < w.igniteC) heatColor(col, day, c, 0.3);
        else if (c < w.burstC) col.copy(lit).multiplyScalar(flick);
        else col.copy(hole).lerp(hot, 0.45 * flick);
      }}
    />
  );
};

/** Éclats de verre : chaque fenêtre projette quelques éclats à l'instant où elle éclate. */
export const Shards: React.FC<{list: Win[]; t: number; per?: number}> = ({list, t, per = 5}) => {
  const r = useMemo(() => {
    const g = rng(91);
    return Array.from({length: list.length * per}, () => [g() - 0.5, g() * 0.8, 0.6 + g() * 2.2, g() * 6] as const);
  }, [list, per]);
  return (
    <Inst
      count={list.length * per}
      geo={CUBE}
      basic
      update={(i, d, col) => {
        const w = list[Math.floor(i / per)];
        const age = t - w.burstT;
        if (age < 0 || age > 1.6) return hide(d);
        const [ux, uy, out, spin] = r[i];
        const nx = Math.sin(w.ry);
        const nz = Math.cos(w.ry);
        d.position.set(
          w.x + nx * out * age + Math.cos(w.ry) * ux * 1.6 * age,
          w.y + (uy * 3 - 4.9 * age) * age,
          w.z + nz * out * age - Math.sin(w.ry) * ux * 1.6 * age,
        );
        d.rotation.set(spin + age * 9, spin * 2 + age * 7, 0);
        d.scale.set(0.22, 0.3, 0.02);
        col.set('#ffe2b8').lerp(C('#ff7a2a'), age / 1.6);
      }}
    />
  );
};

// ---------- Feu, fumée, braises, papiers ----------
export type Src = {x: number; y: number; z: number; s: number; atC: number};

/** Flammes low-poly : cônes qui vacillent (sinusoïdes de la frame). */
export const Flames: React.FC<{list: Src[]; c: number; t: number}> = ({list, c, t}) => (
  <>
    {[0, 1].map((layer) => (
      <Inst
        key={layer}
        count={list.length * 3}
        geo={CONE}
        basic
        update={(i, d, col) => {
          const f = list[Math.floor(i / 3)];
          const k = i % 3;
          const on = smooth(f.atC, f.atC + 60, c);
          if (on <= 0.01) return hide(d);
          const ph = i * 1.37;
          const fl = 1 + 0.28 * Math.sin(t * 13 + ph) + 0.18 * Math.sin(t * 7.1 + ph * 2);
          const s = f.s * on * (layer ? 0.55 : 1) * (k === 0 ? 1 : 0.7);
          d.position.set(f.x + (k - 1) * 0.45 * f.s, f.y, f.z + (k === 1 ? 0.3 : -0.2) * f.s);
          d.rotation.set(0.12 * Math.sin(t * 5 + ph), ph, 0.12 * Math.cos(t * 4.3 + ph));
          d.scale.set(s * 1.1, s * 2.4 * fl, s * 1.1);
          col.set(layer ? '#ffe36a' : '#ff5a14');
        }}
      />
    ))}
  </>
);

/** Colonnes de fumée : bouffées qui montent, grossissent et foncent (cycle déterministe). */
export const Smoke: React.FC<{list: Src[]; c: number; t: number; puffs?: number; height?: number; dark?: number; drift?: [number, number]; light?: boolean}> = ({
  list,
  c,
  t,
  puffs = 14,
  height = 40,
  dark = 1,
  drift = [0.25, 0.1],
  light = false,
}) => (
  <Inst
    count={list.length * puffs}
    geo={ICO}
    update={(i, d, col) => {
      const s = list[Math.floor(i / puffs)];
      const on = smooth(s.atC, s.atC + 80, c);
      if (on <= 0.01) return hide(d);
      const k = i % puffs;
      const age = (t * 0.09 + k / puffs + Math.floor(i / puffs) * 0.37) % 1;
      const y = s.y + age * height * s.s;
      d.position.set(s.x + drift[0] * age * height * s.s + Math.sin(k * 2.3 + t) * 0.6 * s.s, y, s.z + drift[1] * age * height * s.s);
      const sc = s.s * on * (0.8 + age * 2.6) * (age > 0.92 ? (1 - age) / 0.08 : 1);
      d.scale.set(sc, sc * 0.85, sc);
      d.rotation.set(k, k * 2, 0);
      if (light) col.set('#e9e4dc').lerp(C('#8a827a'), dark * age);
      else col.set('#5a524c').lerp(C('#141110'), dark * (0.5 + age * 0.5));
    }}
  />
);

/** Braises qui montent en spirale dans un volume ; densité pilotée par la température. */
export const Embers: React.FC<{n: number; c: number; t: number; box: [number, number, number, number, number, number]; startC?: number; size?: number}> = ({
  n,
  c,
  t,
  box,
  startC = 220,
  size = 0.12,
}) => {
  const seeds = useMemo(() => {
    const r = rng(53);
    return Array.from({length: n}, () => [r(), r(), r(), r()] as const);
  }, [n]);
  const dens = smooth(startC, startC + 250, c);
  const [x0, x1, y0, y1, z0, z1] = box;
  return (
    <Inst
      count={n}
      geo={CUBE}
      basic
      fog={false}
      update={(i, d, col) => {
        const [a, b, e, f] = seeds[i];
        if (a > dens) return hide(d);
        const age = (t * (0.08 + f * 0.1) + e) % 1;
        d.position.set(
          x0 + (x1 - x0) * b + Math.sin(t * 1.3 + i) * 1.2,
          y0 + (y1 - y0) * age,
          z0 + (z1 - z0) * ((e * 7.3) % 1) + Math.cos(t * 1.1 + i) * 1.2,
        );
        d.rotation.set(t * 3 + i, t * 2 + i, 0);
        const s = size * (1 - age) * (0.6 + f);
        d.scale.set(s, s, s);
        col.set('#ffd25a').lerp(EMBER, age);
      }}
    />
  );
};

/** Papiers qui volent, s'enflamment vers 230 °C puis se consument. */
export const Papers: React.FC<{n: number; c: number; t: number; box: [number, number, number, number, number, number]}> = ({n, c, t, box}) => {
  const seeds = useMemo(() => {
    const r = rng(61);
    return Array.from({length: n}, () => [r(), r(), r(), r(), 200 + r() * 120] as const);
  }, [n]);
  const [x0, x1, y0, y1, z0, z1] = box;
  return (
    <Inst
      count={n}
      geo={PANE}
      basic
      double
      update={(i, d, col) => {
        const [a, b, e, f, burnC] = seeds[i];
        const gone = smooth(burnC + 40, burnC + 110, c);
        if (gone > 0.98) return hide(d);
        const age = (t * (0.05 + f * 0.05) + e) % 1;
        d.position.set(x0 + (x1 - x0) * ((a + age * 0.4) % 1), y0 + (y1 - y0) * ((b + age) % 1), z0 + (z1 - z0) * e);
        d.rotation.set(t * (1 + f * 2) + i, t * 1.5 + i * 2, t * 0.7);
        const s = 0.55 * (1 - gone);
        d.scale.set(s, s * 1.3, 1);
        col.set('#f6f1e4').lerp(C('#ff8a2a'), smooth(burnC, burnC + 40, c)).lerp(C('#2a1a12'), gone);
      }}
    />
  );
};

// ---------- Sol de lave : bruit émissif qui pulse ----------
const LAVA_VS = `varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const LAVA_FS = `uniform float time; uniform float heat; varying vec2 vW;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int k=0;k<5;k++){ v += a*n(p); p *= 2.03; a *= 0.5; } return v; }
void main(){
  vec2 p = vW * 0.06;
  float flow = fbm(p + vec2(time*0.05, -time*0.03) + fbm(p*1.7 - time*0.04));
  float cracks = smoothstep(0.42, 0.6, flow);
  float pulse = 0.82 + 0.18*sin(time*2.1 + flow*9.0);
  vec3 crust = vec3(0.09, 0.03, 0.02);
  vec3 hot = mix(vec3(0.75, 0.08, 0.01), vec3(1.0, 0.62, 0.12), smoothstep(0.55, 0.85, flow));
  vec3 col = mix(crust, hot * pulse * 1.6, cracks * heat);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export const Lava: React.FC<{t: number; heat: number; size?: number; y?: number}> = ({t, heat, size = 800, y = 0}) => {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({uniforms: {time: {value: 0}, heat: {value: 0}}, vertexShader: LAVA_VS, fragmentShader: LAVA_FS}),
    [],
  );
  mat.uniforms.time.value = t;
  mat.uniforms.heat.value = heat;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} material={mat}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
};

// ---------- Voitures ----------
export type Car = {x: number; z: number; ry: number; col: THREE.Color; v: number; lane: number};
export const Cars: React.FC<{list: Car[]; c: number; pos: (car: Car, i: number) => [number, number]}> = ({list, c, pos}) => (
  <>
    <Inst
      count={list.length}
      geo={BOX}
      update={(i, d, col) => {
        const car = list[i];
        const [x, z] = pos(car, i);
        d.position.set(x, 0.35, z);
        d.rotation.y = car.ry;
        d.scale.set(1.9, 0.8, 4.2);
        heatColor(col, car.col, c, 0.7);
      }}
    />
    <Inst
      count={list.length}
      geo={BOX}
      update={(i, d, col) => {
        const car = list[i];
        const [x, z] = pos(car, i);
        d.position.set(x, 1.15, z + 0.25 * Math.cos(car.ry));
        d.rotation.y = car.ry;
        d.scale.set(1.7, 0.65, 2.2);
        heatColor(col, C('#bfe2ff'), c, 0.6);
      }}
    />
    <Inst
      count={list.length * 4}
      geo={WHEEL}
      update={(i, d, col) => {
        const car = list[Math.floor(i / 4)];
        const [x, z] = pos(car, Math.floor(i / 4));
        const k = i % 4;
        const lx = k % 2 ? 0.95 : -0.95;
        const lz = k < 2 ? 1.35 : -1.35;
        d.position.set(x + lx * Math.cos(car.ry) + lz * Math.sin(car.ry), 0.38, z - lx * Math.sin(car.ry) + lz * Math.cos(car.ry));
        d.rotation.y = car.ry;
        d.scale.set(0.3, 0.76, 0.76);
        col.set('#1c1c1c');
      }}
    />
  </>
);

export const useGlow = useGlowTexture;
