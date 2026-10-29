import React from 'react';
import {smooth} from '../../core/animation';

const SERIF = 'Georgia, "Times New Roman", serif';
const GOLD = '#F6E05E';

type TextBeat = {
  start: number;
  end: number;
  text: string;
  sub?: string;
  size?: number;
  position?: 'center' | 'bottom' | 'top';
  color?: string;
};

const BEATS: TextBeat[] = [
  {start: 0.5, end: 4.5, text: 'Et si Internet disparaissait...\nmaintenant ?', size: 52, position: 'center'},
  {start: 15.5, end: 24, text: 'Seuls.', sub: 'Pour la première fois depuis 20 ans.', size: 56, position: 'center'},
  {start: 26, end: 39, text: 'Mais quelque chose d\'étrange\nse produit...', size: 48, position: 'bottom'},
  {start: 41, end: 54, text: 'On se pose enfin\nles vraies questions.', size: 48, position: 'bottom'},
  {start: 56, end: 69, text: 'Sans Google,\non s\'est retrouvés.', size: 52, position: 'bottom'},
  {start: 71, end: 75, text: 'Et si ça revenait...\ntu ferais quoi différemment ?', size: 46, position: 'center'},
];

const SEED_TEXT = {start: 0.2, end: 4.8, text: 'Regarde ton temps d\'écran.\nGarde le chiffre en tête.\nOn en reparle dans 60 secondes.'};
const MICRO_CTA = {start: 38, end: 40, text: 'Double tap si tu as déjà ressenti ça. 👇'};
const EASTER_EGG = {start: 15, end: 16.5, text: '3 téléphones cachés dans la vidéo.\nLe premier qui donne les 3 timestamps\nen commentaire est épinglé. 📌'};
const LOOP_CLOSE = {start: 75.3, end: 79.8, text: 'Alors... c\'était combien\nton temps d\'écran ?\nDis-le moi en commentaire.'};

const DIALOGUES: {start: number; end: number; text: string; x: number; y: number}[] = [
  {start: 41.0, end: 44.7, text: 'Tu t\'appelles comment ?', x: 330, y: 620},
  {start: 42.4, end: 44.8, text: 'Tu viens d\'où ?', x: 760, y: 760},
  {start: 45.6, end: 49.7, text: 'Tu fais quoi dans la vie ?', x: 540, y: 600},
  {start: 50.6, end: 54.7, text: 'T\'es heureux ?', x: 560, y: 640},
];

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.4, fadeOut = 0.4) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

