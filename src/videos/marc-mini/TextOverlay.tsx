import React from 'react';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {BLUR, SHRINK_TIMES} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const RED = '#FF4D3D';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** The end card (and its single call to action) starts here. */
export const END = 80.6;

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|Minute|rétrécissait|enfant|pigeon|falaise|huit|quatre|pièce|bouclier|fourmi|chien|rocher|cheveu|tronc|bactérie|lumière|rien|atome)/i;

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

/** Big "÷2" stamp on each halving. */
const Halving: React.FC<{t: number}> = ({t}) => {
  const at = [...SHRINK_TIMES].reverse().find((g) => t >= g);
  if (at === undefined || t > at + 1.1 || t > END) return null;
  const k = (t - at) / 1.1;
  return (
    <div style={{
      position: 'absolute', top: 760, right: 120, fontFamily: SANS, fontSize: 130, color: RED,
      textShadow: SHADOW, WebkitTextStroke: '4px rgba(0,0,0,0.5)',
      opacity: Math.min(1, k * 6) * (1 - smooth(0.6, 1, k)), transform: `scale(${0.6 + 0.4 * smooth(0, 0.25, k)}) rotate(-8deg)`,
    }}>
      ÷2
    </div>
  );
};

/** Square-cube law, row by row while the voice explains it. */
const LAW: {at: number; label: string; value: string; color: string}[] = [
  {at: 25.5, label: 'TAILLE', value: '÷2', color: '#fff'},
  {at: 27.3, label: 'POIDS', value: '÷8', color: GOLD},
  {at: 29.6, label: 'FORCE', value: '÷4', color: RED},
];
const Law: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(25.3, 33, t, 0.3, 0.4);
  if (a <= 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 600, left: 90, right: 190, opacity: a,
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
      <div style={{fontSize: 26, marginTop: 12, opacity: smooth(31.0, 31.4, t) * 0.9, textAlign: 'center'}}>
        À sa taille, il devient 2× plus fort 💪
      </div>
    </div>
  );
};

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const hook = fadeAlpha(0.1, 3.5, t, 0.15, 0.3);
  const beat = voice.beats.find((b) => b.id !== 'hook' && b.id !== 'cta' && t >= b.start - 0.1 && t < b.end + 0.35);
  const sem = smooth(BLUR[2], BLUR[2] + 0.4, t) * (1 - smooth(END - 0.4, END, t));
  return (
    <>
      {hook > 0 && (
        <div style={{
          position: 'absolute', top: 760, left: 60, right: 150, textAlign: 'center',
          fontFamily: SANS, fontSize: 76, lineHeight: 1.12, color: '#fff', opacity: hook,
          textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
          transform: `scale(${1.15 - 0.15 * smooth(0.1, 0.5, t)})`,
        }}>
          ET SI <span style={{color: GOLD}}>MARC</span><br />RÉTRÉCISSAIT<br /><span style={{color: RED}}>CHAQUE MINUTE</span> ?
        </div>
      )}
      {beat && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      <Halving t={t} />
      <Law t={t} />
      {sem > 0 && (
        <div style={{
          position: 'absolute', top: 1080, left: 0, right: 110, textAlign: 'center', opacity: sem * 0.85,
          fontFamily: SANS, fontSize: 20, letterSpacing: '0.14em', color: '#fff', textShadow: SHADOW,
        }}>
          VUE AU MICROSCOPE ÉLECTRONIQUE
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center',
        fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW,
        opacity: smooth(0.5, 1, t) * (1 - smooth(END - 0.4, END, t)),
      }}>
        Scénario fictif · tailles calculées : 1,80 m ÷ 2 par minute
      </div>
    </>
  );
};

/** The only call to action of the video: subscribe, on the end card. */
export const EndCard: React.FC<{t: number}> = ({t}) => {
  const a = smooth(END, END + 0.5, t);
  if (a <= 0) return null;
  const s = (d: number) => smooth(END + d, END + d + 0.4, t);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: `rgba(6,8,16,${a * 0.92})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW, paddingBottom: 200,
    }}>
      <div style={{fontSize: 30, letterSpacing: '0.16em', opacity: s(0.2) * 0.85}}>DE 1,80 M À 0,2 NM</div>
      <div style={{fontSize: 80, color: GOLD, textAlign: 'center', lineHeight: 1.1, marginTop: 18, opacity: s(0.2),
        transform: `scale(${1.2 - 0.2 * s(0.2)})`}}>
        JUSQU'À<br />L'ATOME ⚛️
      </div>
      <div style={{
        marginTop: 64, fontSize: 52, color: '#1A1A1A', background: GOLD, padding: '22px 52px', borderRadius: 60,
        opacity: s(0.6), transform: `scale(${(0.8 + 0.2 * s(0.6)) * (1 + 0.05 * Math.sin(t * 8))})`,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)', textShadow: 'none',
      }}>
        🔔 ABONNE-TOI
      </div>
      <div style={{fontSize: 30, marginTop: 30, opacity: s(1.0) * 0.9, textAlign: 'center', lineHeight: 1.4}}>
        pour la prochaine expérience
      </div>
    </div>
  );
};
