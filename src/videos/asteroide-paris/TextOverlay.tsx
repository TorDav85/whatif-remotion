import React from 'react';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {IMPACT} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const RED = '#FF4D3D';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(astéroïde|Paris|Marc|Cent|Vingt|étoile|téléphones|dix|toi|flash|soleil|onde|Eiffel|partie|deux|Abonne-toi)/i;

const Caption: React.FC<{text: string; alpha: number}> = ({text, alpha}) => (
  <div style={{
    position: 'absolute', top: 1180, left: 70, right: 170,
    textAlign: 'center', fontFamily: SANS, fontSize: 54, lineHeight: 1.2,
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
  {from: 0.6, to: 7, text: '👀 Reste jusqu\'à l\'impact'},
  {from: 7, to: 14.6, text: '➕ Abonne-toi : partie 2 bientôt'},
  {from: 14.6, to: 22.2, text: '💬 Toi, tu ferais quoi en 10 s ?'},
  {from: 22.2, to: 29, text: '📤 Envoie ça à un Parisien'},
  {from: 29, to: 37.3, text: '🔔 Marc survit-il ? Partie 2'},
];

const CtaPill: React.FC<{t: number}> = ({t}) => {
  const c = CTAS.find((x) => t >= x.from && t < x.to);
  if (!c) return null;
  const a = fadeAlpha(c.from, c.to, t, 0.3, 0.3);
  const pop = 1 + 0.06 * Math.max(0, 1 - (t - c.from) / 0.3);
  return (
    <div style={{position: 'absolute', bottom: 430, left: 0, right: 110, display: 'flex', justifyContent: 'center', opacity: a}}>
      <div style={{
        fontFamily: SANS, fontSize: 30, color: '#1A1A1A', background: GOLD,
        padding: '14px 30px', borderRadius: 40, transform: `scale(${pop})`,
        boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
      }}>
        {c.text}
      </div>
    </div>
  );
};

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const hook = fadeAlpha(0.1, 3.1, t, 0.15, 0.3);
  const n = t >= 22.2 && t < IMPACT ? Math.ceil(IMPACT - t) : 0;
  const beat = voice.beats.find((b) => b.id !== 'hook' && b.id !== 'count' && t >= b.start - 0.1 && t < b.end + 0.35);
  return (
    <>
      {hook > 0 && (
        <div style={{
          position: 'absolute', top: 760, left: 60, right: 150, textAlign: 'center',
          fontFamily: SANS, fontSize: 78, lineHeight: 1.12, color: '#fff', opacity: hook,
          textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
          transform: `scale(${1.15 - 0.15 * smooth(0.1, 0.5, t)})`,
        }}>
          ET SI UN <span style={{color: GOLD}}>ASTÉROÏDE</span><br />TOMBAIT SUR <span style={{color: RED}}>PARIS</span> ?
        </div>
      )}
      {beat && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      {n > 0 && (
        <div style={{
          position: 'absolute', top: 820, left: 0, right: 0, textAlign: 'center',
          fontFamily: SANS, fontSize: 300, color: RED, textShadow: SHADOW,
          opacity: 0.5 + 0.5 * ((IMPACT - t) % 1),
          transform: `scale(${0.8 + 0.4 * ((IMPACT - t) % 1)})`,
        }}>
          {n}
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center',
        fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.55)', textShadow: SHADOW,
        opacity: smooth(0.5, 1, t) * (1 - smooth(37, 37.4, t)),
      }}>
        Scénario fictif
      </div>
      <CtaPill t={t} />
    </>
  );
};

export const EndCard: React.FC<{t: number}> = ({t}) => {
  const a = smooth(37.2, 37.7, t);
  if (a <= 0) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, background: `rgba(10,8,6,${a})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW, paddingBottom: 200,
    }}>
      <div style={{fontSize: 92, color: RED, opacity: smooth(37.5, 37.9, t), transform: `scale(${1.2 - 0.2 * smooth(37.5, 37.9, t)})`}}>PARTIE 2 ?</div>
      <div style={{fontSize: 46, marginTop: 24, opacity: smooth(37.8, 38.2, t), textAlign: 'center', lineHeight: 1.25}}>
        Marc survit-il<br />à l'onde de choc ?
      </div>
      <div style={{
        marginTop: 54, fontSize: 38, color: '#1A1A1A', background: GOLD, padding: '18px 40px', borderRadius: 50,
        opacity: smooth(38.2, 38.6, t), transform: `scale(${1 + 0.05 * Math.sin(t * 8)})`,
      }}>
        ➕ ABONNE-TOI
      </div>
      <div style={{fontSize: 30, marginTop: 34, opacity: smooth(38.6, 39, t) * 0.9, textAlign: 'center', lineHeight: 1.4}}>
        💬 Dis en commentaire<br />ce que tu ferais en 10 secondes
      </div>
    </div>
  );
};
