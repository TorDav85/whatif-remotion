import React from 'react';
import {Block, Ball} from '../../../assets/kit';
import {CameraRig} from '../../../shared/three/common';
import {Bridge} from './Bridge';
import {eventOf, eventProgress} from '../timeline/runtime.mjs';
import type {CompiledTimeline} from '../timeline/types';

export const ParisScene: React.FC<{timeline: CompiledTimeline; time: number}> = ({timeline, time}) => {
  const weakening = eventProgress(eventOf(timeline, 'metalWeakening'), time);
  const collapse = eventProgress(eventOf(timeline, 'bridgeCollapse'), time);
  const camera = eventProgress(eventOf(timeline, 'cameraMove'), time);
  return <>
    <color attach="background" args={['#a4c4c7']} />
    <fog attach="fog" args={['#a4c4c7', 28, 85]} />
    <CameraRig position={[10 - camera * 2.4, 7 - camera * 1.8, 15 - camera * 3]} target={[0, 0.3, 0]} fov={42} />
    <hemisphereLight args={['#f9f2d5', '#627a70', 1.4]} />
    <directionalLight position={[8, 14, 10]} color="#fff0cc" intensity={2.2} />
    <directionalLight position={[-10, 4, -8]} color="#b7d7df" intensity={0.65} />
    <Block p={[0, -1.4, 0]} s={[80, 0.1, 60]} c="#507e89" />
    {[-1, 1].map((side) => <group key={side}>
      <Block p={[side * 12.5, -0.4, 0]} s={[14, 2, 30]} c="#b4ad91" />
      <Block p={[side * 8.6, 0.66, 0]} s={[6, 0.12, 30]} c="#d1c4a6" />
      {[-10, -5, 5, 10].map((z) => <group key={z}>
        <Block p={[side * 14, 3.1, z]} s={[5, 5.2, 3.9]} c={z > 0 ? '#d4c4a3' : '#bec1ac'} />
        <Block p={[side * 14, 5.85, z]} s={[5.3, 0.4, 4.2]} c="#728985" />
        {[-0.9, 0.5, 1.9].map((y) => <Block key={y} p={[side * 11.46, 2.5 + y, z]} s={[0.03, 0.75, 2.9]} c="#668b91" />)}
      </group>)}
    </group>)}
    <Bridge weakening={weakening} collapse={collapse} />
    {/* A deterministic ring of spray appears only after debris reaches the river. */}
    {collapse > 0.45 && Array.from({length: 18}, (_, i) => {
      const progress = Math.max(0, Math.min(1, (collapse - 0.45) / 0.55));
      const angle = i * 2.4;
      return <Ball key={i} p={[Math.cos(angle) * progress * 4.4, -1.2 + Math.sin(progress * Math.PI) * (0.5 + (i % 4) * 0.3), Math.sin(angle) * progress * 2.5]}
        rad={0.12 * (1 - progress * 0.7)} c="#c7e4db" detail={0} />;
    })}
  </>;
};
