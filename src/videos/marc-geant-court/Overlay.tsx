import React from 'react';
import {smooth} from '../../core/animation';
import captions from './captions.json';
import {wordTime} from '../../shared/captions/CaptionTrack';
import {SAFE} from '../../shared/ui/PlatformSafeArea';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const RED = '#FF4D3D';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';

/** Hook: the rule and the problem in one look, for the first seconds only. */
export const Hook: React.FC<{t: number}> = ({t}) => {
  const a = Math.min(smooth(0.05, 0.25, t), 1 - smooth(4.0, 4.4, t));
  if (a <= 0) return null;
  const problem = smooth(2.2, 2.45, t);
  return (
    <div style={{
      position: 'absolute', top: 760, left: SAFE.left, right: SAFE.right - 20, textAlign: 'center',
      fontFamily: SANS, fontSize: 80, lineHeight: 1.1, color: '#fff', opacity: a,
      textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
      transform: `scale(${1.12 - 0.12 * smooth(0.05, 0.4, t)})`,
    }}>
      <span style={{color: GOLD}}>×2</span> CHAQUE<br />MINUTE
      <div style={{fontSize: 60, color: RED, marginTop: 18, opacity: problem, transform: `scale(${1.3 - 0.3 * problem})`}}>
        SON CORPS<br />NE SUIT PAS
      </div>
    </div>
  );
};

/** Square-cube law, row by row when the voice says each word. */
const ROWS: {word: RegExp; label: string; value: string; color: string}[] = [
  {word: /^taille/i, label: 'TAILLE', value: '×2', color: '#fff'},
  {word: /^huit/i, label: 'POIDS', value: '×8', color: RED},
  {word: /^quatre/i, label: 'OS', value: '×4', color: GOLD},
];
export const Law: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0.01) return null;
  let after = 10;
  const rows = ROWS.map((r) => {
    const at = wordTime(captions, r.word, after) ?? after;
    after = at;
    return {...r, at};
  });
  return (
    <div style={{
      position: 'absolute', top: 700, left: 90, right: 190, opacity: alpha,
      background: 'rgba(10,10,14,0.66)', borderRadius: 28, padding: '28px 40px',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW,
    }}>
      {rows.map((r) => {
        const k = smooth(r.at - 0.1, r.at + 0.2, t);
        return (
          <div key={r.label} style={{display: 'flex', justifyContent: 'space-between', fontSize: 58, opacity: k, transform: `translateX(${(1 - k) * 40}px)`}}>
            <span>{r.label}</span><span style={{color: r.color}}>{r.value}</span>
          </div>
        );
      })}
    </div>
  );
};

/** The single call to action: one question that continues the story. */
export const EndQuestion: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0.01) return null;
  const k = smooth(41.9, 42.3, t);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: `rgba(6,8,16,${0.55 * alpha})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 260,
    }}>
      <div style={{
        fontFamily: SANS, fontSize: 82, lineHeight: 1.1, color: '#fff', textAlign: 'center', opacity: k * alpha,
        textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)', transform: `scale(${1.15 - 0.15 * k})`,
        padding: `0 ${SAFE.right}px 0 ${SAFE.left}px`,
      }}>
        TU L'ARRÊTERAIS<br />À QUELLE <span style={{color: GOLD}}>MINUTE</span>{' '}?
      </div>
    </div>
  );
};