export const TextOverlay: React.FC<{t: number}> = ({t}) => (
  <>
    {/* Main narrative beats */}
    {BEATS.map((b, i) => {
      const a = fadeAlpha(b.start, b.end, t);
      if (a <= 0) return null;
      const top = b.position === 'top' ? 200 : b.position === 'center' ? undefined : undefined;
      const bottom = b.position === 'bottom' ? 200 : undefined;
      return (
        <div key={i} style={{
          position: 'absolute',
          ...(b.position === 'center' ? {top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'} : {}),
          ...(top !== undefined ? {top} : {}),
          ...(bottom !== undefined ? {bottom} : {}),
          left: 60, right: 60,
          textAlign: 'center',
          fontFamily: SERIF, fontSize: b.size ?? 48, lineHeight: 1.3,
          color: b.color ?? '#F3EFE6',
          opacity: a,
          textShadow: '0 3px 20px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)',
          whiteSpace: 'pre-line',
        }}>
          <div>
            {b.text}
            {b.sub && <div style={{fontSize: (b.size ?? 48) * 0.55, marginTop: 12, opacity: 0.75}}>{b.sub}</div>}
          </div>
        </div>
      );
    })}

    {/* Seed text (top, small) */}
    {(() => {
      const a = fadeAlpha(SEED_TEXT.start, SEED_TEXT.end, t);
      if (a <= 0) return null;
      return (
        <div style={{
          position: 'absolute', top: 220, left: 60, right: 60,
          textAlign: 'center', fontFamily: SERIF, fontSize: 24, lineHeight: 1.5,
          color: GOLD, opacity: a * 0.85,
          textShadow: '0 2px 10px rgba(0,0,0,0.6)',
          whiteSpace: 'pre-line',
        }}>
          {SEED_TEXT.text}
        </div>
      );
    })()}

    {/* Micro CTA */}
    {(() => {
      const a = fadeAlpha(MICRO_CTA.start, MICRO_CTA.end, t, 0.3, 0.3);
      if (a <= 0) return null;
      return (
        <div style={{
          position: 'absolute', bottom: 140, left: 60, right: 60,
          textAlign: 'center', fontFamily: SERIF, fontSize: 22,
          color: '#fff', opacity: a * 0.7,
          textShadow: '0 1px 8px rgba(0,0,0,0.5)',
        }}>
          {MICRO_CTA.text}
        </div>
      );
    })()}

    {/* Easter egg */}
    {(() => {
      const a = fadeAlpha(EASTER_EGG.start, EASTER_EGG.end, t, 0.2, 0.3);
      if (a <= 0) return null;
      return (
        <div style={{
          position: 'absolute', bottom: 100, left: 80, right: 80,
          textAlign: 'center', fontFamily: SERIF, fontSize: 18, lineHeight: 1.4,
          color: GOLD, opacity: a * 0.6,
          textShadow: '0 1px 8px rgba(0,0,0,0.5)',
          whiteSpace: 'pre-line',
        }}>
          {EASTER_EGG.text}
        </div>
      );
    })()}

    {/* Loop close */}
    {(() => {
      const a = fadeAlpha(LOOP_CLOSE.start, LOOP_CLOSE.end, t, 0.5, 0.5);
      if (a <= 0) return null;
      return (
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 60, right: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', fontFamily: SERIF, fontSize: 38, lineHeight: 1.4,
          color: GOLD, opacity: a,
          textShadow: '0 3px 16px rgba(0,0,0,0.7)',
          whiteSpace: 'pre-line',
        }}>
          {LOOP_CLOSE.text}
        </div>
      );
    })()}

    {/* Dialogue bubbles */}
    {DIALOGUES.map((d, i) => {
      const a = fadeAlpha(d.start, d.end, t, 0.3, 0.4);
      if (a <= 0) return null;
      return (
        <div key={`d${i}`} style={{
          position: 'absolute', left: d.x - 120, top: d.y,
          background: 'rgba(255,255,255,0.92)', borderRadius: 16, padding: '10px 18px',
          fontFamily: SERIF, fontSize: 20, color: '#1A202C',
          opacity: a, transform: `translateY(${(1 - a) * 10}px)`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          maxWidth: 280,
        }}>
          « {d.text} »
        </div>
      );
    })}
  </>
);

export const EndCard: React.FC<{t: number}> = ({t}) => {
  const a = smooth(80, 81, t);
  if (a <= 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: `rgba(0,0,0,${a})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: SERIF, color: '#fff',
      textShadow: '0 2px 12px rgba(0,0,0,0.5)',
    }}>
      <div style={{fontSize: 52, opacity: smooth(81, 82, t), textAlign: 'center', lineHeight: 1.3}}>
        Dis-le en commentaire 👇
      </div>
      <div style={{fontSize: 24, opacity: smooth(82, 83, t) * 0.7, marginTop: 30, textAlign: 'center', lineHeight: 1.5}}>
        Et partage à quelqu'un<br />que tu as perdu de vue
      </div>
      <div style={{
        display: 'flex', gap: 30, marginTop: 50,
        opacity: smooth(83, 84, t),
      }}>
        {['ABONNE-TOI', 'PARTAGE', 'COMMENTE'].map((cta) => (
          <div key={cta} style={{
            fontSize: 18, letterSpacing: '0.12em',
            border: `1px solid ${GOLD}`, color: GOLD,
            padding: '10px 20px', borderRadius: 6,
          }}>
            {cta}
          </div>
        ))}
      </div>
    </div>
  );
};
