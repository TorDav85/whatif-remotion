import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig} from '../../../shared/three/common';
import {rng, smooth} from '../../../core/animation';
import {FPS, tempAt} from '../curve';
import {BOX, Buildings, C, CONE, CUBE, Embers, HeatEnv, Inst, Lamps, Papers, TreeT, Trees, Windows, heatColor} from '../kit';
import {Fountain, usePlazaCity} from './Plaza';

/** Pelouse : touffes qui jaunissent, deviennent de la paille, puis noircissent. */
export const Lawn: React.FC<{c: number; n?: number; r0?: number; r1?: number; seed?: number}> = ({c, n = 2600, r0 = 12, r1 = 30, seed = 23}) => {
  const tufts = useMemo(() => {
    const r = rng(seed);
    return Array.from({length: n}, () => {
      const a = r() * Math.PI * 2;
      const rr = r0 + Math.sqrt(r()) * (r1 - r0);
      return {x: Math.cos(a) * rr, z: Math.sin(a) * rr, s: 0.5 + r() * 0.7, tone: r()};
    });
  }, [n, r0, r1, seed]);
  const g = new THREE.Color();
  return (
    <Inst
      count={tufts.length}
      geo={CONE}
      update={(i, d, col) => {
        const tf = tufts[i];
        const wilt = smooth(130, 200, c);
        d.position.set(tf.x, 0, tf.z);
        d.rotation.set(wilt * 0.5 * Math.sin(i), i, wilt * 0.5 * Math.cos(i));
        d.scale.set(0.3 * tf.s, tf.s * (1 - wilt * 0.45) * (1 - smooth(260, 340, c) * 0.7), 0.3 * tf.s);
        g.setHSL(0.27 + tf.tone * 0.05, 0.6, 0.38 + tf.tone * 0.1);
        col.copy(g).lerp(C('#a8913f'), smooth(70, 150, c)).lerp(C('#e2cf86'), smooth(150, 200, c)).lerp(C('#2a1d14'), smooth(250, 330, c));
      }}
    />
  );
};

/** Deux bassins rectangulaires qui s'assèchent ; fond craquelé. */
const Basins: React.FC<{c: number; t: number}> = ({c, t}) => {
  const dry = smooth(100, 172, c);
  const boil = smooth(95, 105, c) * (1 - dry);
  const cracks = useMemo(() => {
    const r = rng(71);
    return Array.from({length: 120}, () => [r() - 0.5, r() - 0.5, r() * Math.PI, 0.6 + r() * 1.6, r() < 0.5 ? -1 : 1] as const);
  }, []);
  const rim = heatColor(new THREE.Color(), C('#e7dcc8'), c, 0.4);
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 6.5, 0, 26]}>
          {/* margelle */}
          <mesh position={[0, 0, 0]} scale={[5.4, 0.55, 18.4]} geometry={BOX}>
            <meshStandardMaterial color={rim} flatShading />
          </mesh>
          {/* fond / eau */}
          <mesh position={[0, 0.56 - dry * 0.45, 0]} scale={[4.6, 0.02, 17.6]} geometry={BOX}>
            <meshStandardMaterial color={C('#3fb0f0').lerp(C('#cdb487'), dry)} roughness={0.15 + dry * 0.8} metalness={0.1 * (1 - dry)} />
          </mesh>
        </group>
      ))}
      <Inst
        count={cracks.length}
        geo={CUBE}
        update={(i, d, col) => {
          if (dry < 0.6) return d.scale.set(0, 0, 0);
          const [u, v, a, l, s] = cracks[i];
          d.position.set(s * 6.5 + u * 4.2, 0.13, 26 + v * 17);
          d.rotation.y = a;
          d.scale.set(0.06, 0.02, l * smooth(0.6, 1, dry));
          col.set('#6a4a2a');
        }}
      />
      {/* vapeur au-dessus de l'eau qui bout */}
      <Inst
        count={70}
        geo={CUBE}
        transparent
        opacity={0.5}
        update={(i, d, col) => {
          if (boil < 0.02) return d.scale.set(0, 0, 0);
          const age = (t * 0.35 + i * 0.137) % 1;
          const s = (i % 2 ? 1 : -1) * 6.5;
          d.position.set(s + (((i * 0.71) % 1) - 0.5) * 4, 0.6 + age * 4, 26 + (((i * 0.37) % 1) - 0.5) * 16);
          const sc = boil * (0.3 + age * 0.9);
          d.scale.set(sc, sc, sc);
          col.set('#ffffff');
        }}
      />
    </>
  );
};

export const Park: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const c = tempAt(t);
  const k = (t - from) / 10.6;
  const {list, wins} = usePlazaCity();

  const trees = useMemo<TreeT[]>(() => {
    const r = rng(8);
    const out: TreeT[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.464;
      out.push({x: Math.cos(a) * 19, z: Math.sin(a) * 19, s: 1.1 + r() * 0.5, tone: r()});
    }
    for (let i = 0; i < 10; i++) out.push({x: (i % 2 ? 1 : -1) * 11.5, z: 18 + Math.floor(i / 2) * 4.2, s: 0.9 + r() * 0.3, tone: r()});
    return out;
  }, []);
  const lamps = useMemo<[number, number][]>(() => Array.from({length: 10}, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return [Math.cos(a) * 13, Math.sin(a) * 13];
  }), []);

  const ground = heatColor(new THREE.Color(), C('#efe3cf'), c, 0.5);
  const soil = C('#6cc24a').lerp(C('#a8913f'), smooth(60, 150, c)).lerp(C('#cdb27a'), smooth(150, 200, c)).lerp(C('#3a2a1e'), smooth(250, 330, c));

  return (
    <>
      {/* travelling lent le long des bassins, vers la fontaine */}
      <CameraRig position={[-2.5 + k * 1.5, 3.4 - k * 0.6, 44 - k * 13]} target={[0.5, 2.6, 0]} fov={58} />
      <HeatEnv c={c} sunDir={[0.25, 0.28, -1]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={soil} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[12, 24]} />
        <meshStandardMaterial color={ground} />
      </mesh>
      <mesh position={[0, 0.012, 30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 40]} />
        <meshStandardMaterial color={ground} />
      </mesh>
      <Lawn c={c} r0={12.5} r1={30} />
      <Basins c={c} t={t} />
      <Fountain c={c} t={t} />
      <Buildings list={list} c={c} />
      <Windows list={wins} c={c} t={t} />
      <Trees list={trees} c={c} />
      <Lamps list={lamps} c={c} />
      <Inst
        count={8}
        geo={CUBE}
        update={(i, d, col) => {
          const a = (i / 8) * Math.PI * 2 + 0.4;
          d.position.set(Math.cos(a) * 15.5, 0.45, Math.sin(a) * 15.5);
          d.rotation.y = -a;
          d.scale.set(0.6, 0.18, 2.4);
          heatColor(col, C('#c0703a'), c);
        }}
      />
      {/* papiers qui volent puis s'enflamment, premières braises */}
      <Papers n={40} c={c} t={t} box={[-12, 12, 0.3, 9, 0, 24]} />
      <Embers n={160} c={c} t={t} box={[-16, 16, 0, 14, 4, 40]} startC={200} />
    </>
  );
};
