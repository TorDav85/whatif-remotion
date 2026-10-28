import React from 'react';
import {Block, CYL, Mat, PAL} from './kit';

export type CarProps = {
  color?: string;
  variant?: 'berline' | 'citadine' | 'taxi' | 'utilitaire';
  /** phares allumés (0..1) */
  lights?: number;
  /** rotation des roues (radians), pour une voiture qui roule */
  wheelSpin?: number;
};

const Wheel: React.FC<{p: [number, number, number]; r: number; spin: number}> = ({p, r, spin}) => (
  <group position={p} rotation={[spin, 0, 0]}>
    <mesh rotation={[0, 0, Math.PI / 2]} scale={[r * 2, 0.24, r * 2]} geometry={CYL}>
      <Mat color={PAL.tire} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} scale={[r * 1.1, 0.26, r * 1.1]} geometry={CYL}>
      <Mat color={PAL.rim} metal />
    </mesh>
  </group>
);

/** Voiture low-poly, origine au sol, avant vers -z. */
export const Car: React.FC<CarProps> = ({color = '#b8322a', variant = 'berline', lights = 0, wheelSpin = 0}) => {
  const small = variant === 'citadine';
  const van = variant === 'utilitaire';
  const L = small ? 3.6 : van ? 4.8 : 4.4;
  const W = small ? 1.65 : 1.8;
  const body = variant === 'taxi' ? '#1d1d1f' : color;
  const r = small ? 0.3 : 0.34;
  const bodyTop = van ? 2.0 : 0.95;
  const cabinLen = small ? 2.1 : van ? 1.4 : 2.3;
  const cabinZ = small ? 0.15 : van ? -L / 2 + 0.9 : 0.2;
  const wz = L / 2 - (small ? 0.65 : 0.8);

  return (
    <group>
      {/* caisse */}
      <Block p={[0, (0.32 + bodyTop) / 2, van ? 0.35 : 0]} s={[W, bodyTop - 0.32, van ? L - 0.7 : L]} c={body} />
      {/* capot plus bas que la caisse (sauf utilitaire) */}
      {van && <Block p={[0, 0.65, -L / 2 + 0.4]} s={[W, 0.66, 0.8]} c={body} />}
      {/* habitacle vitré + toit */}
      {!van && (
        <>
          <Block p={[0, bodyTop + 0.27, cabinZ]} s={[W - 0.14, 0.54, cabinLen]} c={PAL.glass} />
          <Block p={[0, bodyTop + 0.57, cabinZ + 0.05]} s={[W - 0.1, 0.07, cabinLen - 0.25]} c={body} />
          {/* montants */}
          {[-1, 1].map((s) => (
            <Block key={s} p={[s * (W / 2 - 0.08), bodyTop + 0.27, cabinZ]} s={[0.05, 0.54, 0.12]} c={body} />
          ))}
        </>
      )}
      {van && <Block p={[0, 1.55, -L / 2 + 0.95]} s={[W - 0.1, 0.65, 0.12]} c={PAL.glass} />}
      {/* pare-chocs, phares, feux */}
      <Block p={[0, 0.42, -L / 2 - 0.03]} s={[W - 0.1, 0.16, 0.08]} c={PAL.chrome} metal />
      <Block p={[0, 0.42, L / 2 + 0.03]} s={[W - 0.1, 0.16, 0.08]} c={PAL.chrome} metal />
      {[-1, 1].map((s) => (
        <React.Fragment key={s}>
          <Block p={[s * (W / 2 - 0.25), 0.72, -L / 2 - 0.02]} s={[0.32, 0.14, 0.05]} c={PAL.light} e={PAL.light} ei={lights * 2} />
          <Block p={[s * (W / 2 - 0.22), 0.75, L / 2 + 0.02]} s={[0.26, 0.12, 0.05]} c={PAL.tail} e={PAL.tail} ei={lights * 1.5} />
          {/* rétroviseurs */}
          {!van && <Block p={[s * (W / 2 + 0.06), bodyTop + 0.1, cabinZ - cabinLen / 2 + 0.15]} s={[0.12, 0.08, 0.14]} c={body} />}
        </React.Fragment>
      ))}
      {variant === 'taxi' && (
        <>
          <Block p={[0, bodyTop + 0.69, cabinZ]} s={[0.55, 0.16, 0.22]} c={PAL.white} e="#6fe08a" ei={0.6} />
          <Block p={[0, 0.66, 0]} s={[W + 0.01, 0.06, L * 0.6]} c={PAL.white} />
        </>
      )}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Wheel key={`${sx}${sz}`} p={[sx * (W / 2 - 0.05), r, sz * wz]} r={r} spin={wheelSpin} />))}
    </group>
  );
};

/** Bus parisien (vert et blanc, sans logo), origine au sol, avant vers -z. */
export const Bus: React.FC<{color?: string; lights?: number; wheelSpin?: number}> = ({color = '#3f7f62', lights = 0, wheelSpin = 0}) => {
  const L = 12;
  const W = 2.5;
  return (
    <group>
      <Block p={[0, 1.15, 0]} s={[W, 1.5, L]} c={color} />
      <Block p={[0, 2.35, 0]} s={[W, 0.9, L]} c={PAL.white} />
      {/* bandeau vitré continu */}
      {[-1, 1].map((s) => (
        <Block key={s} p={[s * (W / 2 + 0.01), 2.3, 0.3]} s={[0.02, 0.75, L - 1.6]} c={PAL.glass} />
      ))}
      <Block p={[0, 2.05, -L / 2 - 0.01]} s={[W - 0.2, 1.3, 0.02]} c={PAL.glass} />
      <Block p={[0, 2.95, -L / 2 + 0.1]} s={[1.4, 0.22, 0.05]} c="#1d1d1f" e="#ffb040" ei={0.8} />
      <Block p={[0, 2.9, 1]} s={[W - 0.2, 0.25, 3]} c={PAL.white} />
      {[-1, 1].map((s) => (
        <React.Fragment key={s}>
          <Block p={[s * (W / 2 - 0.3), 0.75, -L / 2 - 0.02]} s={[0.35, 0.16, 0.05]} c={PAL.light} e={PAL.light} ei={lights * 2} />
          <Block p={[s * (W / 2 - 0.25), 0.9, L / 2 + 0.02]} s={[0.25, 0.25, 0.05]} c={PAL.tail} e={PAL.tail} ei={lights * 1.5} />
        </React.Fragment>
      ))}
      {[-1, 1].flatMap((sx) => [-L / 2 + 2.4, L / 2 - 2.6].map((z) => <Wheel key={`${sx}${z}`} p={[sx * (W / 2 - 0.1), 0.48, z]} r={0.48} spin={wheelSpin} />))}
    </group>
  );
};
