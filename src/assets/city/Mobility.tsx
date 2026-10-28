import React from 'react';
import {Block, Cyl, Mat, PAL} from '../kit';
import {Rod, Wheel, type ColorProps} from './primitives';

export type BicycleProps = ColorProps & {wheelSpin?: number; basket?: boolean};
export const Bicycle: React.FC<BicycleProps> = ({color = '#bc6747', wheelSpin = 0, basket = true}) => (
  <group>
    {[-0.63, 0.63].map((z) => <group key={z} position={[0, 0.34, z]}><Wheel spin={wheelSpin} /></group>)}
    {[
      [[0, 0.34, 0.63], [0, 0.36, 0]], [[0, 0.36, 0], [0, 0.86, 0.23]],
      [[0, 0.86, 0.23], [0, 0.34, 0.63]], [[0, 0.86, 0.23], [0, 0.87, -0.4]],
      [[0, 0.87, -0.4], [0, 0.36, 0]], [[0, 0.87, -0.4], [0, 0.34, -0.63]],
    ].map(([a, b], i) => <Rod key={i} a={a as [number, number, number]} b={b as [number, number, number]} color={color} radius={0.027} />)}
    <Rod a={[0, 0.76, 0.2]} b={[0, 1.02, 0.25]} color={PAL.chrome} radius={0.018} />
    <Block p={[0, 1.03, 0.25]} s={[0.2, 0.065, 0.29]} c={PAL.iron} />
    <Rod a={[0, 0.85, -0.4]} b={[0, 1.09, -0.5]} color={PAL.chrome} radius={0.02} />
    <Rod a={[-0.27, 1.1, -0.5]} b={[0.27, 1.1, -0.5]} color={PAL.iron} />
    <Rod a={[-0.13, 0.36, 0]} b={[0.13, 0.36, 0]} color={PAL.chrome} radius={0.025} />
    {[-1, 1].map((s) => <Block key={s} p={[s * 0.15, 0.36, s * 0.1]} s={[0.14, 0.04, 0.08]} c={PAL.iron} />)}
    {basket && <group><Block p={[0, 0.97, -0.81]} s={[0.39, 0.025, 0.29]} c="#ae9b73" />{[-1, 1].map((s) => <Block key={s} p={[s * 0.2, 1.09, -0.81]} s={[0.025, 0.25, 0.31]} c="#ae9b73" />)}<Block p={[0, 1.09, -0.96]} s={[0.39, 0.25, 0.025]} c="#ae9b73" /></group>}
  </group>
);

export const Scooter: React.FC<ColorProps & {wheelSpin?: number}> = ({color = '#d6b14d', wheelSpin = 0}) => (
  <group>
    {[-0.48, 0.48].map((z) => <group key={z} position={[0, 0.1, z]}><Wheel radius={0.09} spin={wheelSpin} /></group>)}
    <Block p={[0, 0.13, 0]} s={[0.19, 0.08, 0.88]} c={color} />
    <Rod a={[0, 0.13, -0.46]} b={[0, 1.14, -0.38]} radius={0.025} color={color} />
    <Rod a={[-0.28, 1.15, -0.38]} b={[0.28, 1.15, -0.38]} radius={0.025} color={PAL.iron} />
  </group>
);

