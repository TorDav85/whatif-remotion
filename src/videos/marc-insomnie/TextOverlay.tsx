import React from 'react';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {CAR_BLINK, FORGET, GARDNER, MORPH, RAT, RULER, END as SCENE_END, blackoutAt} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const NIGHT_BLUE = '#AFC4FF';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** The end card starts here. */
export const END = SCENE_END;

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|Julien|dort|jamais|invincible|clés|micro-sommeils|seconde|trente|hallucine|homme|onze|record|Gardner|quatorze|rat|semaines|souris|ménage|connexions|lit)/i;

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

/** Comic word, popping in with a tilt. */
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

/** Floating Zzz over the sleeper in 1964. */
const Zzz: React.FC<{t: number}> = ({t}) => {
  if (t < GARDNER + 0.5 || t >= RAT - 0.2) return null;
  return (
    <>
      {[0, 1, 2].map((i) => {
        const k = ((t - GARDNER) * 0.5 + i / 3) % 1;
        return (
          <div key={i} style={{position: 'absolute', left: 520 + 90 * k + i * 10, top: 860 - 260 * k, fontFamily: SANS, fontSize: 50 + 40 * k,
            color: '#fff', opacity: Math.sin(Math.PI * k), textShadow: SHADOW}}>Z</div>
        );
      })}
    </>
  );
};

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const hook = fadeAlpha(0.1, 4.7, t, 0.15, 0.3);
  const beat = voice.beats.find((b) => b.id !== 'hook' && t >= b.start - 0.1 && t < b.end + 0.35);
  const black = blackoutAt(t);
  const carBlink = t >= CAR_BLINK - 0.1 && t < CAR_BLINK + 1.2;
  return (
    <>
      {hook > 0 && (
        <div style={{
          position: 'absolute', top: 360, left: 60, right: 150, textAlign: 'center',
          fontFamily: SANS, fontSize: 70, lineHeight: 1.12, color: '#fff', opacity: hook,
          textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
          transform: `scale(${1.15 - 0.15 * smooth(0.1, 0.5, t)})`,
        }}>
          ET SI <span style={{color: GOLD}}>MARC</span><br />NE DORMAIT<br /><span style={{color: NIGHT_BLUE}}>PLUS JAMAIS</span> ?
          <div style={{fontSize: 46, color: GOLD, marginTop: 14, opacity: smooth(2.2, 2.6, t)}}>0 MINUTE. JAMAIS. 👁️👁️</div>
        </div>
      )}
      {beat && t < END && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      {/* Micro-sleep black screens */}
      {black > 0.5 && (
        <div style={{position: 'absolute', top: 900, left: 0, right: 110, textAlign: 'center', fontFamily: 'Consolas, monospace', fontSize: 40,
          color: 'rgba(255,255,255,0.75)', letterSpacing: '0.2em'}}>
          {carBlink ? '1 SECONDE…' : 'MICRO-SOMMEIL'}
        </div>
      )}
      <Pop t={t} at={FORGET} text="… ?" color="#fff" top={620} size={140} />
      <Pop t={t} at={RULER + 0.3} text="30 m À L'AVEUGLE" color="#FFD23A" top={1040} size={70} len={2.4} />
      <Pop t={t} at={MORPH + 0.6} text="!!" color="#FF4040" top={560} size={130} />
      {t >= GARDNER && t < RAT && (
        <div style={{position: 'absolute', top: 980, right: 150, fontFamily: SANS, fontSize: 64, color: '#5a3a1a', border: '6px solid #5a3a1a',
          padding: '4px 18px', transform: 'rotate(-8deg)', opacity: fadeAlpha(GARDNER + 0.2, RAT, t) * 0.85}}>
          1964
        </div>
      )}
      <Zzz t={t} />
      <div style={{
        position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center',
        fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW,
        opacity: smooth(0.5, 1, t) * (1 - smooth(END - 0.4, END, t)),
      }}>
        Scénario fictif · ne tente pas de rester éveillé
      </div>
    </>
  );
};

/** End card: the question, then subscribe. */
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
      <div style={{fontSize: 30, letterSpacing: '0.16em', opacity: s(0.1) * 0.85}}>CETTE NUIT, TU AS DORMI…</div>
      <div style={{fontSize: 66, color: GOLD, textAlign: 'center', lineHeight: 1.15, marginTop: 18, opacity: s(0.1),
        transform: `scale(${1.2 - 0.2 * s(0.1)})`}}>
        MOINS DE 6 h 😵<br /><span style={{fontSize: 44, color: '#fff'}}>OU</span><br />PLUS DE 8 h 😴
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
