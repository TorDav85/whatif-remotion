import React, {useMemo} from 'react';
import {Block, Mat, PAL, BOX_UP, MANSARD} from '../kit';
import {COLORS} from '../colors';
import {PANE} from '../shared';

type Props = {
  position?: [number, number, number];
  height?: number;
  color?: string;
};

export const BuildingA: React.FC<Props> = ({position = [0, 0, 0], height = 15, color = COLORS.buildingBrick}) => {
  const floors = Math.max(1, Math.floor((height - 2) / 2.8));

  const windows = useMemo(() => {
    const out: {x: number; y: number; z: number; ry: number}[] = [];
    for (let f = 0; f < floors; f++) {
      const y = 2 + f * 2.8;
      for (let col = 0; col < 3; col++) {
        const u = -1.2 + col * 1.2;
        out.push({x: u, y, z: 2.01, ry: 0});
        out.push({x: u, y, z: -2.01, ry: Math.PI});
      }
    }
    return out;
  }, [floors]);

  return (
    <group position={position}>
      <mesh geometry={BOX_UP} scale={[4, height, 4]} castShadow receiveShadow>
        <Mat color={color} />
      </mesh>
      {/* Corniche */}
      <Block p={[0, height + 0.15, 0]} s={[4.4, 0.3, 4.4]} c={COLORS.buildingBeige} />
      {/* Toit mansardé */}
      <mesh position={[0, height + 0.3, 0]} scale={[3.6, 1.8, 3.6]} geometry={MANSARD}>
        <Mat color={COLORS.roofDark} />
      </mesh>
      {/* Fenêtres */}
      {windows.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, w.z]} rotation={[0, w.ry, 0]} geometry={PANE} scale={[0.8, 1.2, 1]}>
          <Mat color={PAL.glass} />
        </mesh>
      ))}
      {/* Balcons */}
      {Array.from({length: floors}, (_, f) => (
        <Block key={f} p={[0, 1.5 + f * 2.8, 2.15]} s={[3.8, 0.06, 0.15]} c={PAL.iron} />
      ))}
    </group>
  );
};
