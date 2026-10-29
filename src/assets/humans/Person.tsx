import React from 'react';
import {Block, PAL} from '../kit';

type Props = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  shirt?: string;
  pants?: string;
  skin?: string;
  hair?: string;
  shoes?: string;
  scale?: number;
  walkPhase?: number;
};

export const PersonSimple: React.FC<Props> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  shirt = '#2b3a55',
  pants = '#3a3f47',
  skin = '#e8b894',
  hair = '#3a2a1e',
  shoes = '#1d1d1f',
  scale: s = 1,
  walkPhase = 0,
}) => {
  const swing = Math.sin(walkPhase) * 0.5;
  const bob = walkPhase !== 0 ? Math.abs(Math.cos(walkPhase)) * 0.04 : 0;

  return (
    <group position={[position[0], position[1] + bob, position[2]]} rotation={rotation} scale={s}>
      {[-1, 1].map((side) => (
        <group key={`l${side}`} position={[side * 0.1, 0.9, 0]} rotation={[side * swing, 0, 0]}>
          <Block p={[0, -0.42, 0]} s={[0.15, 0.84, 0.17]} c={pants} />
          <Block p={[0, -0.86, -0.05]} s={[0.16, 0.1, 0.27]} c={shoes} />
        </group>
      ))}
      <Block p={[0, 1.21, 0]} s={[0.44, 0.62, 0.25]} c={shirt} />
      {[-1, 1].map((side) => (
        <group key={`a${side}`} position={[side * 0.27, 1.45, 0]} rotation={[-side * swing * 0.8, 0, side * 0.06]}>
          <Block p={[0, -0.27, 0]} s={[0.11, 0.56, 0.13]} c={shirt} />
          <Block p={[0, -0.6, 0]} s={[0.1, 0.12, 0.11]} c={skin} />
        </group>
      ))}
      <Block p={[0, 1.7, 0]} s={[0.25, 0.27, 0.25]} c={skin} />
      <Block p={[0, 1.85, 0.01]} s={[0.27, 0.07, 0.27]} c={hair} />
    </group>
  );
};
