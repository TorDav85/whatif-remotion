import React from 'react';
import {Ball, Block, Cyl, Mat, PAL} from '../kit';
import {Rod, type ColorProps, type LightProps} from './primitives';

export const CafeTerrace: React.FC<ColorProps & {umbrella?: boolean}> = ({color = '#bb704f', umbrella = true}) => (
  <group>
    <Cyl p={[0, 0.74, 0]} rad={0.52} h={0.07} c="#d7bd8e" />
    <Cyl p={[0, 0.37, 0]} rad={0.035} h={0.74} c={PAL.iron} />
    <Cyl p={[0, 0.035, 0]} rad={0.27} h={0.07} c={PAL.iron} />
    {[-1, 1].map((s) => <group key={s} position={[s * 0.85, 0, 0]} rotation={[0, s * Math.PI / 2, 0]}>
      <Block p={[0, 0.45, 0]} s={[0.43, 0.06, 0.43]} c={color} />
      <Block p={[0, 0.75, 0.21]} s={[0.43, 0.35, 0.055]} c={color} />
      {[-0.16, 0.16].flatMap((x) => [-0.16, 0.16].map((z) => <Block key={`${x}:${z}`} p={[x, 0.22, z]} s={[0.035, 0.44, 0.035]} c={PAL.iron} />))}
    </group>)}
    {umbrella && <group>
      <Cyl p={[0, 1.32, 0]} rad={0.026} h={2.64} c="#ad976f" />
      <mesh position={[0, 2.48, 0]}><coneGeometry args={[1.27, 0.44, 8, 1, true]} /><meshStandardMaterial color={color} side={2} flatShading /></mesh>
      <Cyl p={[0, 2.27, 0]} rad={1.25} h={0.1} c={color} seg={8} />
      <Ball p={[0, 2.74, 0]} rad={0.06} c="#ad976f" />
    </group>}
    <Cyl p={[0.2, 0.84, 0]} rad={0.055} h={0.12} c="#f2e8d2" />
  </group>
);

export const MarketStall: React.FC<ColorProps & {produce?: string}> = ({color = '#66866a', produce = '#cb7855'}) => (
  <group>
    {[-1.25, 1.25].flatMap((x) => [-0.64, 0.64].map((z) => <Cyl key={`${x}:${z}`} p={[x, 1.1, z]} rad={0.035} h={2.2} c="#927859" />))}
    <Block p={[0, 2.28, 0]} s={[2.85, 0.12, 1.65]} c="#e3d9bb" />
    {Array.from({length: 7}, (_, i) => <group key={i}><Block p={[-1.2 + i * 0.4, 2.35, 0]} s={[0.2, 0.035, 1.68]} c={color} /><Block p={[-1.2 + i * 0.4, 2.17, -0.85]} s={[0.2, 0.28, 0.035]} c={color} /></group>)}
    <Block p={[0, 0.83, 0]} s={[2.65, 0.12, 1.3]} c="#b49368" />
    <Block p={[0, 0.42, 0.1]} s={[2.45, 0.8, 1]} c={color} />
    {[-0.8, 0, 0.8].map((x) => <group key={x}>
      <Block p={[x, 0.94, 0]} s={[0.69, 0.16, 0.85]} c="#c5a477" />
      {Array.from({length: 6}, (_, i) => <Ball key={i} p={[x - 0.2 + (i % 3) * 0.2, 1.07, -0.2 + Math.floor(i / 3) * 0.35]} rad={0.11} c={x === 0 ? '#e1bc50' : produce} detail={0} />)}
    </group>)}
  </group>
);

export const Kiosk: React.FC<ColorProps & LightProps> = ({color = '#3f6459', lit = 0}) => (
  <group>
    <Block p={[0, 0.08, 0]} s={[2.45, 0.16, 2.05]} c="#aaa28b" />
    <Block p={[0, 1.18, 0]} s={[2.1, 2.2, 1.7]} c={color} />
    <Block p={[0, 1.55, -0.87]} s={[1.75, 0.95, 0.04]} c="#d5ba82" e="#efc179" ei={lit} />
    {[-0.57, 0, 0.57].map((x) => <group key={x}><Block p={[x, 1.5, -0.905]} s={[0.42, 0.68, 0.025]} c={x === 0 ? '#d58d58' : '#74908e'} />{[1.33, 1.46, 1.59].map((y) => <Block key={y} p={[x, y, -0.922]} s={[0.28, 0.025, 0.01]} c="#e8e0c4" />)}</group>)}
    <Block p={[0, 1.02, -1.02]} s={[2.32, 0.12, 0.42]} c="#7e826b" />
    <Block p={[0, 2.24, -0.89]} s={[1.75, 0.21, 0.03]} c="#e2d0a6" />
    <mesh position={[0, 2.55, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.76, 0.58, 4]} /><Mat color={color} /></mesh>
    <Ball p={[0, 2.9, 0]} rad={0.09} c="#c8b481" />
  </group>
);

