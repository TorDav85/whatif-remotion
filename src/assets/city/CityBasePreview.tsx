import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CameraRig} from '../../shared/three/common';
import {SERIF} from '../../shared/ui/tokens';
import {smooth} from '../../core/animation';
import {CityBase} from './CityBase';

type V3 = [number, number, number];
const SHOTS: {name: string; p0: V3; p1: V3; target: V3; lit: number; fov: number}[] = [
  {name: 'RUE', p0: [6.7, 1.75, 35], p1: [6.65, 1.7, 31], target: [1.5, 2.6, -60], lit: 0, fov: 58},
  {name: 'AÉRIEN', p0: [70, 75, 40], p1: [55, 70, 55], target: [0, 0, -40], lit: 0, fov: 50},
  {name: 'CARREFOUR', p0: [-3.0, 1.7, -38.2], p1: [-2.6, 1.7, -38.8], target: [10, 3.5, -52], lit: 0, fov: 62},
  {name: 'NUIT', p0: [-1.6, 2.4, 28], p1: [-1.6, 2.4, 20], target: [0, 5, -90], lit: 1, fov: 58},
];
export const CITY_PREVIEW_SEC = 3;
export const CITY_PREVIEW_FRAMES = SHOTS.length * CITY_PREVIEW_SEC * 30;

export const CityBasePreview: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const i = Math.min(SHOTS.length - 1, Math.floor(t / CITY_PREVIEW_SEC));
  const s = SHOTS[i];
  const k = smooth(i * CITY_PREVIEW_SEC, (i + 1) * CITY_PREVIEW_SEC, t);
  const pos = s.p0.map((v, j) => v + (s.p1[j] - v) * k) as V3;
  const night = s.lit;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
        <CameraRig position={pos} target={s.target} fov={s.fov} />
        <CityBase time={t} lit={night} seed={42} focus={pos[2] - 20}
          skyTop={night > 0.5 ? '#0b0f22' : '#5b8fd1'} skyBottom={night > 0.5 ? '#2a2440' : '#e9e1cf'} />
      </ThreeCanvas>
      <div style={{position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center', fontFamily: SERIF,
        color: '#F6E05E', fontSize: 34, letterSpacing: '0.2em', textShadow: '0 2px 12px rgba(0,0,0,0.6)'}}>
        CITYBASE · {s.name}
      </div>
    </AbsoluteFill>
  );
};
