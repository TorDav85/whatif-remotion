import React from 'react';
import {Ball, Block, Cyl, PAL} from '../kit';

// Chambre. La tête de lit est côté +z, le pied du lit vers -z.

/** Lit double : sommier, matelas, couette, oreillers, tête de lit. */
export const Bed: React.FC<{wood?: string; sheet?: string; duvet?: string; width?: number}> = ({wood = '#8a6440', sheet = '#f2f0ea', duvet = '#3a6f9e', width = 1.6}) => (
  <group>
    <Block p={[0, 0.2, 0]} s={[width + 0.08, 0.25, 2.08]} c={wood} />
    <Block p={[0, 0.4, 0]} s={[width, 0.18, 2.0]} c={sheet} />
    <Block p={[0, 0.5, -0.25]} s={[width + 0.04, 0.08, 1.4]} c={duvet} />
    <Block p={[0, 0.47, -0.95]} s={[width + 0.06, 0.3, 0.06]} c={duvet} />
    {(width > 1.2 ? [-1, 1] : [0]).map((s) => (
      <Block key={s} p={[s * width * 0.24, 0.55, 0.75]} s={[width > 1.2 ? width * 0.42 : width * 0.8, 0.14, 0.4]} r={[-0.15, 0, 0]} c={PAL.white} />
    ))}
    <Block p={[0, 0.6, 1.05]} s={[width + 0.12, 1.0, 0.08]} c={wood} />
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Block key={`${sx}${sz}`} p={[sx * (width / 2), 0.04, sz * 0.98]} s={[0.07, 0.08, 0.07]} c={wood} />))}
  </group>
);

/** Lit simple (lit d'enfant). */
export const SingleBed: React.FC<{wood?: string; duvet?: string}> = ({wood = '#c9b08a', duvet = '#e8b83a'}) => (
  <Bed wood={wood} duvet={duvet} width={0.9} />
);

/** Table de chevet à tiroir. */
export const Nightstand: React.FC<{wood?: string}> = ({wood = '#8a6440'}) => (
  <group>
    <Block p={[0, 0.27, 0]} s={[0.45, 0.5, 0.4]} c={wood} />
    <Block p={[0, 0.53, 0]} s={[0.48, 0.03, 0.43]} c={wood} />
    <Block p={[0, 0.36, -0.202]} s={[0.4, 0.18, 0.01]} c="#7a5634" />
    <Ball p={[0, 0.36, -0.215]} rad={0.015} c={PAL.chrome} detail={0} />
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Block key={`${sx}${sz}`} p={[sx * 0.19, 0.01, sz * 0.16]} s={[0.04, 0.04, 0.04]} c={wood} />))}
  </group>
);

/** Lampe de chevet (à poser sur une table de chevet). */
export const BedsideLamp: React.FC<{shade?: string; lit?: number}> = ({shade = '#efe3c8', lit = 0}) => (
  <group>
    <Ball p={[0, 0.1, 0]} rad={0.08} s={[1, 1.2, 1]} c="#3f6b8a" />
    <Cyl p={[0, 0.24, 0]} rad={0.01} h={0.12} c={PAL.chrome} metal />
    <mesh position={[0, 0.34, 0]}>
      <cylinderGeometry args={[0.08, 0.13, 0.17, 12, 1, true]} />
      <meshStandardMaterial color={shade} emissive="#ffcf80" emissiveIntensity={lit * 1.2} side={2} flatShading />
    </mesh>
    {lit > 0 && <pointLight position={[0, 0.3, 0]} intensity={lit * 1.2} distance={3} color="#ffcf80" />}
  </group>
);

/** Armoire deux portes. */
export const Wardrobe: React.FC<{wood?: string}> = ({wood = '#7a5a3c'}) => (
  <group>
    <Block p={[0, 1.0, 0]} s={[1.2, 2.0, 0.6]} c={wood} />
    <Block p={[0, 2.03, 0]} s={[1.26, 0.06, 0.64]} c={wood} />
    <Block p={[0, 1.0, -0.302]} s={[0.008, 1.9, 0.01]} c="#4a3420" />
    {[-1, 1].map((s) => (
      <React.Fragment key={s}>
        <Block p={[s * 0.3, 1.0, -0.305]} s={[0.44, 1.75, 0.01]} c="#6a4c30" />
        <Block p={[s * 0.06, 1.05, -0.32]} s={[0.02, 0.18, 0.02]} c="#c9a45a" metal />
      </React.Fragment>
    ))}
  </group>
);

/** Commode trois tiroirs, avec une photo encadrée et une boîte. */
export const Dresser: React.FC<{wood?: string; front?: string}> = ({wood = '#8a6440', front = '#efe9dc'}) => (
  <group>
    <Block p={[0, 0.45, 0]} s={[1.0, 0.85, 0.5]} c={wood} />
    <Block p={[0, 0.89, 0]} s={[1.04, 0.04, 0.54]} c={wood} />
    {[0.2, 0.46, 0.72].map((y) => (
      <React.Fragment key={y}>
        <Block p={[0, y, -0.252]} s={[0.92, 0.22, 0.01]} c={front} />
        <Block p={[0, y, -0.265]} s={[0.16, 0.025, 0.02]} c="#c9a45a" metal />
      </React.Fragment>
    ))}
    <Block p={[-0.25, 1.02, 0.05]} s={[0.2, 0.24, 0.02]} r={[-0.15, 0.2, 0]} c="#2a2a2a" />
    <Block p={[-0.25, 1.02, 0.039]} s={[0.15, 0.18, 0.005]} r={[-0.15, 0.2, 0]} c="#9cc3e6" />
    <Block p={[0.25, 0.95, 0]} s={[0.22, 0.08, 0.16]} c="#b8322a" />
  </group>
);

/** Miroir sur pied. */
export const StandingMirror: React.FC<{frame?: string}> = ({frame = '#c9a45a'}) => (
  <group rotation={[-0.08, 0, 0]}>
    <Block p={[0, 0.85, 0]} s={[0.55, 1.6, 0.04]} c={frame} metal />
    <Block p={[0, 0.85, -0.022]} s={[0.47, 1.52, 0.01]} c="#cfe0ea" metal />
    {[-1, 1].map((s) => (
      <Block key={s} p={[s * 0.2, 0.02, 0.15]} s={[0.04, 0.04, 0.4]} c={frame} />
    ))}
  </group>
);
