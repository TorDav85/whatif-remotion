import React from 'react';
import {PAL} from '../kit';

/** Ground pieces for editable city layouts. Origin at the centre, length along z. */
const ASPHALT = '#3c3d42';
const PAINT = '#ece6d6';

const Flat: React.FC<{p: [number, number, number]; s: [number, number]; c: string; basic?: boolean}> = ({p, s, c, basic}) => (
  <mesh position={p} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={s} />
    <meshStandardMaterial color={c} roughness={basic ? 0.6 : 0.8} />
  </mesh>
);

export type RoadProps = {width?: number; length?: number; parking?: boolean};
export const Road: React.FC<RoadProps> = ({width = 10, length = 30, parking = true}) => {
  const dashes = Math.max(1, Math.floor(length / 6));
  return (
    <group>
      <Flat p={[0, 0.01, 0]} s={[width, length]} c={ASPHALT} />
      {Array.from({length: dashes}, (_, i) => (
        <Flat key={i} p={[0, 0.02, -length / 2 + (i + 0.5) * (length / dashes)]} s={[0.14, 3]} c={PAINT} basic />
      ))}
      {parking && width >= 9 && [-1, 1].map((s) => (
        <Flat key={s} p={[s * (width / 2 - 1.8), 0.02, 0]} s={[0.1, length]} c="#d8d2c2" basic />
      ))}
    </group>
  );
};

export type IntersectionProps = {width?: number; depth?: number; crosswalks?: boolean};
export const Intersection: React.FC<IntersectionProps> = ({width = 10, depth = 10, crosswalks = true}) => (
  <group>
    <Flat p={[0, 0.012, 0]} s={[width, depth]} c={ASPHALT} />
    {crosswalks && [-1, 1].map((s) => (
      <React.Fragment key={s}>
        {Array.from({length: Math.floor(width / 0.9)}, (_, i) => (
          <Flat key={`z${i}`} p={[-width / 2 + 0.45 + i * 0.9, 0.022, s * (depth / 2 - 1.5)]} s={[0.45, 2.4]} c="#f1ece0" basic />
        ))}
        {Array.from({length: Math.floor(depth / 0.9)}, (_, i) => (
          <Flat key={`x${i}`} p={[s * (width / 2 - 1.5), 0.022, -depth / 2 + 0.45 + i * 0.9]} s={[2.4, 0.45]} c="#f1ece0" basic />
        ))}
      </React.Fragment>
    ))}
  </group>
);

export type SlabProps = {width?: number; depth?: number; color?: string; height?: number};
/** Raised sidewalk slab: a whole block sits on it, with a stone curb around. */
export const Sidewalk: React.FC<SlabProps> = ({width = 46, depth = 42, color = PAL.stone, height = 0.15}) => (
  <group>
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} flatShading roughness={0.85} />
    </mesh>
    <mesh position={[0, (height - 0.012) / 2, 0]}>
      <boxGeometry args={[width + 0.25, height - 0.012, depth + 0.25]} />
      <meshStandardMaterial color="#b9ad93" flatShading />
    </mesh>
  </group>
);

export const Grass: React.FC<SlabProps> = ({width = 20, depth = 20, color = '#6f9a52'}) => (
  <mesh position={[0, 0.17, 0]}>
    <boxGeometry args={[width, 0.06, depth]} />
    <meshStandardMaterial color={color} flatShading roughness={1} />
  </mesh>
);

export const Plaza: React.FC<SlabProps> = ({width = 20, depth = 20, color = '#d6c9ad'}) => (
  <group>
    <mesh position={[0, 0.16, 0]}>
      <boxGeometry args={[width, 0.04, depth]} />
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </mesh>
    {Array.from({length: Math.floor(width / 2)}, (_, i) => (
      <Flat key={i} p={[-width / 2 + 1 + i * 2, 0.185, 0]} s={[0.04, depth]} c="#bfb194" basic />
    ))}
  </group>
);

export const Water: React.FC<SlabProps> = ({width = 60, depth = 30, color = '#2f5468'}) => (
  <group>
    <Flat p={[0, -0.6, 0]} s={[width, depth]} c={color} />
    {[-1, 1].map((s) => (
      <mesh key={s} position={[0, -0.25, s * (depth / 2 + 0.75)]}>
        <boxGeometry args={[width, 0.9, 1.5]} />
        <meshStandardMaterial color={PAL.stoneDark} flatShading />
      </mesh>
    ))}
  </group>
);
