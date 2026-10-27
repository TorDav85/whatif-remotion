import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig} from '../../scenes/common';
import {rng, smooth} from '../../world';
import {FPS, tempAt} from '../curve';
import {Buildings, C, Embers, Flames, HeatEnv, Papers, Smoke, Src, TreeT, Trees, Windows, heatColor, makeBlocks, makeWindows} from '../kit';
import {Fountain} from './Plaza';
import {Lawn} from './Park';

/** Grille urbaine autour du parc : partagée avec la vue zénithale (séquence 7). */
export const useCityGrid = () =>
  useMemo(() => {
    const list = makeBlocks(13, {cols: 9, rows: 11, block: 22, street: 10, hMin: 7, hVar: 34, skip: (x, z) => Math.hypot(x, z) < 34});
    const wins = makeWindows(list, 14, 3);
    const r = rng(15);
    // incendies sur une partie des toits, chacun à son seuil
    const fires: Src[] = list
      .filter(() => r() < 0.28)
      .map((b) => ({x: b.x + (r() - 0.5) * b.w * 0.5, y: b.h, z: b.z + (r() - 0.5) * b.d * 0.5, s: 2.2 + r() * 2, atC: 290 + r() * 160}));
    return {list, wins, fires};
  }, []);

export const Drone: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const c = tempAt(t);
  const k = smooth(0, 1, (t - from) / 10.6);
  const {list, wins, fires} = useCityGrid();
  // panaches devant le drone seulement (sinon il vole dans la fumée)
  const plumes = useMemo(() => fires.filter((f) => f.z < -10).map((f) => ({...f, s: 1.3})), [fires]);
  const trees = useMemo<TreeT[]>(() => {
    const r = rng(81);
    return Array.from({length: 26}, (_, i) => {
      const a = (i / 26) * Math.PI * 2;
      const rr = 18 + r() * 10;
      return {x: Math.cos(a) * rr, z: Math.sin(a) * rr, s: 1 + r() * 0.5, tone: r()};
    });
  }, []);

  // le drone s'élève depuis le parc et bascule progressivement vers le bas
  const cy = 5 + k * 78;
  const cz = 30 - k * 4;
  const park = C('#cdb27a').lerp(C('#2a1d14'), smooth(250, 330, c));
  const street = heatColor(new THREE.Color(), C('#4e5157'), c, 0.4);

  return (
    <>
      <CameraRig position={[2 + Math.sin(t * 0.3) * 1.5, cy, cz]} target={[0, cy * 0.45 - 4, cz - 70 - k * 20]} fov={62} />
      <HeatEnv c={c} sunDir={[0.3, 0.3, -1]} fogScale={2.2} sunScale={1.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color={street} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[33, 32]} />
        <meshStandardMaterial color={park} />
      </mesh>
      <Lawn c={c} r0={12} r1={32} n={1500} seed={29} />
      <Fountain c={c} t={t} />
      <Trees list={trees} c={c} />
      <Buildings list={list} c={c} />
      <Windows list={wins} c={c} t={t} />
      <Flames list={fires} c={c} t={t} />
      <Smoke list={plumes} c={c} t={t} puffs={12} height={30} drift={[0.6, 0.1]} />
      {/* papiers et braises autour du drone */}
      <Papers n={60} c={c} t={t} box={[-25, 25, cy - 14, cy + 6, cz - 50, cz - 6]} />
      <Embers n={400} c={c} t={t} box={[-40, 40, 0, cy + 10, cz - 90, cz - 4]} startC={220} size={0.3} />
    </>
  );
};
