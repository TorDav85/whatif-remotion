import React from 'react';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {APPEAR, BRIGHT, COAST_END, CRASH, ECLIPSES, PULL, RINGS, moonGapKm, tideAt} from './Scene3D';
import {END} from './TextOverlay';

const GOLD = '#F6E05E';
const MOON = '#CFE0FF';

/** Same safe zone as the other Marc videos: below the app tabs, left of the buttons. */
export const HUD_TOP = 300;

const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

/** Story day shown in the corner. */
const dayAt = (t: number) => {
  if (t < 32.4) return 1;
  if (t < 40) return 2;
  if (t < PULL[0]) return 3;
  if (t < CRASH) return Math.round(3 + 17 * smooth(PULL[0], CRASH - 0.5, t));
  if (t < RINGS[0]) return 20;
  return Math.round(20 + 7 * smooth(RINGS[0], RINGS[1], t));
};

/** One stat line that changes with each consequence. */
const statAt = (t: number): [string, string] | null => {
  if (t >= 15.2 && t < BRIGHT) return ['DISTANCE', '384 400 km'];
  if (t >= BRIGHT && t < 32.4) return ['LUMIÈRE LA NUIT', '×2'];
  if (t >= 32.4 && t < COAST_END) return ['MARÉE À SAINT-MALO', `${fr(tideAt(t))} m`];
  if (t >= 40 && t < PULL[0]) return ["ÉCLIPSES AUJOURD'HUI", String(ECLIPSES.filter((e) => t >= e - 0.2).length)];
  if (t >= PULL[0] && t < CRASH) return ['ÉCART ENTRE LES LUNES', `${fr(moonGapKm(t))} km`];
  if (t >= CRASH && t < RINGS[0]) return ['DEUXIÈME LUNE', 'DÉTRUITE 💥'];
  if (t >= RINGS[0]) return ['NOUVEAU', 'DES ANNEAUX 🪐'];
  return null;
};

export const Hud: React.FC<{t: number}> = ({t}) => {
  const alpha = smooth(5.0, 5.6, t) * (1 - smooth(END - 0.4, END, t));
  if (alpha <= 0) return null;
  const moons = t < APPEAR ? '1 🌕' : t < CRASH ? '2 🌕🌕' : '1 🌕 + 🪐';
  const stat = statAt(t);
  const day = dayAt(t);
  return (
    <div style={{
      position: 'absolute', top: HUD_TOP, left: 56, right: 176,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.85)',
    }}>
      <div style={{fontSize: 21, letterSpacing: '0.18em', opacity: 0.8}}>JOUR</div>
      <div style={{fontSize: 52, fontWeight: 'bold', color: '#fff', lineHeight: 1.05}}>{String(day).padStart(2, '0')}</div>
      <div style={{marginTop: 8}}>
        <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>LUNES </span>
        <span style={{fontSize: 30, color: MOON}}>{moons}</span>
      </div>
      {stat && (
        <div style={{marginTop: 10}}>
          <div style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>{stat[0]}</div>
          <div style={{fontSize: 64, fontWeight: 'bold', color: '#fff', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums'}}>{stat[1]}</div>
          {t >= 32.4 && t < COAST_END && <div style={{fontSize: 22, color: GOLD, marginTop: 4}}>— HIER : 13 m</div>}
        </div>
      )}
    </div>
  );
};
