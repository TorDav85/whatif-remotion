import React, {useMemo} from 'react';
import {Block, Mat, PAL, BOX_UP} from '../kit';
import {COLORS} from '../colors';
import {PANE} from '../shared';

type Props = {
  position?: [number, number, number];
  height?: number;
  color?: string;
};

export const BuildingB: React.FC<Props> = ({position = [0, 0, 0], height = 40, color = COLORS.buildingGrey}) => {
  const floors = Math.max(1, Math.floor((height - 1) / 2.6));

  const windows = useMemo(() => {
    const out: {x: number; y: number; z: number; ry: number}[] = [];
    for (let f = 0; f < floors; f++) {
      const y = 1.8 + f * 2.6;
      for (let col = 0; col < 4; col++) {
        const u = -1.5 + col * 1.0;
        out.push({x: u, y, z: 1.51, ry: 0});
        out.push({x: u, y, z: -1.51, ry: Math.PI});
      }
      for (let col = 0; col < 2; col++) {
        const u = -0.5 + col * 1.0;
        out.push({x: 1.51, y, z: u, ry: Math.PI / 2});
        out.push({x: -1.51, y, z: u, ry: -Math.PI / 2});
      }
    }
    return out;
  }, [floors]);

  return (
    <group position={position}>
      <mesh geometry={BOX_UP} scale={[3, height, 3]} castShadow receiveShadow>
        <Mat color={color} metal />
      </mesh>
      <Block p={[0, height + 0.1, 0]} s={[3.2, 0.2, 3.2]} c={PAL.slate} />
      {windows.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, w.z]} rotation={[0, w.ry, 0]} geometry={PANE} scale={[0.7, 1.8, 1]}>
          <Mat color="#2B4C7E" />
        </mesh>
      ))}
    </group>
  );
};
