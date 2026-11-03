import React from 'react';
import * as THREE from 'three';
import {Block, Cyl, Mat} from '../../../assets/kit';

/** Reusable geometry; placement and narrative progression are supplied by the scene. */
export const Bridge: React.FC<{weakening: number; collapse: number}> = ({weakening, collapse}) => {
  const iron = new THREE.Color('#426d70').lerp(new THREE.Color('#a46c4e'), weakening);
  return <group>
    {[-5.2, 5.2].map((x) => <group key={x}>
      <Block p={[x, 0.3, 0]} s={[1.6, 3, 3.8]} c="#bab09a" />
      <Block p={[x, 1.85, 0]} s={[2, 0.18, 4.2]} c="#d6c9ac" />
      {[-1.6, 1.6].map((z) => <Cyl key={z} p={[x, 2.25, z]} rad={0.12} h={0.75} c="#66827b" seg={8} />)}
    </group>)}
    {Array.from({length: 9}, (_, i) => {
      const x = (i - 4) * 1.12;
      const lag = Math.abs(i - 4) * 0.055;
      const progress = Math.max(0, Math.min(1, (collapse - lag) / (1 - lag)));
      const fall = progress * progress * 5.8;
      return <group key={i} position={[x + Math.sign(x) * progress * 0.32, 1.7 - fall, progress * Math.sin(i * 2.3) * 0.65]}
        rotation={[progress * Math.sin(i) * 0.7, 0, Math.sign(x || 1) * progress * 0.55]}>
        <Block p={[0, 0, 0]} s={[1.1, 0.25, 3.4]} c="#c9b897" />
        <Block p={[0, -0.21, 0]} s={[1.1, 0.24, 2.6]} c={iron.getStyle()} />
        {[-1.55, 1.55].map((z) => <group key={z}>
          <Block p={[0, 0.48, z]} s={[1.12, 0.08, 0.07]} c={iron.getStyle()} />
          {[-0.43, 0, 0.43].map((localX) => <Block key={localX} p={[localX, 0.25, z]} s={[0.055, 0.5, 0.055]} c={iron.getStyle()} />)}
        </group>)}
        {weakening > 0 && <Block p={[0.15, 0.133, 0]} s={[0.03 + weakening * 0.06, 0.008, 2.9]} c="#5d5142" r={[0, 0.15 * Math.sin(i * 1.7), 0]} />}
      </group>;
    })}
    {/* Thin structural arches break with the deck; no accumulated physics state. */}
    {[-1.35, 1.35].map((z) => <group key={z} position={[0, 0.8 - collapse * collapse * 4, z]} rotation={[0, 0, collapse * 0.35]}>
      <mesh rotation={[0, 0, Math.PI]} scale={[1, 0.22, 1]}><torusGeometry args={[4.2, 0.11, 6, 20, Math.PI]} /><Mat color={iron.getStyle()} metal /></mesh>
    </group>)}
  </group>;
};
