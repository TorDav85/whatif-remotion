import React from 'react';
import {Img, staticFile} from 'remotion';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {BLACK, LIFT, LIFT_CLOSE, ROOM} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const UI = '"Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const RED = '#FF4D3D';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** The end card starts here. */
export const END = 77.0;

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|dix|mille|euros|Orion|minuit|Personne|enveloppe|noire|carte|descendez|voiture|portière|chauffeur|Lunettes|tour|bouton|moins|douze|écrans|écran|four|congelé|filme|prison|fauteuil|lentement)/i;

const Caption: React.FC<{text: string; alpha: number}> = ({text, alpha}) => (
  <div style={{
    position: 'absolute', top: 1180, left: 70, right: 170,
    textAlign: 'center', fontFamily: SANS, fontSize: 52, lineHeight: 1.2,
    color: '#fff', opacity: alpha, textShadow: SHADOW, WebkitTextStroke: '2px rgba(0,0,0,0.55)',
    transform: `scale(${0.94 + 0.06 * alpha})`,
  }}>
    {text.split(' ').map((w, i) => (
      <span key={i} style={{color: KEYWORDS.test(w.replace(/^[«.]+/, '')) ? GOLD : '#fff'}}>{w} </span>
    ))}
  </div>
);

/** Part badge, top left, all along. */
const Badge: React.FC<{t: number}> = ({t}) => (
  <div style={{position: 'absolute', top: 300, left: 56, fontFamily: SANS, fontSize: 30, color: '#fff', textShadow: SHADOW, opacity: smooth(4.4, 4.9, t) * (1 - smooth(BLACK - 0.3, BLACK, t))}}>
    <span style={{background: RED, padding: '6px 16px', borderRadius: 10, textShadow: 'none'}}>PARTIE 2</span>
    <span style={{marginLeft: 14, opacity: 0.85}}>ORION ❓</span>
  </div>
);

/** The access card from the envelope. */
const AccessCard: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(10.9, 15.8, t, 0.3, 0.3);
  if (a <= 0) return null;
  const note = smooth(13.4, 13.8, t);
  return (
    <div style={{position: 'absolute', top: 560, left: 150, right: 150, opacity: a, transform: `rotate(-4deg) scale(${0.85 + 0.15 * smooth(10.9, 11.3, t)})`}}>
      <div style={{background: 'linear-gradient(135deg, #111 0%, #2a2a30 100%)', borderRadius: 26, padding: '34px 40px', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', border: '2px solid #c9a45a', fontFamily: UI, color: '#fff'}}>
        <div style={{fontSize: 30, letterSpacing: '0.3em', color: '#c9a45a'}}>⚫ ORION</div>
        <div style={{fontSize: 54, fontWeight: 800, marginTop: 18}}>ACCÈS NIVEAU 1</div>
        <div style={{fontSize: 26, color: '#999', marginTop: 10}}>Employé n° 0001 · MARC</div>
      </div>
      <div style={{marginTop: 30, marginLeft: 120, background: '#f3efe4', color: '#111', fontFamily: '"Segoe Script", "Comic Sans MS", cursive', fontSize: 64, padding: '18px 40px', borderRadius: 6, display: 'inline-block', transform: 'rotate(6deg)', opacity: note, boxShadow: '0 10px 30px rgba(0,0,0,0.5)'}}>
        Descendez.
      </div>
    </div>
  );
};

/** Lift: the single button, then the floor counter going down to -12. */
const Lift: React.FC<{t: number}> = ({t}) => {
  const btn = fadeAlpha(32.4, 34.6, t, 0.2, 0.3);
  const counter = fadeAlpha(LIFT_CLOSE + 0.4, ROOM + 0.2, t, 0.2, 0.2);
  const floor = -Math.round(12 * smooth(LIFT_CLOSE + 0.8, ROOM - 0.5, t));
  return (
    <>
      {btn > 0 && (
        <div style={{position: 'absolute', top: 600, left: 340, width: 400, height: 520, borderRadius: 30, background: 'linear-gradient(#3a3f47, #23262b)', opacity: btn, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: SANS}}>
          <div style={{width: 200, height: 200, borderRadius: 100, background: 'radial-gradient(#ff6a5a, #c01818)', boxShadow: `0 0 ${40 + 20 * Math.sin(t * 6)}px #ff3030`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 80}}>−12</div>
          <div style={{color: '#aaa', fontSize: 26, marginTop: 30, letterSpacing: '0.2em'}}>SOUS-SOL</div>
        </div>
      )}
      {counter > 0 && (
        <div style={{position: 'absolute', top: 470, left: 0, right: 110, textAlign: 'center', opacity: counter}}>
          <div style={{display: 'inline-block', background: '#0a0a0a', border: '4px solid #333', borderRadius: 16, padding: '10px 40px', fontFamily: '"Consolas", monospace', fontSize: 110, color: RED, textShadow: `0 0 20px ${RED}`}}>
            ▼ {floor === 0 ? '0' : `${floor}`}
          </div>
        </div>
      )}
    </>
  );
};

/** Big screens popping up on "Marc qui boit / dans un four / congelé". */
const BIG: {at: number; src: string; label: string}[] = [
  {at: 47.3, src: 'marc-salaire-2/screens/s7.jpg', label: 'CAM 07 · CUISINE'},
  {at: 48.8, src: 'marc-salaire-2/screens/s8.jpg', label: 'CAM 12 · FOUR'},
  {at: 50.2, src: 'marc-salaire-2/screens/s14.jpg', label: 'CAM 19 · CONGÉLATEUR'},
];
const BigScreens: React.FC<{t: number}> = ({t}) => (
  <>
    {BIG.map((b, i) => {
      const a = fadeAlpha(b.at, 52.8, t, 0.15, 0.3);
      if (a <= 0) return null;
      return (
        <div key={b.src} style={{position: 'absolute', top: 470 + i * 205, left: i % 2 ? 300 : 120, width: 600, opacity: a, transform: `rotate(${i % 2 ? 3 : -3}deg) scale(${0.8 + 0.2 * smooth(b.at, b.at + 0.2, t)})`}}>
          <div style={{position: 'relative', border: '8px solid #1b1d22', borderRadius: 10, boxShadow: '0 16px 40px rgba(0,0,0,0.7)'}}>
            <Img src={staticFile(b.src)} style={{width: '100%', display: 'block', filter: 'saturate(0.6) contrast(1.1)'}} />
            <div style={{position: 'absolute', top: 8, left: 12, fontFamily: '"Consolas", monospace', fontSize: 24, color: '#fff', textShadow: '0 0 4px #000'}}>
              <span style={{color: RED}}>● REC</span> {b.label}
            </div>
          </div>
        </div>
      );
    })}
  </>
);

/** Real-life reminder. */
const LawCard: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(53.6, 59.8, t, 0.3, 0.4);
  if (a <= 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 600, left: 90, right: 190, opacity: a,
      background: 'rgba(10,10,14,0.75)', borderRadius: 28, padding: '28px 36px',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW, textAlign: 'center',
    }}>
      <div style={{fontSize: 34, color: GOLD}}>⚖️ DANS LA VRAIE VIE</div>
      <div style={{fontFamily: UI, fontWeight: 700, fontSize: 34, marginTop: 14, lineHeight: 1.3}}>
        Filmer quelqu'un chez lui sans son accord : jusqu'à 1 an de prison et 45 000 € d'amende.
      </div>
    </div>
  );
};

