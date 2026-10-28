import React, {useMemo} from 'react';
import {Block, MANSARD, Mat, PAL, PRISM, seeded} from './kit';

export type BuildingProps = {
  /** largeur de façade (m) */
  width?: number;
  depth?: number;
  /** étages au-dessus du rez-de-chaussée (5 = typique haussmannien) */
  floors?: number;
  stone?: string;
  roof?: string;
  /** store de la boutique / du café au rez-de-chaussée, ou aucun */
  awning?: string | null;
  /** part des fenêtres allumées (0..1) */
  lit?: number;
  /** graine : change la répartition des fenêtres allumées et des cheminées */
  seed?: number;
};

const FLOOR_H = 3.1;
const GROUND_H = 4.2;

/**
 * Immeuble haussmannien : rez-de-chaussée commercial, balcons filants aux 2e et 5e étages,
 * corniche, toit mansardé en zinc avec lucarnes, souches de cheminée. Origine au sol, façade vers -z.
 */
export const Building: React.FC<BuildingProps> = ({
  width = 14,
  depth = 12,
  floors = 5,
  stone = PAL.cream,
  roof = PAL.zinc,
  awning = '#a8322b',
  lit = 0,
  seed = 1,
}) => {
  const cols = Math.max(2, Math.floor(width / 2.6));
  const wallH = GROUND_H + floors * FLOOR_H;
  const front = -depth / 2;
  const r = useMemo(() => {
    const rnd = seeded(seed);
    return {
      lit: Array.from({length: floors * cols}, () => rnd()),
      chim: Array.from({length: 3}, () => 0.15 + rnd() * 0.7),
    };
  }, [seed, floors, cols]);
  const colX = (c: number) => -width / 2 + ((c + 0.5) * width) / cols;

  return (
    <group>
      {/* murs, soubassement, bandeau du rez-de-chaussée */}
      <Block p={[0, wallH / 2, 0]} s={[width, wallH, depth]} c={stone} />
      <Block p={[0, GROUND_H / 2, front - 0.06]} s={[width, GROUND_H, 0.12]} c={PAL.stoneDark} />
      <Block p={[0, GROUND_H + 0.15, front - 0.15]} s={[width, 0.3, 0.3]} c={stone} />
      {/* vitrines et porte cochère */}
      {Array.from({length: cols}, (_, c) =>
        c === Math.floor(cols / 2) ? (
          <Block key={c} p={[colX(c), 1.9, front - 0.13]} s={[1.9, 3.6, 0.06]} c="#3a2a22" />
        ) : (
          <Block key={c} p={[colX(c), 1.85, front - 0.13]} s={[(width / cols) * 0.78, 2.9, 0.06]} c={PAL.glass} e={PAL.glassLit} ei={lit * 0.9} />
        ),
      )}
      {awning && (
        <Block p={[0, GROUND_H - 0.6, front - 0.9]} s={[width - 1, 0.08, 1.8]} r={[-0.35, 0, 0]} c={awning} />
      )}
      {/* fenêtres des étages : hautes, encadrées */}
      {Array.from({length: floors}, (_, f) =>
        Array.from({length: cols}, (_, c) => {
          const y = GROUND_H + f * FLOOR_H + 1.55;
          const on = r.lit[f * cols + c] < lit;
          return (
            <group key={`${f}${c}`} position={[colX(c), y, front - 0.04]}>
              <Block p={[0, 0, 0]} s={[1.25, 2.15, 0.08]} c={PAL.frame} />
              <Block p={[0, 0, -0.03]} s={[1.0, 1.9, 0.06]} c={on ? PAL.glassLit : PAL.glass} e={PAL.glassLit} ei={on ? 1.1 : 0} />
              <Block p={[0, 1.2, -0.07]} s={[1.4, 0.16, 0.14]} c={stone} />
            </group>
          );
        }),
      )}
      {/* balcons filants (2e et dernier étage) : dalle + garde-corps en fonte */}
      {[1, floors - 1].filter((f, i, a) => f > 0 && a.indexOf(f) === i).map((f) => {
        const y = GROUND_H + f * FLOOR_H + 0.45;
        return (
          <group key={f}>
            <Block p={[0, y, front - 0.45]} s={[width - 0.4, 0.16, 0.9]} c={stone} />
            <Block p={[0, y + 0.5, front - 0.88]} s={[width - 0.4, 0.85, 0.04]} c={PAL.iron} o={0.85} />
            <Block p={[0, y + 0.95, front - 0.88]} s={[width - 0.4, 0.06, 0.08]} c={PAL.iron} />
          </group>
        );
      })}
      {/* corniche */}
      <Block p={[0, wallH - 0.25, front - 0.25]} s={[width + 0.2, 0.5, 0.5]} c={stone} />
      {/* toit mansardé + lucarnes */}
      <mesh position={[0, wallH, 0]} scale={[width, 4.2, depth]} geometry={MANSARD}>
        <Mat color={roof} />
      </mesh>
      {Array.from({length: cols}, (_, c) => (
        <group key={c} position={[colX(c) * 0.86, wallH + 1.3, front + 1.0]}>
          <Block p={[0, 0, 0]} s={[1.0, 1.5, 0.9]} c={stone} />
          <Block p={[0, 0, -0.46]} s={[0.7, 1.1, 0.04]} c={PAL.glass} e={PAL.glassLit} ei={r.lit[c] < lit * 0.6 ? 1 : 0} />
          <mesh position={[0, 0.75, 0]} scale={[1.2, 0.6, 1.1]} geometry={PRISM}>
            <Mat color={roof} />
          </mesh>
        </group>
      ))}
      {/* souches de cheminée avec leurs pots */}
      {r.chim.map((k, i) => (
        <group key={i} position={[-width / 2 + k * width, wallH + 3.4, (i - 1) * depth * 0.25]}>
          <Block p={[0, 0.6, 0]} s={[1.6, 1.6, 0.7]} c={PAL.brick} />
          {[-0.5, 0, 0.5].map((x) => (
            <Block key={x} p={[x, 1.55, 0]} s={[0.18, 0.35, 0.18]} c={PAL.terracotta} />
          ))}
        </group>
      ))}
    </group>
  );
};

/** Hauteur totale d'un immeuble (utile pour aligner une rue). */
export const buildingHeight = (floors = 5) => GROUND_H + floors * FLOOR_H + 4.2;
