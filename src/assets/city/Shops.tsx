import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Ball, Block, Cyl, Mat, MANSARD, PAL} from '../kit';

/** Sign board with painted lettering (canvas texture). */
const Sign: React.FC<{text: string; w: number; h: number; p: [number, number, number]; bg: string; ink?: string; lit?: number}> = ({text, w, h, p, bg, ink = '#f6ecd2', lit = 0}) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = Math.max(64, Math.round((1024 * h) / w));
    const g = c.getContext('2d')!;
    g.fillStyle = bg;
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = ink;
    g.lineWidth = 6;
    g.strokeRect(10, 10, c.width - 20, c.height - 20);
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const size = Math.min(c.height * 0.62, (c.width * 1.5) / Math.max(4, text.length));
    g.font = `600 ${size}px Georgia, serif`;
    g.fillText(text, c.width / 2, c.height / 2 + size * 0.04);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, w, h, bg, ink]);
  return (
    <mesh position={p} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={lit * 0.5} roughness={0.8} />
    </mesh>
  );
};

export const SHOP_KINDS = {
  boulangerie: {sign: 'BOULANGERIE', front: '#7a4a2a', awning: ['#8a2b2b', '#f1e6cf']},
  pharmacie: {sign: 'PHARMACIE', front: '#2f6a4c', awning: ['#2f6a4c', '#e8efe8']},
  fleuriste: {sign: 'FLEURISTE', front: '#4f7a44', awning: ['#4f7a44', '#f4ecd8']},
  librairie: {sign: 'LIBRAIRIE', front: '#253f6a', awning: ['#253f6a', '#efe6cf']},
  epicerie: {sign: 'ÉPICERIE', front: '#8a2f28', awning: ['#a8322b', '#f2e8d2']},
  cafe: {sign: 'CAFÉ DE PARIS', front: '#2a1f1a', awning: ['#9b2a24', '#f2e6cf']},
  boutique: {sign: 'BOUTIQUE', front: '#1d1d1f', awning: ['#1d1d1f', '#d9cfb8']},
  fromagerie: {sign: 'FROMAGERIE', front: '#b8913a', awning: ['#b8913a', '#f6efda']},
} as const;
export type ShopKind = keyof typeof SHOP_KINDS;

export type ShopProps = {kind?: ShopKind; width?: number; depth?: number; floors?: number; stone?: string; lit?: number; display?: boolean};

