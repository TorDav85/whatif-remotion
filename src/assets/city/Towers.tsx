import React from 'react';
import {Block, Cyl, PAL} from '../kit';

export type TowerProps = {height?: number; width?: number; depth?: number; color?: string; style?: 'verre' | 'bandes' | 'gradins'; lit?: number};

/** Glass office tower (business district). Origin at the ground, front facing -z. */
export const Tower: React.FC<TowerProps> = ({height = 90, width = 20, depth = 20, color = '#6f8aa8', style = 'bandes', lit = 0}) => {
  const tiers = style === 'gradins' ? [[1, 0.55], [0.78, 0.3], [0.56, 0.15]] : [[1, 1]];
  let base = 0;
  return (
    <group>
      <Block p={[0, 2.5, 0]} s={[width + 2, 5, depth + 2]} c="#3d4552" />
      <Block p={[0, 2.4, -depth / 2 - 1.02]} s={[width * 0.6, 3.6, 0.04]} c="#9fc0d8" e="#ffcf80" ei={lit * 0.8} />
      {tiers.map(([scale, share], ti) => {
        const h = (height - 5) * share;
        const w = width * scale;
        const d = depth * scale;
        const y0 = 5 + base;
        base += h;
        const floors = Math.floor(h / 3.8);
        return (
          <group key={ti}>
            <Block p={[0, y0 + h / 2, 0]} s={[w, h, d]} c={color} e="#ffd59a" ei={lit * 0.35} metal />
            {style !== 'verre' && Array.from({length: floors}, (_, f) => (
              <Block key={f} p={[0, y0 + (f + 1) * 3.8, 0]} s={[w + 0.25, 0.35, d + 0.25]} c="#d9dde2" />
            ))}
            {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
              <Block key={`${sx}${sz}`} p={[(sx * w) / 2, y0 + h / 2, (sz * d) / 2]} s={[0.6, h, 0.6]} c="#2b3340" />
            )))}
            {style === 'verre' && Array.from({length: Math.floor(w / 3)}, (_, i) => (
              <Block key={`m${i}`} p={[-w / 2 + 1.5 + i * 3, y0 + h / 2, -d / 2 - 0.05]} s={[0.15, h, 0.12]} c="#9aa6b4" />
            ))}
          </group>
        );
      })}
      <Block p={[0, height + 1.5, 0]} s={[width * 0.4, 3, depth * 0.4]} c="#3d4552" />
      <Cyl p={[0, height + 9, 0]} rad={0.25} h={12} c="#c9ced3" metal />
      <Block p={[0, height + 15.2, 0]} s={[0.5, 0.5, 0.5]} c={PAL.tail} e={PAL.tail} ei={0.5 + lit * 2} />
    </group>
  );
};

export type ModernBlockProps = {width?: number; depth?: number; floors?: number; color?: string; accent?: string; lit?: number};

/** 1970s apartment block: pilotis, continuous balconies, flat roof. Origin at the ground, front facing -z. */
export const ModernBlock: React.FC<ModernBlockProps> = ({width = 30, depth = 12, floors = 8, color = '#d6cfc2', accent = '#c46a3a', lit = 0}) => {
  const fh = 2.9;
  const h = 3.5 + floors * fh;
  const front = -depth / 2;
  return (
    <group>
      {Array.from({length: Math.max(2, Math.floor(width / 6)) + 1}, (_, i) => (
        <Block key={i} p={[-width / 2 + 0.4 + (i * (width - 0.8)) / Math.max(2, Math.floor(width / 6)), 1.75, front + 1]} s={[0.6, 3.5, 0.6]} c="#9a9488" />
      ))}
      <Block p={[0, 1.75, 1]} s={[width * 0.35, 3.5, depth - 2]} c="#7f93a4" e="#ffcf80" ei={lit * 0.6} />
      <Block p={[0, 3.5 + (floors * fh) / 2, 0]} s={[width, floors * fh, depth]} c={color} />
      {Array.from({length: floors}, (_, f) => {
        const y = 3.5 + f * fh;
        const on = lit > 0;
        return (
          <group key={f}>
            <Block p={[0, y + 1.5, front - 0.02]} s={[width - 0.6, 1.4, 0.05]} c={on && f % 3 !== 1 ? PAL.glassLit : '#5d6a78'} e={PAL.glassLit} ei={on && f % 3 !== 1 ? 0.9 : 0} />
            <Block p={[0, y + 0.1, front - 0.7]} s={[width, 0.18, 1.4]} c="#e6e0d4" />
            <Block p={[0, y + 0.65, front - 1.38]} s={[width, 0.9, 0.06]} c={f % 2 ? accent : '#e6e0d4'} />
          </group>
        );
      })}
      <Block p={[0, h + 0.3, 0]} s={[width + 0.3, 0.6, depth + 0.3]} c="#9a9488" />
      <Block p={[width * 0.25, h + 1.6, 1]} s={[3, 2.2, 3]} c="#9a9488" />
    </group>
  );
};

export type BridgeProps = {length?: number; width?: number; arches?: number; stone?: string; lit?: number};

/** Stone bridge with arches, parapets and lamps. The deck runs along z, its top at y = 0.2. */
export const Bridge: React.FC<BridgeProps> = ({length = 56, width = 16, arches = 3, stone = '#c9bb9e', lit = 0}) => {
  const span = length / arches;
  return (
    <group>
      <Block p={[0, -0.6, 0]} s={[width, 1.6, length]} c={stone} />
      <Block p={[0, 0.19, 0]} s={[width - 6, 0.02, length]} c="#3c3d42" />
      {[-1, 1].map((s) => (
        <React.Fragment key={s}>
          <Block p={[s * (width / 2 - 1.5), 0.2, 0]} s={[3, 0.1, length]} c={PAL.stone} />
          <Block p={[s * (width / 2 - 0.2), 0.75, 0]} s={[0.4, 1.0, length]} c={stone} />
          {Array.from({length: arches + 1}, (_, i) => (
            <group key={i} position={[s * (width / 2 - 0.2), 0.25, -length / 2 + i * span]}>
              <Cyl p={[0, 0.9, 0]} rad={0.07} h={3.2} c="#2f3a3a" />
              <Block p={[0, 2.6, 0]} s={[0.35, 0.45, 0.35]} c="#f6d890" e="#ffc466" ei={lit * 1.6} />
            </group>
          ))}
        </React.Fragment>
      ))}
      {Array.from({length: arches + 1}, (_, i) => (
        <Block key={`p${i}`} p={[0, -3.5, -length / 2 + i * span]} s={[width + 1, 5, 3]} c={PAL.stoneDark} />
      ))}
      {Array.from({length: arches}, (_, i) => (
        <mesh key={`a${i}`} position={[0, -1.4, -length / 2 + (i + 0.5) * span]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[span / 2 - 1.5, 0.9, 6, 16, Math.PI]} />
          <meshStandardMaterial color={stone} flatShading roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};