export type TrafficLightProps = {state?: 'red' | 'amber' | 'green'; height?: number};
export const TrafficLight: React.FC<TrafficLightProps> = ({state = 'red', height = 2.6}) => (
  <group>
    <Cyl p={[0, 0.07, 0]} rad={0.19} h={0.14} c="#4e5c56" />
    <Cyl p={[0, (height - 0.3) / 2, 0]} rad={0.045} h={height - 0.3} c="#4e5c56" />
    <Block p={[0, height - 0.35, 0]} s={[0.31, 0.84, 0.22]} c="#263633" />
    {(['red', 'amber', 'green'] as const).map((name, i) => <group key={name}><Cyl p={[0, height - 0.1 - i * 0.25, -0.13]} rad={0.088} h={0.035} r={[Math.PI / 2, 0, 0]} c={state === name ? {red: '#ed5d4f', amber: '#f4c04f', green: '#6bc28d'}[name] : '#394540'} e={state === name ? {red: '#ed5d4f', amber: '#f4c04f', green: '#6bc28d'}[name] : undefined} ei={state === name ? 1.1 : 0} /><Block p={[0, height + 0.005 - i * 0.25, -0.21]} s={[0.22, 0.025, 0.16]} c="#263633" /></group>)}
  </group>
);

export const TrafficSign: React.FC<{kind?: 'parking' | 'crossing' | 'no-entry'}> = ({kind = 'parking'}) => (
  <group>
    <Cyl p={[0, 1.05, 0]} rad={0.035} h={2.1} c="#8f9c95" />
    {kind === 'no-entry' ? <group><Cyl p={[0, 1.92, 0]} rad={0.34} h={0.04} r={[Math.PI / 2, 0, 0]} c="#cc604c" /><Block p={[0, 1.92, -0.03]} s={[0.47, 0.12, 0.02]} c="#faf2dc" /></group> : <group>
      <Block p={[0, 1.94, 0]} s={[0.65, 0.65, 0.045]} c="#e6dfc8" />
      <Block p={[0, 1.94, -0.03]} s={[0.56, 0.56, 0.02]} c="#456b90" />
      {kind === 'parking' ? <group><Block p={[-0.11, 1.94, -0.05]} s={[0.07, 0.36, 0.02]} c="#faf2dc" /><Block p={[0.015, 2.085, -0.05]} s={[0.25, 0.07, 0.02]} c="#faf2dc" /><Block p={[0.015, 1.94, -0.05]} s={[0.25, 0.07, 0.02]} c="#faf2dc" /><Block p={[0.105, 2.015, -0.05]} s={[0.07, 0.18, 0.02]} c="#faf2dc" /></group> : <group>{[-0.16, 0, 0.16].map((x) => <Block key={x} p={[x, 1.83, -0.05]} s={[0.07, 0.06, 0.02]} c="#faf2dc" />)}<Rod a={[-0.08, 2.1, -0.05]} b={[0.08, 1.9, -0.05]} color="#faf2dc" radius={0.03} /></group>}
    </group>}
  </group>
);

export const Crosswalk: React.FC<{width?: number; stripes?: number}> = ({width = 4, stripes = 7}) => (
  <group>
    <Block p={[0, 0.025, 0]} s={[width + 1, 0.05, 3.4]} c="#546361" />
    {Array.from({length: Math.max(2, Math.min(20, Math.floor(stripes)))}, (_, i) => <Block key={i} p={[0, 0.055, -1.3 + i * 2.6 / (Math.max(2, Math.min(20, Math.floor(stripes))) - 1)]} s={[width, 0.015, 0.22]} c="#ece6ce" />)}
  </group>
);

export const RoadBarrier: React.FC<ColorProps> = ({color = '#c17a43'}) => (
  <group>
    {[-0.84, 0.84].map((x) => <group key={x}><Block p={[x, 0.05, 0]} s={[0.16, 0.1, 0.78]} c="#4b5d56" /><Block p={[x, 0.52, 0]} s={[0.07, 0.95, 0.07]} c="#4b5d56" /></group>)}
    <Block p={[0, 0.84, 0]} s={[2.05, 0.23, 0.07]} c="#eee6ce" />
    <Block p={[0, 0.43, 0]} s={[2.05, 0.12, 0.07]} c="#eee6ce" />
    {[-0.75, -0.25, 0.25, 0.75].map((x) => <Block key={x} p={[x, 0.84, -0.045]} s={[0.25, 0.22, 0.02]} c={color} />)}
  </group>
);