/** The voice from the chair, as a subtitle in quotes. */
const Voice: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(66.2, BLACK - 0.1, t, 0.3, 0.3);
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', top: 1160, left: 70, right: 170, textAlign: 'center', fontFamily: '"Georgia", serif', fontStyle: 'italic', fontSize: 64, color: '#fff', textShadow: SHADOW, opacity: a}}>
      « Bonsoir, Marc.<br />Ça faisait longtemps. »
    </div>
  );
};

/** The question to the viewer, on black. */
const Question: React.FC<{t: number}> = ({t}) => {
  const a = smooth(BLACK + 0.4, BLACK + 0.9, t) * (1 - smooth(END - 0.3, END, t));
  if (a <= 0) return null;
  const s = (d: number) => smooth(BLACK + d, BLACK + d + 0.35, t);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, color: '#fff', textShadow: SHADOW, opacity: a, paddingBottom: 300}}>
      <div style={{fontSize: 90, textAlign: 'center', lineHeight: 1.05}}>QUI SE CACHE<br />DERRIÈRE <span style={{color: GOLD}}>ORION</span> ? 🤔</div>
      <div style={{fontSize: 44, marginTop: 50, opacity: s(1.4)}}>💬 TON IDÉE EN COMMENTAIRE</div>
      <div style={{fontSize: 36, marginTop: 24, opacity: s(2.0), color: '#bbb'}}>Indice : tu le connais déjà 👀</div>
    </div>
  );
};

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const title = fadeAlpha(0.1, 4.6, t, 0.12, 0.3);
  const beat = voice.beats.find((b) => b.id !== 'voice' && b.id !== 'cta' && t >= b.start - 0.1 && t < b.end + 0.35);
  return (
    <>
      {title > 0 && (
        <div style={{
          position: 'absolute', top: 600, left: 60, right: 150, textAlign: 'center',
          fontFamily: SANS, fontSize: 74, lineHeight: 1.1, color: '#fff', opacity: title,
          textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)', transform: `scale(${1.15 - 0.15 * smooth(0.1, 0.5, t)})`,
        }}>
          <div style={{fontSize: 46, color: RED}}>PARTIE 2</div>
          DERRIÈRE<br />LA <span style={{color: GOLD}}>PORTE</span> 🚪
          <div style={{fontSize: 34, marginTop: 18, color: '#ddd'}}>10 000 €/mois · 0 jour travaillé</div>
        </div>
      )}
      <Badge t={t} />
      {beat && t < BLACK && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      <AccessCard t={t} />
      <Lift t={t} />
      <BigScreens t={t} />
      <LawCard t={t} />
      <Voice t={t} />
      <Question t={t} />
      <div style={{position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center', fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW, opacity: smooth(0.5, 1, t) * (1 - smooth(BLACK - 0.3, BLACK, t))}}>
        Histoire fictive · Orion est une société imaginaire
      </div>
    </>
  );
};

/** End card: part 3 teaser. */
export const EndCard: React.FC<{t: number}> = ({t}) => {
  const a = smooth(END, END + 0.3, t);
  if (a <= 0) return null;
  const s = (d: number) => smooth(END + d, END + d + 0.3, t);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, color: '#fff', textShadow: SHADOW, paddingBottom: 200, opacity: a}}>
      <div style={{fontSize: 40, letterSpacing: '0.16em', opacity: s(0) * 0.85}}>LA RÉVÉLATION…</div>
      <div style={{fontSize: 110, color: GOLD, marginTop: 10, opacity: s(0), transform: `scale(${1.2 - 0.2 * s(0)})`}}>PARTIE 3</div>
      <div style={{marginTop: 50, fontSize: 48, color: '#1A1A1A', background: GOLD, padding: '20px 48px', borderRadius: 60, opacity: s(0.3), transform: `scale(${(0.8 + 0.2 * s(0.3)) * (1 + 0.05 * Math.sin(t * 8))})`, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', textShadow: 'none'}}>
        🔔 ABONNE-TOI
      </div>
    </div>
  );
};
