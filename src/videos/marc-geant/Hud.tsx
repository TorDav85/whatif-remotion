import React from 'react';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {heightAt, minuteAt} from './Scene3D';

const GOLD = '#F6E05E';
const RED = '#FF4D3D';

/** Same safe zone as AsteroideParis: below the app tabs, left of the buttons. */
export const HUD_TOP = 300;

const fr = (n: number, digits = 0) => n.toLocaleString('fr-FR', {maximumFractionDigits: digits, minimumFractionDigits: digits});
export const formatHeight = (m: number) => {
  if (m < 10) return `${fr(m, 2)} m`;
  if (m < 1000) return `${fr(m, m < 100 ? 1 : 0)} m`;
  return `${fr(m / 1000, m < 100000 ? 1 : 0)} km`;
};

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const formatWeight = (minute: number) => {
  const kg = 75 * Math.pow(8, minute);
  if (kg >= 5.97e24) return `${fr(kg / 5.97e24, kg < 5.97e25 ? 1 : 0)} × la Terre`;
  if (kg >= 7.35e21) return `${fr(kg / 7.35e22, 2)} × la Lune`;
  if (kg < 1000) return `${fr(kg)} kg`;
  const t = kg / 1000;
  if (t < 1e6) return `${fr(t)} t`;
  if (t < 1e9) return `${fr(t / 1e6, 1)} million${t >= 2e6 ? 's' : ''} de t`;
  if (t < 1e12) return `${fr(t / 1e9, 1)} milliard${t >= 2e9 ? 's' : ''} de t`;
  const e = Math.floor(Math.log10(t));
  return `${fr(t / Math.pow(10, e), 1)} × 10${String(e).split('').map((d) => SUP[+d]).join('')} t`;
};

const BIGGER_THAN: [number, string][] = [
  [3, 'UN BUS'], [5.5, 'UNE GIRAFE'], [12, 'UNE MAISON'], [25, 'UN IMMEUBLE'], [50, "L'ARC DE TRIOMPHE"],
  [330, 'LA TOUR EIFFEL'], [828, 'BURJ KHALIFA'], [8849, "L'EVEREST"], [11000, 'LES AVIONS'],
  [100000, "L'ATMOSPHÈRE"], [12742000, 'LA TERRE'],
];
const biggerThan = (h: number) => {
  let out = '';
  for (const [size, name] of BIGGER_THAN) if (h >= size) out = name;
  return out;
};

export const Hud: React.FC<{t: number}> = ({t}) => {
  const alpha = smooth(0.2, 0.7, t) * (1 - smooth(79, 79.5, t));
  if (alpha <= 0) return null;
  const n = minuteAt(t);
  const minute = Math.floor(n + 0.02);
  const h = heightAt(t);
  const big = biggerThan(h);
  // Log scale: a human (1.8 m) on the left, the Moon's distance on the right.
  const progress = Math.log(h / 1.8) / Math.log(384400000 / 1.8);

  return (
    <div style={{
      position: 'absolute', top: HUD_TOP, left: 56, right: 176,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.8)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div>
        <div style={{fontSize: 21, letterSpacing: '0.18em', opacity: 0.8}}>MINUTE</div>
        <div style={{fontSize: 64, fontWeight: 'bold', color: '#fff', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums'}}>
          {String(minute).padStart(2, '0')}
        </div>
        <div style={{marginTop: 8}}>
          <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>TAILLE </span>
          <span style={{fontSize: 32, color: '#fff'}}>{formatHeight(h)}</span>
        </div>
        <div style={{marginTop: 6}}>
          <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>POIDS </span>
          <span style={{fontSize: 28}}>{formatWeight(minute)}</span>
        </div>
        {big && (
          <div style={{marginTop: 6}}>
            <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>PLUS GRAND QUE </span>
            <span style={{fontSize: 24, color: RED}}>{big}</span>
          </div>
        )}
      </div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: 6}}>
        <div style={{fontSize: 30, fontWeight: 'bold', color: RED}}>×2</div>
        <div style={{fontSize: 17, letterSpacing: '0.12em', opacity: 0.8}}>CHAQUE MINUTE</div>
        <div style={{width: 160, height: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 6, overflow: 'hidden', marginTop: 6}}>
          <div style={{width: `${Math.max(2, progress * 100)}%`, height: '100%', background: GOLD, borderRadius: 6}} />
        </div>
        <div style={{fontSize: 17, letterSpacing: '0.1em', opacity: 0.75}}>🧍 → 🌕</div>
      </div>
    </div>
  );
};
