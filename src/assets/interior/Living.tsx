import React from 'react';
import {Ball, Block, Cyl, PAL} from '../kit';

// Salon. Origine au sol, au centre ; l'avant (côté où l'on s'assoit, l'écran…) regarde vers -z.

/** Canapé 3 places : assise, dossier, accoudoirs, coussins. */
export const Sofa: React.FC<{color?: string; cushion?: string; width?: number}> = ({color = '#4a6a8a', cushion = '#e8c45a', width = 2.2}) => (
  <group>
    <Block p={[0, 0.25, 0]} s={[width, 0.3, 0.9]} c={color} />
    <Block p={[0, 0.47, -0.05]} s={[width - 0.3, 0.14, 0.75]} c={color} />
    <Block p={[0, 0.65, 0.36]} s={[width, 0.6, 0.2]} c={color} />
    {[-1, 1].map((s) => (
      <Block key={s} p={[s * (width / 2 - 0.1), 0.5, 0]} s={[0.2, 0.4, 0.9]} c={color} />
    ))}
    {[-1, 1].map((s) => (
      <Block key={s} p={[s * (width / 2 - 0.45), 0.72, 0.22]} s={[0.4, 0.38, 0.12]} r={[-0.2, s * 0.15, 0]} c={cushion} />
    ))}
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Block key={`${sx}${sz}`} p={[sx * (width / 2 - 0.12), 0.05, sz * 0.35]} s={[0.07, 0.1, 0.07]} c={PAL.wood} />))}
  </group>
);

/** Fauteuil. */
export const Armchair: React.FC<{color?: string}> = ({color = '#b8322a'}) => (
  <group>
    <Block p={[0, 0.25, 0]} s={[0.9, 0.3, 0.85]} c={color} />
    <Block p={[0, 0.46, -0.05]} s={[0.62, 0.12, 0.7]} c={color} />
    <Block p={[0, 0.72, 0.33]} s={[0.9, 0.7, 0.18]} c={color} />
    {[-1, 1].map((s) => (
      <Block key={s} p={[s * 0.38, 0.52, 0]} s={[0.16, 0.36, 0.85]} c={color} />
    ))}
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Block key={`${sx}${sz}`} p={[sx * 0.36, 0.05, sz * 0.32]} s={[0.06, 0.1, 0.06]} c={PAL.wood} />))}
  </group>
);

/** Table basse avec un livre et une tasse. */
export const CoffeeTable: React.FC<{wood?: string}> = ({wood = '#8a6440'}) => (
  <group>
    <Block p={[0, 0.4, 0]} s={[1.1, 0.06, 0.6]} c={wood} />
    <Block p={[0, 0.12, 0]} s={[1.0, 0.03, 0.5]} c={wood} />
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Block key={`${sx}${sz}`} p={[sx * 0.5, 0.2, sz * 0.25]} s={[0.05, 0.4, 0.05]} c={wood} />))}
    <Block p={[-0.2, 0.45, 0.05]} s={[0.3, 0.04, 0.22]} r={[0, 0.3, 0]} c="#2b3a55" />
    <Cyl p={[0.25, 0.48, -0.05]} rad={0.045} h={0.1} c={PAL.white} />
  </group>
);

/** Meuble TV bas. */
export const TvStand: React.FC<{color?: string}> = ({color = '#3a3f47'}) => (
  <group>
    <Block p={[0, 0.25, 0]} s={[1.8, 0.45, 0.45]} c={color} />
    {[-0.45, 0.45].map((x) => (
      <Block key={x} p={[x, 0.25, -0.23]} s={[0.8, 0.36, 0.02]} c="#4a505a" />
    ))}
    {[-1, 1].map((s) => (
      <Block key={s} p={[s * 0.8, 0.015, 0]} s={[0.05, 0.03, 0.4]} c={PAL.iron} />
    ))}
  </group>
);

/** Téléviseur à écran plat sur pied. `on` : écran allumé (0..1), `screen` : couleur de l'image. */
export const Television: React.FC<{on?: number; screen?: string; size?: number}> = ({on = 0, screen = '#5a9ad6', size = 1.2}) => (
  <group>
    <Block p={[0, 0.02, 0]} s={[0.4, 0.03, 0.22]} c={PAL.iron} />
    <Block p={[0, 0.12, 0.02]} s={[0.06, 0.2, 0.04]} c={PAL.iron} />
    <Block p={[0, 0.22 + size * 0.29, 0.02]} s={[size, size * 0.58, 0.05]} c="#111316" />
    <Block p={[0, 0.22 + size * 0.29, -0.005]} s={[size - 0.05, size * 0.58 - 0.05, 0.01]} c={on ? screen : '#1a1e24'} e={screen} ei={on * 1.4} />
  </group>
);

