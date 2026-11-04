import React from 'react';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {DENSE, CASE, FALL, HOOK_TOOL, LOOK, LOST, PUNCH, WALNUT, END as SCENE_END} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const PINK = '#FFB3C0';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** The end card starts here. */
export const END = SCENE_END;

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|Julien|noix|cent|crâne|flotte|quatre-vingt-six|milliards|milliard|mots|cervelet|corneille|outils|visages|deux|Marseille|fine|enfants|dizaines|nuit|taille|temps)/i;

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

/** Labels under the two cubes. */
const CubeLabels: React.FC<{t: number}> = ({t}) => {
  if (t < DENSE || t >= CASE) return null;
  const a = fadeAlpha(DENSE + 0.3, CASE, t);
  const style: React.CSSProperties = {position: 'absolute', top: 1060, width: 300, textAlign: 'center', fontFamily: SANS, fontSize: 36, opacity: a, textShadow: SHADOW};
  return (
    <>
      <div style={{...style, left: 120, color: '#C8BEFF'}}>SINGE</div>
      <div style={{...style, left: 560, color: GOLD}}>CORNEILLE</div>
    </>
  );
};

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const hook = fadeAlpha(0.1, 4.7, t, 0.15, 0.3);
  const beat = voice.beats.find((b) => b.id !== 'hook' && t >= b.start - 0.1 && t < b.end + 0.35);
  const stamp = smooth(PUNCH + 0.3, PUNCH + 0.6, t) * (1 - smooth(END - 0.3, END, t));
  return (
    <>
      {hook > 0 && (
        <div style={{
          position: 'absolute', top: 340, left: 60, right: 150, textAlign: 'center',
          fontFamily: SANS, fontSize: 66, lineHeight: 1.12, color: '#fff', opacity: hook,
          textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
          transform: `scale(${1.15 - 0.15 * smooth(0.1, 0.5, t)})`,
        }}>
          ET SI LE CERVEAU<br />DE <span style={{color: GOLD}}>MARC</span> TENAIT<br />DANS <span style={{color: PINK}}>UNE NOIX</span> ?
        </div>
      )}
      {beat && t < END && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      <Pop t={t} at={WALNUT + 0.3} text="🌰 = 🧠" color="#fff" top={1000} size={80} len={3} />
      <Pop t={t} at={LOST + 0.6} text="… ?" color="#fff" top={1000} size={120} len={2} />
      <Pop t={t} at={FALL + 0.4} text="BOUM !" color="#FFB347" top={600} size={140} />
      <Pop t={t} at={HOOK_TOOL + 0.3} text="✓ OUTIL" color="#7CFC8A" top={600} size={90} />
      <Pop t={t} at={LOOK + 0.4} text="✓ TON VISAGE" color="#7CFC8A" top={600} size={80} len={2} />
      <CubeLabels t={t} />
      {stamp > 0 && (
        <div style={{position: 'absolute', top: 520, left: 60, right: 150, textAlign: 'center', fontFamily: SANS, fontSize: 60, lineHeight: 1.1,
          color: GOLD, textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)', opacity: stamp, transform: `scale(${1.4 - 0.4 * stamp}) rotate(-3deg)`}}>
          LA TAILLE<br />COMPTE MOINS<br />QUE LE TEMPS
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center',
        fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW,
        opacity: smooth(0.5, 1, t) * (1 - smooth(END - 0.4, END, t)),
      }}>
        Scénario fictif · un cerveau ne peut pas rétrécir ainsi
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
      <div style={{fontSize: 30, letterSpacing: '0.16em', opacity: s(0.1) * 0.85}}>TU ÉCHANGERAIS ?</div>
      <div style={{fontSize: 66, color: GOLD, textAlign: 'center', lineHeight: 1.15, marginTop: 18, opacity: s(0.1),
        transform: `scale(${1.2 - 0.2 * s(0.1)})`}}>
        TON CERVEAU 🧠<br /><span style={{fontSize: 44, color: '#fff'}}>CONTRE</span><br />CELUI D'UNE<br />CORNEILLE 🐦
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
