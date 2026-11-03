import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig} from '../../../shared/three/common';
import {rng, smooth} from '../../../core/animation';
import {FPS, tempAt} from '../curve';
import {Bld, Buildings, C, CONE, CUBE, CYL, HeatEnv, Inst, Lamps, Person, TOY, TreeT, Trees, Windows, heatColor, makeWalkers, makeWindows} from '../kit';

/** Place avec fontaine, autour : immeubles jouets. Partagé avec le parc (séquence 3). */
export const usePlazaCity = (seed = 4) =>
  useMemo(() => {
    const r = rng(seed);
    const list: Bld[] = [];
    // trois rangées d'immeubles bordent la place ; le côté +z s'ouvre sur le parc et ses bassins
    for (const side of [0, 2, 3]) {
      for (let k = -3; k <= 3; k++) {
        const w = 6 + r() * 3;
        const d = 7 + r() * 3;
        const along = k * 9.5;
        const off = 31 + r() * 2;
        const [x, z] = side === 0 ? [along, -off] : side === 1 ? [along, off] : side === 2 ? [-off, along] : [off, along];
        list.push({x, z, w: side < 2 ? w : d, d: side < 2 ? d : w, h: 8 + r() * 14, col: C(TOY[Math.floor(r() * TOY.length)]), k: r()});
      }
    }
    return {list, wins: makeWindows(list, seed + 1)};
  }, [seed]);

export const Fountain: React.FC<{c: number; t: number}> = ({c, t}) => {
  const dry = smooth(110, 172, c); // l'eau s'évapore
  const boil = smooth(92, 104, c) * (1 - dry);
  const jet = 1 - smooth(60, 120, c);
  const level = 0.62 - dry * 0.45;
  const stone = heatColor(new THREE.Color(), C('#e6ddcf'), c, 0.4);
  const drops = useMemo(() => {
    const r = rng(19);
    return Array.from({length: 60}, () => [r() * Math.PI * 2, 0.6 + r() * 0.5, r()] as const);
  }, []);
  return (
    <group>
      <mesh scale={[8.4, 0.75, 8.4]} geometry={CYL}>
        <meshStandardMaterial color={stone} flatShading />
      </mesh>
      {/* l'eau (ou le fond sec et craquelé) */}
      <mesh position={[0, level, 0]} scale={[7.7, 0.1, 7.7]} geometry={CYL}>
        <meshStandardMaterial color={C('#3fb6ff').lerp(C('#c9b48a'), dry)} roughness={0.2 + dry * 0.7} flatShading />
      </mesh>
      <mesh scale={[1.1, 2.4, 1.1]} geometry={CYL}>
        <meshStandardMaterial color={stone} flatShading />
      </mesh>
      <mesh position={[0, 2.4, 0]} scale={[3.4, 0.35, 3.4]} geometry={CYL}>
        <meshStandardMaterial color={stone} flatShading />
      </mesh>
      {/* jet central + gerbe */}
      {jet > 0.02 && (
        <mesh position={[0, 2.7, 0]} scale={[0.45, 2.6 * jet * (1 + 0.05 * Math.sin(t * 9)), 0.45]} geometry={CONE}>
          <meshStandardMaterial color="#bfe9ff" transparent opacity={0.75} flatShading />
        </mesh>
      )}
      <Inst
        count={drops.length}
        geo={CUBE}
        basic
        update={(i, d, col) => {
          const [a, v, ph] = drops[i];
          const age = (t * 0.9 + ph) % 1;
          if (jet < 0.05) return d.scale.set(0, 0, 0);
          const rr = 0.6 + age * 3.1 * v;
          d.position.set(Math.cos(a) * rr, 5.2 * jet + (2.2 * age - 6 * age * age) * jet, Math.sin(a) * rr);
          const s = 0.09;
          d.scale.set(s, s * 1.8, s);
          col.set('#9fdcff');
        }}
      />
      {/* ébullition : bulles à la surface */}
      <Inst
        count={60}
        geo={CUBE}
        update={(i, d, col) => {
          if (boil < 0.02) return d.scale.set(0, 0, 0);
          const a = i * 2.39;
          const rr = 1.4 + ((i * 0.618) % 1) * 5.8;
          const ph = (t * 2.5 + i * 0.37) % 1;
          d.position.set(Math.cos(a) * rr, level + 0.08 + ph * 0.2, Math.sin(a) * rr);
          const s = 0.25 * boil * Math.sin(ph * Math.PI);
          d.scale.set(s, s, s);
          col.set('#e8f8ff');
        }}
      />
    </group>
  );
};

const PATHS = 4;

export const Plaza: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const c = tempAt(t);
  const {list, wins} = usePlazaCity();

  const trees = useMemo<TreeT[]>(() => {
    const r = rng(8);
    const out: TreeT[] = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + 0.464; // un vide dans l'anneau là où passe la caméra
      out.push({x: Math.cos(a) * 19, z: Math.sin(a) * 19, s: 1.1 + r() * 0.5, tone: r()});
    }
    return out;
  }, []);
  const lamps = useMemo<[number, number][]>(() => Array.from({length: 10}, (_, k) => {
    const a = (k / 10) * Math.PI * 2;
    return [Math.cos(a) * 13, Math.sin(a) * 13];
  }), []);
  // passants : quatre allées qui traversent la place
  const walkers = useMemo(
    () =>
      makeWalkers(22, 3, (r) => {
        const p = Math.floor(r() * PATHS);
        return {x: [-9, -4, 9.5, 14][p] + (r() - 0.5) * 1.2, z: r() * 60 - 30, dir: p % 2 ? 1 : -1};
      }),
    [],
  );
  // le groupe que la caméra suit
  const group = useMemo(() => makeWalkers(3, 12, (r) => ({x: 4.5 + (r() - 0.5) * 1.6, z: 0, dir: -1})), []);
  const pace = 1 - smooth(40, 70, c) * 0.45;
  const slump = smooth(45, 70, c) * 0.25;
  const gz = 15 - t * 1.15 * (1 - smooth(40, 70, c) * 0.3);

  const ground = heatColor(new THREE.Color(), C('#efe3cf'), c, 0.4);
  const grass = C('#6cc24a').lerp(C('#b9a55a'), smooth(45, 150, c));

  return (
    <>
      <CameraRig position={[7.6, 2.3 + Math.sin(t * 4.2) * 0.025, gz + 10.5]} target={[1, 2.6, gz - 16]} fov={58} />
      <HeatEnv c={c} sunDir={[-0.55, 0.35, -1]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={grass} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[58, 58]} />
        <meshStandardMaterial color={ground} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.5, 11, 24]} />
        <meshStandardMaterial color={C('#d6c3a2')} />
      </mesh>
      <Fountain c={c} t={t} />
      <Buildings list={list} c={c} />
      <Windows list={wins} c={c} t={t} />
      <Trees list={trees} c={c} />
      <Lamps list={lamps} c={c} />
      {/* bancs */}
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
      {walkers.map((w, i) => {
        const z = ((w.z + w.dir * t * 1.3 * w.speed * pace + 90) % 60) - 30;
        return <Person key={i} w={w} t={t} pace={pace} slump={slump} c={c} pos={[w.x, 0, z]} rot={w.dir > 0 ? 0 : Math.PI} />;
      })}
      {group.map((w, i) => (
        <Person key={`g${i}`} w={w} t={t} pace={pace} slump={slump} c={c} pos={[w.x + i * 0.2, 0, gz - i * 1.4]} rot={Math.PI} />
      ))}
    </>
  );
};
