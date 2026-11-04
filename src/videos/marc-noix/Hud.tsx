import React from 'react';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {BALANCE, CASE, CROW, DENSE, FAMILY, NEURONS, PUNCH, SKULL, TIME, brainGrams, neuronsBillions} from './Scene3D';

const GOLD = '#F6E05E';

/** Same safe zone as the other Marc videos: below the app tabs, left of the buttons. */
export const HUD_TOP = 300;

const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

const statAt = (t: number): [string, string, string?] | null => {
  if (t < NEURONS) return ['CERVEAU', `${fr(brainGrams(t))} g`, t >= SKULL ? 'AVANT : 1 350 g' : undefined];
  if (t < BALANCE) return ['NEURONES', fr(neuronsBillions(t) * 1e9), 'AVANT : 86 MILLIARDS'];
  if (t < CROW) return ['CERVELET', '≈ 80 % DES NEURONES', 'ÉQUILIBRE : EN PANNE'];
  if (t < DENSE) return ['CERVEAU DE CORNEILLE', '≈ 10 g', 'OUTILS · VISAGES'];
  if (t < CASE) return ['À MASSE ÉGALE', '× 2 NEURONES', 'OISEAU CONTRE SINGE'];
  if (t < FAMILY) return ['MARSEILLE · 2007', 'THE LANCET', 'IRM (SCHÉMA)'];
  if (t < TIME) return ['UNE VIE', 'NORMALE', 'MARIÉ · 2 ENFANTS · UN EMPLOI'];
  if (t < PUNCH) return ['ADAPTATION', 'DES DÉCENNIES', 'MARC : 1 NUIT'];
  return null;
};

export const Hud: React.FC<{t: number}> = ({t}) => {
  const alpha = smooth(SKULL + 0.2, SKULL + 0.8, t) * (1 - smooth(PUNCH - 0.4, PUNCH, t));
  if (alpha <= 0) return null;
  const stat = statAt(t);
  if (!stat) return null;
  return (
    <div style={{
      position: 'absolute', top: HUD_TOP, left: 56, right: 176,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.85)',
    }}>
      <div style={{fontSize: 21, letterSpacing: '0.18em', opacity: 0.8}}>{stat[0]}</div>
      <div style={{fontSize: stat[1].length > 14 ? 44 : 60, fontWeight: 'bold', color: '#fff', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums'}}>{stat[1]}</div>
      {stat[2] && <div style={{fontSize: 24, marginTop: 4}}>{stat[2]}</div>}
    </div>
  );
};
