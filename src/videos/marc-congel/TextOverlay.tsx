import React from 'react';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {MINUTES, SNEEZE, STEP, T0} from './Scene3D';
import {tempColor} from './Hud';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const ICE_BLUE = '#7FD3FF';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** The end card starts here. */
export const END = 82.4;

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|Julien|congélateur|degrés|quarante|minute|frigo|Sibérie|grelotte|chocolat|cheveux|glaçon|Mars|blanc|yeux|selfie|azote|sèche-cheveux|micro-ondes)/i;

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

/** "−40°" stamp with the new temperature each time it drops. */
const Drop: React.FC<{t: number}> = ({t}) => {
  const i = MINUTES.filter((at) => t >= at).length - 1;
  if (i < 0 || t > MINUTES[i] + 1.3) return null;
  const k = (t - MINUTES[i]) / 1.3;
  const c = T0 - STEP * (i + 1);
  return (
    <div style={{
      position: 'absolute', top: 740, right: 120, textAlign: 'right', fontFamily: SANS,
      textShadow: SHADOW, WebkitTextStroke: '4px rgba(0,0,0,0.5)',
      opacity: Math.min(1, k * 6) * (1 - smooth(0.6, 1, k)), transform: `scale(${0.6 + 0.4 * smooth(0, 0.25, k)}) rotate(-8deg)`,
    }}>
      <div style={{fontSize: 120, color: ICE_BLUE}}>−40°</div>
      <div style={{fontSize: 60, color: tempColor(c)}}>{String(c).replace('-', '−')} °C</div>
    </div>
  );
};

/** Comic "ATCHOUM !" when Marc sneezes. */
const Sneeze: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(SNEEZE - 0.05, SNEEZE + 1.4, t, 0.08, 0.4);
  if (a <= 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 640, left: 0, right: 110, textAlign: 'center', fontFamily: SANS, fontSize: 120,
      color: '#fff', textShadow: SHADOW, WebkitTextStroke: '5px #222', opacity: a,
      transform: `scale(${0.7 + 0.5 * smooth(SNEEZE, SNEEZE + 0.2, t)}) rotate(-6deg)`,
    }}>
      ATCHOUM !
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
          ET SI <span style={{color: GOLD}}>MARC</span><br />FINISSAIT AU<br /><span style={{color: ICE_BLUE}}>CONGÉLATEUR</span> ?
          <div style={{fontSize: 44, color: GOLD, marginTop: 14}}>4 °C, −40° CHAQUE MINUTE ❄️</div>
        </div>
      )}
      {beat && t < END && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      <Drop t={t} />
      <Sneeze t={t} />
      <div style={{
        position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center',
        fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW,
        opacity: smooth(0.5, 1, t) * (1 - smooth(END - 0.4, END, t)),
      }}>
        Scénario fictif et absurde · dans la vraie vie, on ne se décongèle pas au sèche-cheveux
      </div>
    </>
  );
};

/** End card: the punchline, then subscribe. */
export const EndCard: React.FC<{t: number}> = ({t}) => {
  const a = smooth(END, END + 0.4, t);
  if (a <= 0) return null;
  const s = (d: number) => smooth(END + d, END + d + 0.35, t);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: `rgba(6,12,24,${a * 0.9})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW, paddingBottom: 200,
    }}>
      <div style={{fontSize: 30, letterSpacing: '0.16em', opacity: s(0.1) * 0.85}}>DE 4 °C À −196 °C</div>
      <div style={{fontSize: 70, color: GOLD, textAlign: 'center', lineHeight: 1.1, marginTop: 18, opacity: s(0.1),
        transform: `scale(${1.2 - 0.2 * s(0.1)})`}}>
        PROCHAINE FOIS :<br />LE MICRO-ONDES 😬
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
