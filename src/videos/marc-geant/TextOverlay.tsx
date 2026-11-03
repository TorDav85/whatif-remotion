import React from 'react';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {GROWTH_TIMES} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const RED = '#FF4D3D';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|Minute|doublait|minute|bus|téléphone|problème|huit|quatre|trembler|Eiffel|maquette|avions|air|Terre|Lune|bille|partirais)/i;

const Caption: React.FC<{text: string; alpha: number}> = ({text, alpha}) => (
  <div style={{
    position: 'absolute', top: 1180, left: 70, right: 170,
    textAlign: 'center', fontFamily: SANS, fontSize: 52, lineHeight: 1.2,
    color: '#fff', opacity: alpha, textShadow: SHADOW, WebkitTextStroke: '2px rgba(0,0,0,0.55)',
    transform: `scale(${0.94 + 0.06 * alpha})`,
  }}>
    {text.split(' ').map((w, i) => (
      <span key={i} style={{color: KEYWORDS.test(w) ? GOLD : '#fff'}}>{w} </span>
    ))}
  </div>
);

/** Rotating call to action, always on screen above the app's caption area. */
const CTAS: {from: number; to: number; text: string}[] = [
  {from: 0.6, to: 9, text: '👀 Devine à quelle minute il touche la Lune'},
  {from: 9, to: 20, text: '➕ Abonne-toi pour plus de « Et si »'},
  {from: 20, to: 33, text: '💬 Ton pronostic en commentaire'},
  {from: 33, to: 47, text: '📤 Envoie ça à ton pote le plus grand'},
  {from: 47, to: 61, text: '⏸️ Pause : tu fuis à quelle minute ?'},
  {from: 61, to: 79, text: '🔔 Partie 2 : et s\'il rétrécissait ?'},
];

const CtaPill: React.FC<{t: number}> = ({t}) => {
  const c = CTAS.find((x) => t >= x.from && t < x.to);
  if (!c) return null;
  const a = fadeAlpha(c.from, c.to, t, 0.3, 0.3);
  const pop = 1 + 0.06 * Math.max(0, 1 - (t - c.from) / 0.3);
  return (
    <div style={{position: 'absolute', bottom: 430, left: 0, right: 110, display: 'flex', justifyContent: 'center', opacity: a}}>
      <div style={{
        fontFamily: SANS, fontSize: 28, color: '#1A1A1A', background: GOLD,
        padding: '14px 28px', borderRadius: 40, transform: `scale(${pop})`,
        boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
      }}>
        {c.text}
      </div>
    </div>
  );
};

/** Big "×2" stamp on each doubling. */
const Doubling: React.FC<{t: number}> = ({t}) => {
  const at = [...GROWTH_TIMES].reverse().find((g) => t >= g);
  if (at === undefined || t > at + 1.1 || t > 79) return null;
  const k = (t - at) / 1.1;
  return (
    <div style={{
      position: 'absolute', top: 760, right: 190, fontFamily: SANS, fontSize: 130, color: RED,
      textShadow: SHADOW, WebkitTextStroke: '4px rgba(0,0,0,0.5)',
      opacity: Math.min(1, k * 6) * (1 - smooth(0.6, 1, k)), transform: `scale(${1.5 - 0.5 * smooth(0, 0.25, k)}) rotate(-8deg)`,
    }}>
      ×2
    </div>
  );
};

/** Square-cube law, row by row while the voice explains it. */
const LAW: {at: number; label: string; value: string; color: string}[] = [
  {at: 25.5, label: 'TAILLE', value: '×2', color: '#fff'},
  {at: 27.6, label: 'POIDS', value: '×8', color: RED},
  {at: 30.4, label: 'OS', value: '×4', color: GOLD},
];
const Law: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(25.3, 33, t, 0.3, 0.4);
  if (a <= 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 760, left: 90, right: 190, opacity: a,
      background: 'rgba(10,10,14,0.62)', borderRadius: 28, padding: '26px 36px',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW,
    }}>
      {LAW.map((l) => {
        const k = smooth(l.at, l.at + 0.3, t);
        return (
          <div key={l.label} style={{display: 'flex', justifyContent: 'space-between', fontSize: 50, opacity: k, transform: `translateX(${(1 - k) * 40}px)`}}>
            <span>{l.label}</span><span style={{color: l.color}}>{l.value}</span>
          </div>
        );
      })}
      <div style={{fontSize: 26, marginTop: 12, opacity: smooth(31.2, 31.6, t) * 0.85, textAlign: 'center'}}>
        Ses jambes ne tiendraient pas 😬
      </div>
    </div>
  );
};

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const hook = fadeAlpha(0.1, 3.5, t, 0.15, 0.3);
  const beat = voice.beats.find((b) => b.id !== 'hook' && b.id !== 'cta' && t >= b.start - 0.1 && t < b.end + 0.35);
  return (
    <>
      {hook > 0 && (
        <div style={{
          position: 'absolute', top: 760, left: 60, right: 150, textAlign: 'center',
          fontFamily: SANS, fontSize: 76, lineHeight: 1.12, color: '#fff', opacity: hook,
          textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
          transform: `scale(${1.15 - 0.15 * smooth(0.1, 0.5, t)})`,
        }}>
          ET SI <span style={{color: GOLD}}>MARC</span><br />DOUBLAIT DE TAILLE<br /><span style={{color: RED}}>CHAQUE MINUTE</span> ?
        </div>
      )}
      {beat && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      <Doubling t={t} />
      <Law t={t} />
      <div style={{
        position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center',
        fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW,
        opacity: smooth(0.5, 1, t) * (1 - smooth(79, 79.4, t)),
      }}>
        Scénario fictif · tailles calculées : 1,80 m × 2 par minute
      </div>
      <CtaPill t={t} />
    </>
  );
};

export const EndCard: React.FC<{t: number}> = ({t}) => {
  const a = smooth(79.2, 79.7, t);
  if (a <= 0) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, background: `rgba(6,8,16,${a * 0.92})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW, paddingBottom: 200,
    }}>
      <div style={{fontSize: 74, color: GOLD, textAlign: 'center', lineHeight: 1.1, opacity: smooth(79.4, 79.8, t),
        transform: `scale(${1.2 - 0.2 * smooth(79.4, 79.8, t)})`}}>
        À QUELLE MINUTE<br />TU FUIS ?
      </div>
      <div style={{fontSize: 38, marginTop: 28, opacity: smooth(79.9, 80.3, t)}}>💬 Réponds en commentaire</div>
      <div style={{
        marginTop: 48, fontSize: 38, color: '#1A1A1A', background: GOLD, padding: '18px 40px', borderRadius: 50,
        opacity: smooth(80.4, 80.8, t), transform: `scale(${1 + 0.05 * Math.sin(t * 8)})`,
      }}>
        ➕ ABONNE-TOI
      </div>
      <div style={{fontSize: 30, marginTop: 34, opacity: smooth(80.9, 81.3, t) * 0.9, textAlign: 'center', lineHeight: 1.4}}>
        Partie 2 : et si Marc rétrécissait ?
      </div>
    </div>
  );
};
