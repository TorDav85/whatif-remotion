import React from 'react';
import {Ball, Block, Cyl, Mat, seeded} from '../kit';
import {Bench} from './Street';
import type {ColorProps} from './primitives';

export type TreeProps = {height?: number; foliage?: string; trunk?: string; seed?: number};
export const Tree: React.FC<TreeProps> = ({height = 4.8, foliage = '#608451', trunk = '#866247', seed = 5}) => {
  const random = seeded(seed);
  return <group>
    <Cyl p={[0, height * 0.3, 0]} rad={height * 0.035} h={height * 0.6} c={trunk} seg={7} />
    {Array.from({length: 7}, (_, i) => {const a = i * 2.4; const distance = (0.3 + random() * 0.3) * height * 0.25; return <Ball key={i} p={[Math.cos(a) * distance, height * (0.64 + random() * 0.16), Math.sin(a) * distance]} rad={height * (0.2 + random() * 0.05)} c={foliage} s={[1, 1.15, 1]} />;})}
  </group>;
};

export const PineTree: React.FC<TreeProps> = ({height = 5.6, foliage = '#3c685b', trunk = '#78583e'}) => (
  <group>
    <Cyl p={[0, height * 0.25, 0]} rad={height * 0.03} h={height * 0.5} c={trunk} seg={7} />
    {[0, 1, 2, 3].map((i) => <mesh key={i} position={[0, height * (0.37 + i * 0.145), 0]}><coneGeometry args={[height * (0.23 - i * 0.045), height * 0.4, 7]} /><Mat color={foliage} /></mesh>)}
  </group>
);

export const Hedge: React.FC<ColorProps & {width?: number; height?: number}> = ({color = '#577b4d', width = 2.6, height = 1.1}) => (
  <group><Block p={[0, 0.06, 0]} s={[width + 0.1, 0.12, 0.8]} c="#8c8471" /><Block p={[0, height / 2 + 0.12, 0]} s={[width, height, 0.7]} c={color} />{[-0.38, 0.38].map((z) => <Block key={z} p={[0, 0.14, z]} s={[width + 0.12, 0.14, 0.08]} c="#c8b595" />)}</group>
);

export const Planter: React.FC<ColorProps & {flowers?: string}> = ({color = '#b57654', flowers = '#e6b44f'}) => (
  <group>
    <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[0.46, 0.32, 0.64, 8]} /><Mat color={color} /></mesh>
    <Cyl p={[0, 0.64, 0]} rad={0.49} h={0.12} c={color} seg={8} />
    <Cyl p={[0, 0.7, 0]} rad={0.42} h={0.025} c="#4f4633" />
    {Array.from({length: 7}, (_, i) => {const a = i * 2.4; const x = Math.sin(a) * 0.26; const z = Math.cos(a) * 0.26; return <group key={i}><Cyl p={[x, 0.87, z]} rad={0.012} h={0.34} c="#63804a" seg={5} /><Ball p={[x, 1.05 + (i % 2) * 0.06, z]} rad={0.12} c={flowers} detail={0} /></group>;})}
  </group>
);

export const Fountain: React.FC<ColorProps & {flow?: number}> = ({color = '#b9ad93', flow = 1}) => (
  <group>
    <Cyl p={[0, 0.09, 0]} rad={1.3} h={0.18} c={color} seg={20} />
    <Cyl p={[0, 0.2, 0]} rad={1.13} h={0.08} c="#70a4b1" seg={24} />
    <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.2, 0.11, 6, 24]} /><Mat color={color} /></mesh>
    <Cyl p={[0, 0.54, 0]} rad={0.18} h={0.72} c={color} />
    <Cyl p={[0, 0.93, 0]} rad={0.58} h={0.12} c={color} seg={16} />
    <Cyl p={[0, 1.07, 0]} rad={0.07} h={0.25} c={color} />
    {flow > 0 && <group scale={[1, Math.min(1.5, flow), 1]}><Cyl p={[0, 1.34, 0]} rad={0.025} h={0.38} c="#b1dfdd" />{Array.from({length: 8}, (_, i) => {const a = i * Math.PI / 4; return <Cyl key={i} p={[Math.sin(a) * 0.48, 0.58, Math.cos(a) * 0.48]} rad={0.013} h={0.68} c="#b1dfdd" />;})}</group>}
  </group>
);

export const PicnicTable: React.FC<ColorProps> = ({color = '#a1764e'}) => (
  <group>
    {[-0.54, 0.54].map((z) => <group key={z} position={[0, 0, z * 1.5]}><Bench width={2.1} color={color} backrest={false} /></group>)}
    {[-0.7, 0.7].map((x) => <Block key={x} p={[x, 0.36, 0]} s={[0.12, 0.72, 0.75]} c="#354b42" />)}
    {[-0.3, -0.1, 0.1, 0.3].map((z) => <Block key={z} p={[0, 0.77, z]} s={[2.2, 0.09, 0.18]} c={color} />)}
  </group>
);
