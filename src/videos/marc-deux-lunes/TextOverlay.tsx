import React from 'react';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {CRASH, DOGS} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const MOON = '#CFE0FF';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** The end card starts here. */
export const END = 79.4;

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|Julien|deuxième|lune|lunes|deux|Soleil|éclipses|marée|Saint-Malo|vingt-six|chiens|journal|anneaux|Saturne|mille|brise|frôlent)/i;

const Caption: React.FC<{text: string; alpha: number}> = ({text, alpha}) => (
  <div style={{
    position: 'absolute', top: 1180, left: 70, right: 170,
    textAlign: 'center', fontFamily: SANS, fontSize: 52, lineHeight: 1.2,
    color: '#fff', opacity: alpha, textShadow: SHADOW, WebkitTextStroke: '2px rgba(0,0,0,0.55)',
    transform: `scale(${0.94 + 0.06 * alpha})`,
  }}>
    {text.split(' ').map((w, i) => (
      <span key={i} style={{color: KEYWORDS.test(w.replace(/^\.+/, '')) ? GOLD : '#fff'}}>{w} </span>
    ))}
  </div>
);

/** Comic sound word, popping in with a tilt. */
const Pop: React.FC<{t: number; at: number; text: string; color: string; top: number; size?: number}> = ({t, at, text, color, top, size = 120}) => {
  const a = fadeAlpha(at - 0.05, at + 1.6, t, 0.08, 0.4);
  if (a <= 0) return null;
  return (
    <div style={{
      position: 'absolute', top, left: 0, right: 110, textAlign: 'center', fontFamily: SANS, fontSize: size,
      color, textShadow: SHADOW, WebkitTextStroke: '5px #222', opacity: a,
      transform: `scale(${0.7 + 0.5 * smooth(at, at + 0.2, t)}) rotate(-6deg)`,
    }}>
      {text}
    </div>
  );
};

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const hook = fadeAlpha(0.1, 4.8, t, 0.15, 0.3);
  const beat = voice.beats.find((b) => b.id !== 'hook' && t >= b.start - 0.1 && t < b.end + 0.35);
  return (
    <>
      {hook > 0 && (
        <div style={{
          position: 'absolute', top: 640, left: 60, right: 150, textAlign: 'center',
          fontFamily: SANS, fontSize: 70, lineHeight: 1.12, color: '#fff', opacity: hook,
          textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
          transform: `scale(${1.15 - 0.15 * smooth(0.1, 0.5, t)})`,
        }}>
          ET SI <span style={{color: GOLD}}>MARC</span><br />VOYAIT UNE<br /><span style={{color: MOON}}>DEUXIÈME LUNE</span> ?
          <div style={{fontSize: 44, color: GOLD, marginTop: 14}}>MÊME TAILLE, MÊME DISTANCE 🌕🌕</div>
        </div>
      )}
      {beat && t < END && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      <Pop t={t} at={DOGS} text="AOUUUH !" color="#fff" top={700} />
      <Pop t={t} at={CRASH} text="BOUM !" color="#FFB347" top={680} size={150} />
      <div style={{
        position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center',
        fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW,
        opacity: smooth(0.5, 1, t) * (1 - smooth(END - 0.4, END, t)),
      }}>
        Scénario fictif · deux lunes sur la même orbite ne resteraient pas stables longtemps
      </div>
    </>
  );
};

/** End card: the dilemma, then subscribe. */
export const EndCard: React.FC<{t: number}> = ({t}) => {
  const a = smooth(END, END + 0.4, t);
  if (a <= 0) return null;
  const s = (d: number) => smooth(END + d, END + d + 0.35, t);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: `rgba(6,10,26,${a * 0.88})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW, paddingBottom: 200,
    }}>
      <div style={{fontSize: 30, letterSpacing: '0.16em', opacity: s(0.1) * 0.85}}>TOI, TU CHOISIS QUOI ?</div>
      <div style={{fontSize: 74, color: GOLD, textAlign: 'center', lineHeight: 1.15, marginTop: 18, opacity: s(0.1),
        transform: `scale(${1.2 - 0.2 * s(0.1)})`}}>
        DEUX LUNES 🌕🌕<br /><span style={{fontSize: 44, color: '#fff'}}>OU</span><br />DES ANNEAUX 🪐
      </div>
      <div style={{
        marginTop: 56, fontSize: 48, color: '#1A1A1A', background: GOLD, padding: '20px 48px', borderRadius: 60,
        opacity: s(0.5), transform: `scale(${(0.8 + 0.2 * s(0.5)) * (1 + 0.05 * Math.sin(t * 8))})`,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)', textShadow: 'none',
      }}>
        🔔 ABONNE-TOI
      </div>
    </div>
  );
};
