import React from 'react';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {END} from './TextOverlay';
import {heightAt, minuteAt} from './Scene3D';

const GOLD = '#F6E05E';
const RED = '#FF4D3D';

/** Same safe zone as MarcGeant: below the app tabs, left of the buttons. */
export const HUD_TOP = 300;

const fr = (n: number, digits = 0) => n.toLocaleString('fr-FR', {maximumFractionDigits: digits, minimumFractionDigits: digits});
const SUP: Record<string, string> = {'-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'};
const UNITS: [number, string][] = [[1, 'm'], [1e-2, 'cm'], [1e-3, 'mm'], [1e-6, 'µm'], [1e-9, 'nm']];

/** Picks the largest unit that keeps the value at or above 1 (0.21 nm stays in nm). */
const withUnit = (v: number, units: [number, string][]) => {
  const [scale, name] = units.find(([s]) => v >= s) ?? units[units.length - 1];
  const x = v / scale;
  return `${fr(x, x < 1 ? 2 : x < 100 ? 1 : 0)} ${name}`;
};
export const formatHeight = (m: number) => withUnit(m, UNITS);

const formatWeight = (minute: number) => {
  const g = 75000 / Math.pow(8, minute);
  if (g >= 1e-12) return withUnit(g, [[1000, 'kg'], [1, 'g'], [1e-3, 'mg'], [1e-6, 'µg'], [1e-9, 'ng'], [1e-12, 'pg']]);
  const e = Math.floor(Math.log10(g));
  return `${fr(g / Math.pow(10, e), 1)} × 10${String(e).split('').map((d) => SUP[d]).join('')} g`;
};

const SMALLER_THAN: [number, string][] = [
  [1.2, 'UN ENFANT DE 6 ANS'], [0.33, 'UN PIGEON'], [0.15, 'LE TROTTOIR'], [0.0233, 'UNE PIÈCE DE 1 €'],
  [0.005, 'UNE FOURMI'], [0.0006, 'UN GRAIN DE SABLE'], [7e-5, 'UN CHEVEU'], [8e-6, 'UN GLOBULE ROUGE'],
  [2.2e-6, 'UNE BACTÉRIE'], [4e-7, 'LA LUMIÈRE VISIBLE'], [1e-7, 'UN VIRUS'], [2e-9, "L'ADN"],
];
const smallerThan = (h: number) => {
  let out = '';
  for (const [size, name] of SMALLER_THAN) if (h < size) out = name;
  return out;
};

export const Hud: React.FC<{t: number}> = ({t}) => {
  const alpha = smooth(0.2, 0.7, t) * (1 - smooth(END - 0.4, END, t));
  if (alpha <= 0) return null;
  const minute = Math.floor(minuteAt(t) + 0.02);
  const h = heightAt(t);
  const atom = h < 3e-10;
  const small = smallerThan(h);
  // Log scale: a human (1.8 m) on the left, an atom on the right.
  const progress = Math.log(1.8 / h) / Math.log(1.8 / 2.1e-10);

  return (
    <div style={{
      position: 'absolute', top: HUD_TOP, left: 56, right: 176,
      fontFamily: SERIF, color: GOLD, opacity: alpha,
      textShadow: '0 2px 12px rgba(0,0,0,0.85)',
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
        {(small || atom) && (
          <div style={{marginTop: 6}}>
            <span style={{fontSize: 19, letterSpacing: '0.12em', opacity: 0.7}}>{atom ? 'TAILLE D\'' : 'PLUS PETIT QUE '}</span>
            <span style={{fontSize: 24, color: RED}}>{atom ? 'UN ATOME' : small}</span>
          </div>
        )}
      </div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: 6}}>
        <div style={{fontSize: 30, fontWeight: 'bold', color: RED}}>÷2</div>
        <div style={{fontSize: 17, letterSpacing: '0.12em', opacity: 0.8}}>CHAQUE MINUTE</div>
        <div style={{width: 160, height: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 6, overflow: 'hidden', marginTop: 6}}>
          <div style={{width: `${Math.max(2, Math.min(1, progress) * 100)}%`, height: '100%', background: GOLD, borderRadius: 6}} />
        </div>
        <div style={{fontSize: 17, letterSpacing: '0.1em', opacity: 0.75}}>🧍 → ⚛️</div>
      </div>
    </div>
  );
};
