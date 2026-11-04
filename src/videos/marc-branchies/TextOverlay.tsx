import React from 'react';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {BATH, HEAVY, LITRES, OXYGEN, SPLASH, END as SCENE_END} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const AQUA = '#8FE0FF';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** The end card starts here. */
export const END = SCENE_END;

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|eau|étouffer|branchies|Seine|trente|oxygène|cinquante|litres|baignoire|trois|huit|lourde|épuise|dix|froide|sang|refroidit|quinze|chaleur|poissons|froid|poisson|poumons)/i;

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

const Pop: React.FC<{t: number; at: number; text: string; color: string; top: number; size?: number; len?: number}> = ({t, at, text, color, top, size = 120, len = 1.4}) => {
  const a = fadeAlpha(at - 0.05, at + len, t, 0.08, 0.4);
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

const CubeLabels: React.FC<{t: number}> = ({t}) => {
  if (t < OXYGEN || t >= LITRES) return null;
  const a = fadeAlpha(OXYGEN + 0.3, LITRES, t);
  const style: React.CSSProperties = {position: 'absolute', top: 1060, width: 320, textAlign: 'center', fontFamily: SANS, fontSize: 34, opacity: a, textShadow: SHADOW};
  return (
    <>
      <div style={{...style, left: 110, color: '#DCEBFF'}}>1 L D'AIR<div style={{fontSize: 26, color: GOLD}}>30 ●</div></div>
      <div style={{...style, left: 560, color: AQUA}}>1 L D'EAU<div style={{fontSize: 26, color: GOLD}}>1 ●</div></div>
    </>
  );
};

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const hook = fadeAlpha(0.1, 4.7, t, 0.15, 0.3);
  const beat = voice.beats.find((b) => b.id !== 'hook' && t >= b.start - 0.1 && t < b.end + 0.35);
  return (
    <>
      {hook > 0 && (
        <div style={{
          position: 'absolute', top: 360, left: 60, right: 150, textAlign: 'center',
          fontFamily: SANS, fontSize: 70, lineHeight: 1.12, color: '#fff', opacity: hook,
          textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
          transform: `scale(${1.15 - 0.15 * smooth(0.1, 0.5, t)})`,
        }}>
          ET SI <span style={{color: GOLD}}>MARC</span><br />RESPIRAIT<br /><span style={{color: AQUA}}>SOUS L'EAU</span> ?
          <div style={{fontSize: 44, color: GOLD, marginTop: 14, opacity: smooth(2.2, 2.6, t)}}>… ET Y ÉTOUFFAIT 🫧</div>
        </div>
      )}
      {beat && t < END && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      <Pop t={t} at={SPLASH} text="PLOUF !" color="#fff" top={620} size={140} />
      <CubeLabels t={t} />
      {t >= BATH + 0.6 && t < HEAVY - 0.2 && (
        <div style={{position: 'absolute', top: 640, left: 0, right: 110, textAlign: 'center', fontFamily: 'Consolas, monospace', fontSize: 44,
          color: '#fff', textShadow: SHADOW, opacity: fadeAlpha(BATH + 0.6, HEAVY - 0.2, t)}}>
          ⏩ × 60
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center',
        fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW,
        opacity: smooth(0.5, 1, t) * (1 - smooth(END - 0.4, END, t)),
      }}>
        Scénario fictif · ne saute jamais dans la Seine
      </div>
    </>
  );
};

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
      <div style={{fontSize: 66, color: GOLD, textAlign: 'center', lineHeight: 1.15, marginTop: 18, opacity: s(0.1),
        transform: `scale(${1.2 - 0.2 * s(0.1)})`}}>
        VIVRE SOUS L'EAU 🐟<br /><span style={{fontSize: 44, color: '#fff'}}>OU</span><br />GARDER TES POUMONS 🌬️
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