export type CraneProps = ColorProps & {height?: number; angle?: number; hookDrop?: number};
export const ConstructionCrane: React.FC<CraneProps> = ({color = '#d5ae51', height = 12, angle = 0, hookDrop = 3.5}) => (
  <group>
    <Block p={[0, 0.16, 0]} s={[2.2, 0.32, 2.2]} c="#a49e8f" />
    {[-0.37, 0.37].flatMap((x) => [-0.37, 0.37].map((z) => <Block key={`${x}:${z}`} p={[x, height / 2, z]} s={[0.09, height, 0.09]} c={color} />))}
    {Array.from({length: Math.max(2, Math.ceil(height / 1.5))}, (_, i) => {
      const y = i * height / Math.max(2, Math.ceil(height / 1.5));
      const step = height / Math.max(2, Math.ceil(height / 1.5));
      return <group key={i}>{[-0.37, 0.37].map((z) => <Rod key={z} a={[-0.37, y, z]} b={[0.37, y + step, z]} radius={0.035} color={color} />)}<Block p={[0, y, 0]} s={[0.88, 0.08, 0.88]} c={color} /></group>;
    })}
    <group position={[0, height, 0]} rotation={[0, angle, 0]}>
      <Block p={[0, 0.35, -2]} s={[0.7, 0.45, 9]} c={color} />
      {Array.from({length: 9}, (_, i) => <Rod key={i} a={[-0.35, 0.15, 2.5 - i]} b={[0.35, 0.65, 1.5 - i]} radius={0.035} color="#e7ca76" />)}
      <Block p={[0, 0.6, 1.7]} s={[1.1, 0.6, 1.3]} c="#858d82" />
      <Block p={[0.62, -0.25, -0.6]} s={[0.8, 1.1, 0.9]} c={color} />
      <Block p={[0.64, -0.18, -1.07]} s={[0.6, 0.67, 0.035]} c="#82a7b2" />
      <Rod a={[0, 0.15, -5.8]} b={[0, -Math.max(0.2, Math.min(height - 0.5, hookDrop)), -5.8]} radius={0.014} color="#354b4a" />
      <Block p={[0, -Math.max(0.2, Math.min(height - 0.5, hookDrop)), -5.8]} s={[0.18, 0.25, 0.16]} c="#334841" />
    </group>
  </group>
);

export const TrafficCone: React.FC<ColorProps> = ({color = '#d68a50'}) => (
  <group>
    <Block p={[0, 0.035, 0]} s={[0.48, 0.07, 0.48]} c="#3d4b45" />
    <mesh position={[0, 0.39, 0]}><coneGeometry args={[0.2, 0.68, 8]} /><Mat color={color} /></mesh>
    <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.069, 0.107, 0.13, 8]} /><Mat color="#eee5cc" /></mesh>
  </group>
);

export const FireHydrant: React.FC<ColorProps> = ({color = '#b65b47'}) => (
  <group>
    <Cyl p={[0, 0.07, 0]} rad={0.23} h={0.14} c="#807d6b" />
    <Cyl p={[0, 0.43, 0]} rad={0.13} h={0.72} c={color} seg={10} />
    <Ball p={[0, 0.79, 0]} rad={0.14} c={color} s={[1, 0.6, 1]} />
    <Cyl p={[0, 0.86, 0]} rad={0.045} h={0.08} c="#c7af82" seg={6} />
    <Cyl p={[0, 0.54, 0]} rad={0.08} h={0.48} c={color} r={[0, 0, Math.PI / 2]} />
    {[-0.25, 0.25].map((x) => <Cyl key={x} p={[x, 0.54, 0]} rad={0.1} h={0.06} c="#d0bd94" r={[0, 0, Math.PI / 2]} seg={6} />)}
    <Cyl p={[0, 0.39, -0.16]} rad={0.1} h={0.13} c="#d0bd94" r={[Math.PI / 2, 0, 0]} seg={6} />
  </group>
);
