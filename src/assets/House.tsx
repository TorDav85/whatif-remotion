import React from 'react';
import {Block, Mat, PAL, PRISM} from './kit';

export type HouseProps = {
  width?: number;
  depth?: number;
  walls?: string;
  roof?: string;
  shutters?: string;
  door?: string;
  /** 1 ou 2 niveaux */
  floors?: 1 | 2;
  /** fenêtres allumées (0..1) */
  lit?: number;
  garden?: boolean;
};

/** Maison individuelle (pavillon) : toit à deux pans, volets, cheminée. Origine au sol, façade vers -z. */
export const House: React.FC<HouseProps> = ({
  width = 9,
  depth = 7,
  walls = '#efe3c8',
  roof = PAL.terracotta,
  shutters = '#3f6b8a',
  door = '#7a2e2a',
  floors = 2,
  lit = 0,
  garden = true,
}) => {
  const H = floors === 2 ? 5.6 : 3;
  const win = (x: number, y: number) => (
    <group key={`${x}${y}`} position={[x, y, -depth / 2 - 0.03]}>
      <Block p={[0, 0, 0]} s={[1.1, 1.3, 0.05]} c={PAL.frame} />
      <Block p={[0, 0, -0.02]} s={[0.9, 1.1, 0.05]} c={PAL.glass} e={PAL.glassLit} ei={lit * 1.2} />
      {[-1, 1].map((s) => (
        <Block key={s} p={[s * 0.85, 0, -0.03]} s={[0.55, 1.3, 0.05]} c={shutters} />
      ))}
    </group>
  );
  return (
    <group>
      <Block p={[0, H / 2, 0]} s={[width, H, depth]} c={walls} />
      <Block p={[0, 0.2, 0]} s={[width + 0.1, 0.4, depth + 0.1]} c={PAL.stoneDark} />
      {/* toit : deux pans + débord */}
      <mesh position={[0, H, 0]} scale={[depth + 0.8, 3.2, width + 0.8]} rotation={[0, Math.PI / 2, 0]} geometry={PRISM}>
        <Mat color={roof} />
      </mesh>
      <Block p={[width * 0.25, H + 2.4, 1]} s={[0.7, 1.8, 0.7]} c={PAL.brick} />
      {/* porte, perron */}
      <Block p={[-width * 0.15, 1.15, -depth / 2 - 0.03]} s={[1.1, 2.1, 0.08]} c={door} />
      <Block p={[-width * 0.15, 0.1, -depth / 2 - 0.5]} s={[1.8, 0.2, 1]} c={PAL.stone} />
      {win(width * 0.22, 1.6)}
      {win(-width * 0.38, 1.6)}
      {floors === 2 && [win(-width * 0.3, 4.2), win(0.05 * width, 4.2), win(width * 0.33, 4.2)]}
      {garden && (
        <>
          <Block p={[0, 0.02, -depth / 2 - 3]} s={[width + 4, 0.04, 6]} c="#5f9a43" />
          {/* haie et arbuste */}
          <Block p={[0, 0.5, -depth / 2 - 6]} s={[width + 4, 1, 0.6]} c="#3f6a2c" />
          <mesh position={[width / 2 + 0.8, 1.2, -depth / 2 - 2]} scale={1.2}>
            <icosahedronGeometry args={[1, 0]} />
            <Mat color="#4f7a34" />
          </mesh>
        </>
      )}
    </group>
  );
};