/** Parisian shop with painted front, lettered sign, striped awning and its display. Origin at the ground, front facing -z. */
export const Shop: React.FC<ShopProps> = ({kind = 'boulangerie', width = 8, depth = 9, floors = 2, stone = PAL.cream, lit = 0, display = true}) => {
  const k = SHOP_KINDS[kind] ?? SHOP_KINDS.boulangerie;
  const ground = 4.2;
  const wallH = ground + floors * 3.1;
  const front = -depth / 2;
  const stripes = Math.max(4, Math.round(width / 0.6));
  const cols = Math.max(2, Math.floor(width / 2.4));
  return (
    <group>
      <Block p={[0, wallH / 2, 0]} s={[width, wallH, depth]} c={stone} />
      {/* painted shopfront */}
      <Block p={[0, 1.8, front - 0.08]} s={[width - 0.3, 3.6, 0.16]} c={k.front} />
      <Block p={[-width * 0.18, 1.55, front - 0.17]} s={[width * 0.52, 2.5, 0.04]} c={lit > 0.3 ? PAL.glass : '#7f93a4'} e={PAL.glassLit} ei={lit * 1.1} />
      <Block p={[width * 0.3, 1.25, front - 0.17]} s={[1.0, 2.3, 0.05]} c="#2a1f1a" />
      <Block p={[width * 0.3, 1.3, front - 0.2]} s={[0.7, 1.6, 0.02]} c={lit > 0.3 ? PAL.glass : '#7f93a4'} e={PAL.glassLit} ei={lit * 0.8} />
      <Sign text={k.sign} w={width - 0.8} h={0.62} p={[0, 3.25, front - 0.18]} bg={k.front} lit={lit} />
      {/* striped awning */}
      <group position={[0, 2.85, front - 0.2]} rotation={[-0.42, 0, 0]}>
        {Array.from({length: stripes}, (_, i) => (
          <Block key={i} p={[-width / 2 + 0.15 + (i + 0.5) * ((width - 0.3) / stripes), 0, -0.75]} s={[(width - 0.3) / stripes, 0.05, 1.5]} c={k.awning[i % 2]} />
        ))}
        <Block p={[0, -0.12, -1.5]} s={[width - 0.3, 0.22, 0.04]} c={k.awning[0]} />
      </group>
      {/* upper floors */}
      {Array.from({length: floors}, (_, f) => Array.from({length: cols}, (_, c) => {
        const x = -width / 2 + ((c + 0.5) * width) / cols;
        const y = ground + f * 3.1 + 1.5;
        const on = lit > 0 && (f * 7 + c * 3) % 5 < 3;
        return (
          <group key={`${f}${c}`} position={[x, y, front - 0.04]}>
            <Block p={[0, 0, 0]} s={[1.15, 2.0, 0.08]} c={PAL.frame} />
            <Block p={[0, 0, -0.03]} s={[0.92, 1.76, 0.05]} c={on ? PAL.glassLit : PAL.glass} e={PAL.glassLit} ei={on ? 1 : 0} />
            <Block p={[0, -1.05, -0.12]} s={[1.3, 0.1, 0.25]} c={PAL.iron} />
          </group>
        );
      }))}
      <Block p={[0, wallH - 0.2, front - 0.2]} s={[width + 0.1, 0.4, 0.4]} c={stone} />
      <mesh position={[0, wallH, 0]} scale={[width, 2.6, depth]} geometry={MANSARD}><Mat color={PAL.zinc} /></mesh>
      {/* the display in front of the shop */}
      {display && kind === 'pharmacie' && (
        <group position={[width / 2 - 0.4, 3.4, front - 0.6]}>
          <Block p={[0, 0, 0.3]} s={[0.06, 0.06, 0.6]} c={PAL.iron} />
          <Block p={[0, 0, 0]} s={[0.12, 0.62, 0.2]} c="#2fbf6a" e="#2fbf6a" ei={0.6 + lit} />
          <Block p={[0, 0, 0]} s={[0.12, 0.2, 0.62]} c="#2fbf6a" e="#2fbf6a" ei={0.6 + lit} />
        </group>
      )}
      {display && (kind === 'fleuriste' || kind === 'epicerie' || kind === 'fromagerie') && [-1, 0, 1].map((i) => (
        <group key={i} position={[-width * 0.18 + i * 1.1, 0, front - 0.75]}>
          <Block p={[0, 0.35, 0]} s={[0.9, 0.7, 0.6]} c={PAL.wood} />
          {Array.from({length: 6}, (_, j) => (
            <Ball key={j} p={[-0.3 + (j % 3) * 0.3, 0.78, -0.15 + Math.floor(j / 3) * 0.3]} rad={0.13} detail={0}
              c={kind === 'fleuriste' ? ['#d9546b', '#f0c24a', '#e8e2f0', '#c04a8a'][(i + j) & 3] : kind === 'fromagerie' ? '#e8c46a' : ['#d24a2a', '#e8b23a', '#7aa84a'][(i + j) % 3]} />
          ))}
        </group>
      ))}
      {display && kind === 'cafe' && [-1, 1].map((s) => (
        <group key={s} position={[s * width * 0.28, 0, front - 1.1]}>
          <Cyl p={[0, 0.72, 0]} rad={0.32} h={0.04} c="#d7bd8e" />
          <Cyl p={[0, 0.36, 0]} rad={0.03} h={0.72} c={PAL.iron} />
          {[-1, 1].map((c) => <Block key={c} p={[c * 0.5, 0.45, 0]} s={[0.36, 0.05, 0.36]} c="#9b2a24" />)}
        </group>
      ))}
      {display && kind === 'boulangerie' && <Block p={[-width * 0.18, 0.55, front - 0.32]} s={[width * 0.5, 0.25, 0.2]} c="#d9a24a" />}
    </group>
  );
};