/** Bibliothèque avec livres colorés. */
export const Bookshelf: React.FC<{wood?: string; width?: number; seed?: number}> = ({wood = '#7a5a3c', width = 1.2, seed = 3}) => {
  const cols = ['#b8322a', '#2b3a55', '#3f6b4a', '#d9a23a', '#e8e2d2', '#6d2440', '#3a6f9e'];
  return (
    <group>
      {[-1, 1].map((s) => (
        <Block key={s} p={[s * (width / 2 - 0.02), 1.0, 0]} s={[0.04, 2.0, 0.35]} c={wood} />
      ))}
      <Block p={[0, 1.0, 0.16]} s={[width, 2.0, 0.03]} c={wood} />
      {[0.02, 0.5, 0.98, 1.46, 1.98].map((y) => (
        <Block key={y} p={[0, y, 0]} s={[width, 0.04, 0.35]} c={wood} />
      ))}
      {[0.04, 0.52, 1.0, 1.48].map((y, row) =>
        Array.from({length: Math.floor(width / 0.07) - 3}, (_, i) => {
          const k = (i * 7 + row * 3 + seed) % 11;
          if (k === 5) return null; // un trou de temps en temps
          const h = 0.28 + ((i * 13 + row * 5 + seed) % 5) * 0.03;
          return <Block key={`${row}${i}`} p={[-width / 2 + 0.1 + i * 0.07, y + h / 2 + 0.02, -0.02]} s={[0.055, h, 0.24]} c={cols[(i + row * 2 + seed) % cols.length]} />;
        }),
      )}
    </group>
  );
};

/** Lampadaire : pied, tige, abat-jour. `lit` (0..1). */
export const FloorLamp: React.FC<{shade?: string; lit?: number}> = ({shade = '#efe3c8', lit = 0}) => (
  <group>
    <Cyl p={[0, 0.02, 0]} rad={0.18} h={0.04} c={PAL.iron} />
    <Cyl p={[0, 0.8, 0]} rad={0.015} h={1.55} c={PAL.iron} metal />
    <mesh position={[0, 1.65, 0]}>
      <cylinderGeometry args={[0.15, 0.24, 0.3, 12, 1, true]} />
      <meshStandardMaterial color={shade} emissive="#ffcf80" emissiveIntensity={lit * 1.2} side={2} flatShading />
    </mesh>
    {lit > 0 && <pointLight position={[0, 1.55, 0]} intensity={lit * 2} distance={5} color="#ffcf80" />}
  </group>
);

/** Tapis rectangulaire à bordure. */
export const Rug: React.FC<{color?: string; border?: string; w?: number; d?: number}> = ({color = '#a8322b', border = '#e8c45a', w = 2.4, d = 1.6}) => (
  <group>
    <Block p={[0, 0.005, 0]} s={[w, 0.01, d]} c={border} />
    <Block p={[0, 0.011, 0]} s={[w - 0.2, 0.01, d - 0.2]} c={color} />
    <Block p={[0, 0.017, 0]} s={[w * 0.4, 0.01, d * 0.4]} c={border} />
  </group>
);

/** Cheminée en marbre avec foyer (feu optionnel). */
export const Fireplace: React.FC<{marble?: string; fire?: number}> = ({marble = '#e8e2d2', fire = 0}) => (
  <group>
    <Block p={[0, 0.55, 0.1]} s={[1.5, 1.1, 0.4]} c={marble} />
    <Block p={[0, 1.12, 0.05]} s={[1.7, 0.08, 0.5]} c={marble} />
    <Block p={[0, 0.42, -0.08]} s={[0.8, 0.7, 0.05]} c="#1a1410" />
    <Block p={[0, 0.03, -0.25]} s={[1.6, 0.06, 0.4]} c="#9c8e74" />
    {[-0.15, 0.1].map((x) => (
      <Cyl key={x} p={[x, 0.14, -0.05]} rad={0.05} h={0.5} r={[0, 0.4, Math.PI / 2]} c={PAL.wood} />
    ))}
    {fire > 0 && (
      <>
        <Ball p={[0, 0.27, -0.06]} rad={0.14} s={[1, 1.4, 0.6]} c="#ff8a2a" e="#ff6a10" ei={fire * 2} detail={0} />
        <pointLight position={[0, 0.4, -0.4]} intensity={fire * 1.5} distance={4} color="#ff9a40" />
      </>
    )}
    {/* pendule et bougeoirs sur le manteau */}
    <Block p={[0, 1.3, 0.05]} s={[0.25, 0.3, 0.1]} c="#c9a45a" />
    {[-1, 1].map((s) => (
      <Cyl key={s} p={[s * 0.6, 1.24, 0.05]} rad={0.03} h={0.16} c="#c9a45a" metal />
    ))}
  </group>
);

/** Plante en pot (ficus). */
export const PottedPlant: React.FC<{pot?: string; leaves?: string; size?: number}> = ({pot = PAL.terracotta, leaves = '#4f7a34', size = 1}) => (
  <group scale={size}>
    <Cyl p={[0, 0.2, 0]} rad={0.2} h={0.4} c={pot} />
    <Cyl p={[0, 0.39, 0]} rad={0.18} h={0.02} c="#4a3a2a" />
    <Cyl p={[0, 0.7, 0]} rad={0.025} h={0.6} c={PAL.wood} />
    <Ball p={[0, 1.05, 0]} rad={0.35} c={leaves} detail={0} />
    <Ball p={[0.18, 0.88, 0.05]} rad={0.22} c={leaves} detail={0} />
    <Ball p={[-0.15, 0.92, -0.08]} rad={0.24} c="#3f6a2c" detail={0} />
  </group>
);
