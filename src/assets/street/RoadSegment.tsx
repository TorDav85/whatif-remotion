import React from 'react';
import {Block, Mat, PAL} from '../kit';
import {COLORS} from '../colors';

type Props = {
  position?: [number, number, number];
  width?: number;
  length?: number;
};

export const RoadSegment: React.FC<Props> = ({position = [0, 0, 0], width = 8, length = 20}) => {
  const lineSpacing = length / 6;

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <Mat color={COLORS.roadDark} />
      </mesh>
      {Array.from({length: 5}, (_, i) => (
        <mesh key={i} position={[0, 0.01, -length / 2 + lineSpacing * (i + 0.5)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, lineSpacing * 0.5]} />
          <Mat color={COLORS.roadLine} />
        </mesh>
      ))}
      {[-width / 2 + 0.15, width / 2 - 0.15].map((x) => (
        <mesh key={x} position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, length]} />
          <Mat color={COLORS.roadLine} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <Block key={side} p={[side * (width / 2 + 0.8), 0.08, 0]} s={[1.6, 0.16, length]} c={PAL.stone} />
      ))}
    </group>
  );
};
