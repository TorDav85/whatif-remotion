import React from 'react';
import {Ball, Block, Cyl, Mat, PAL} from '../kit';
import type {ColorProps, LightProps} from './primitives';

export type BenchProps = ColorProps & {width?: number; backrest?: boolean};
export const Bench: React.FC<BenchProps> = ({color = '#8b6041', width = 1.9, backrest = true}) => (
  <group>
    {[-1, 1].map((side) => <group key={side}>
      <Block p={[side * width * 0.36, 0.22, 0]} s={[0.11, 0.44, 0.58]} c={PAL.iron} metal />
      <Block p={[side * width * 0.36, 0.55, -0.04]} s={[0.07, 0.05, 0.68]} c={PAL.iron} />
      {backrest && <Block p={[side * width * 0.36, 0.65, 0.23]} s={[0.07, 0.6, 0.07]} c={PAL.iron} />}
    </group>)}
    {[-0.21, -0.07, 0.07, 0.21].map((z) => <Block key={z} p={[0, 0.45, z]} s={[width, 0.06, 0.12]} c={color} />)}
    {backrest && [0.67, 0.85].map((y) => <Block key={y} p={[0, y, 0.26]} s={[width, 0.14, 0.055]} c={color} />)}
  </group>
);

export const StreetLamp: React.FC<ColorProps & LightProps & {height?: number}> = ({color = '#314844', lit = 0, height = 4.1}) => (
  <group>
    <Cyl p={[0, 0.09, 0]} rad={0.22} h={0.18} c={color} />
    <Cyl p={[0, height * 0.42, 0]} rad={0.06} h={height * 0.84} c={color} />
    <Cyl p={[0, height * 0.83, 0]} rad={0.14} h={0.12} c={color} />
    <Block p={[0, height - 0.38, 0]} s={[0.33, 0.48, 0.33]} c="#f6d890" e="#ffc466" ei={Math.max(0, lit) * 1.6} />
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Block key={`${x}:${z}`} p={[x * 0.17, height - 0.38, z * 0.17]} s={[0.035, 0.52, 0.035]} c={color} />))}
    <mesh position={[0, height - 0.08, 0]}><coneGeometry args={[0.34, 0.23, 4]} /><Mat color={color} /></mesh>
    <Ball p={[0, height + 0.08, 0]} rad={0.055} c={color} />
    {lit > 0 && <pointLight position={[0, height - 0.38, 0]} color="#ffc477" intensity={lit * 2} distance={7} decay={2} />}
  </group>
);

export const Bollard: React.FC<ColorProps & {height?: number}> = ({color = '#354b48', height = 0.95}) => (
  <group><Cyl p={[0, height / 2, 0]} rad={0.065} h={height} c={color} /><Cyl p={[0, 0.05, 0]} rad={0.13} h={0.1} c={color} /><Ball p={[0, height, 0]} rad={0.085} c="#dfd8bc" /></group>
);

export const TrashBin: React.FC<ColorProps> = ({color = '#406959'}) => (
  <group>
    <Cyl p={[0, 0.46, 0]} rad={0.26} h={0.83} c={color} seg={12} />
    <Cyl p={[0, 0.89, 0]} rad={0.29} h={0.08} c={PAL.iron} />
    <Block p={[0, 0.94, 0]} s={[0.42, 0.035, 0.2]} c={color} />
    {Array.from({length: 10}, (_, i) => {const a = i * Math.PI / 5; return <Block key={i} p={[Math.sin(a) * 0.26, 0.47, Math.cos(a) * 0.26]} s={[0.025, 0.74, 0.025]} c="#80a18a" />;})}
    <Block p={[0, 0.54, -0.268]} s={[0.16, 0.19, 0.015]} c="#d4d7be" />
  </group>
);

export const BusShelter: React.FC<ColorProps> = ({color = '#3b5754'}) => (
  <group>
    <Block p={[0, 0.04, 0]} s={[3.5, 0.08, 1.65]} c="#a8a49a" />
    {[-1.55, 1.55].map((x) => <Block key={x} p={[x, 1.2, 0.55]} s={[0.08, 2.4, 0.08]} c={color} metal />)}
    <Block p={[0, 1.22, 0.58]} s={[3.05, 2.05, 0.035]} c="#a9cfd0" o={0.32} />
    <Block p={[-1.58, 1.22, 0]} s={[0.035, 2.05, 1.15]} c="#a9cfd0" o={0.32} />
    <Block p={[0, 2.43, 0]} s={[3.65, 0.12, 1.8]} c={color} />
    <Block p={[0, 2.51, 0]} s={[2.8, 0.04, 1.3]} c="#6a8c97" />
    <group position={[-0.2, 0, 0.05]}><Bench width={2.1} backrest={false} /></group>
    <Block p={[1.35, 1.25, -0.15]} s={[0.34, 1.8, 0.14]} c={color} />
    <Block p={[1.35, 1.4, -0.23]} s={[0.25, 1.2, 0.015]} c="#f3dab2" />
    <Block p={[1.35, 1.65, -0.245]} s={[0.19, 0.16, 0.015]} c="#d78750" />
    {[0.9, 1.05, 1.2].map((y) => <Block key={y} p={[1.35, y, -0.245]} s={[0.18, 0.035, 0.015]} c="#54716c" />)}
  </group>
);

export const BicycleRack: React.FC<ColorProps & {spaces?: number}> = ({color = '#778c85', spaces = 4}) => (
  <group>
    {Array.from({length: Math.max(1, Math.min(12, Math.floor(spaces)))}, (_, i) => <group key={i} position={[(i - (Math.max(1, Math.min(12, Math.floor(spaces))) - 1) / 2) * 0.7, 0, 0]}>
      {[-0.3, 0.3].map((z) => <Cyl key={z} p={[0, 0.39, z]} rad={0.025} h={0.78} c={color} />)}
      <mesh position={[0, 0.78, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.3, 0.025, 6, 12, Math.PI]} /><Mat color={color} metal /></mesh>
    </group>)}
  </group>
);
