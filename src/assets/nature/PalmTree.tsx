import React from 'react';
import {Cyl, Mat} from '../kit';
import {COLORS} from '../colors';
import {CONE} from '../shared';

type Props = {
  position?: [number, number, number];
  scale?: number;
};

export const PalmTree: React.FC<Props> = ({position = [0, 0, 0], scale: s = 1}) => (
  <group position={position} scale={s}>
    {Array.from({length: 4}, (_, i) => (
      <Cyl key={i} p={[i * 0.15, i * 1.5 + 0.75, 0]} rad={0.15 - i * 0.015} h={1.5} c="#8B6914" />
    ))}
    {Array.from({length: 6}, (_, i) => {
      const angle = (i / 6) * Math.PI * 2;
      return (
        <group key={i} position={[0.6, 6.2, 0]} rotation={[Math.cos(angle) * 0.9, angle, Math.sin(angle) * 0.3]}>
          <mesh geometry={CONE} scale={[0.5, 3.0, 0.15]}>
            <Mat color={COLORS.treeGreen} smooth />
          </mesh>
        </group>
      );
    })}
  </group>
);
