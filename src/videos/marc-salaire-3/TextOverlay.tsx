import React from 'react';
import {Img, staticFile} from 'remotion';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {REVEAL, RUN} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const UI = '"Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const GREEN = '#5BE38A';
const RED = '#FF4D3D';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** The end card starts here. */
export const END = 76.4;

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|Julien|costume|four|congélateur|loterie|coupable|dix|mille|euros|pardonner|Préparation|surprise|Entraînement|cuisine|écrans|vidéos|mission|rideau|pizza|cuisson|couru|vite|Moralité|Abonne-toi|commentaire)/i;

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

const Badge: React.FC<{t: number}> = ({t}) => (
  <div style={{position: 'absolute', top: 300, left: 56, fontFamily: SANS, fontSize: 30, color: '#fff', textShadow: SHADOW, opacity: smooth(4.6, 5.1, t) * (1 - smooth(END - 0.4, END, t))}}>
    <span style={{background: RED, padding: '6px 16px', borderRadius: 10, textShadow: 'none'}}>PARTIE 3</span>
    <span style={{marginLeft: 14, opacity: 0.85}}>{t >= REVEAL ? 'ORION = JULIEN 😑' : 'ORION ❓'}</span>
  </div>
);

/** Big "JULIEN ?!" stamp on the reveal. */
const RevealStamp: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(REVEAL, REVEAL + 2.2, t, 0.08, 0.4);
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', top: 700, left: 0, right: 110, textAlign: 'center', fontFamily: SANS, fontSize: 140, color: GOLD, textShadow: SHADOW, WebkitTextStroke: '5px #222', opacity: a, transform: `rotate(-6deg) scale(${0.7 + 0.4 * smooth(REVEAL, REVEAL + 0.2, t)})`}}>
      JULIEN ?!
    </div>
  );
};

/** Flashbacks of the oven and the freezer. */
const Flashbacks: React.FC<{t: number}> = ({t}) => {
  const items: [number, string, string][] = [[10.6, 'marc-salaire-3/flash/oven1.jpg', 'LE FOUR 🔥'], [12.6, 'marc-salaire-3/flash/freeze1.jpg', 'LE CONGÉLATEUR 🧊']];
  return (
    <>
      {items.map(([at, src, label], i) => {
        const a = fadeAlpha(at, 15.0, t, 0.2, 0.3);
        if (a <= 0) return null;
        return (
          <div key={src} style={{position: 'absolute', top: 440 + i * 330, left: i ? 380 : 120, width: 480, opacity: a, transform: `rotate(${i ? 4 : -4}deg) scale(${0.8 + 0.2 * smooth(at, at + 0.25, t)})`}}>
            <div style={{background: '#f3efe4', padding: '14px 14px 50px', boxShadow: '0 16px 40px rgba(0,0,0,0.6)'}}>
              <Img src={staticFile(src)} style={{width: '100%', display: 'block', filter: 'sepia(0.5) contrast(1.05)'}} />
              <div style={{fontFamily: SANS, fontSize: 34, color: '#222', textAlign: 'center', marginTop: 8}}>{label}</div>
            </div>
          </div>
        );
      })}
    </>
  );
};

/** Lottery ticket. */
const Ticket: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(15.5, 21.4, t, 0.25, 0.3);
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', top: 520, left: 160, right: 230, opacity: a, transform: `rotate(-5deg) scale(${0.8 + 0.2 * smooth(15.5, 15.8, t)})`, background: 'linear-gradient(135deg, #ffe066, #ffb02e)', borderRadius: 24, padding: '30px 34px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', fontFamily: SANS, color: '#3a1a00', textAlign: 'center'}}>
      <div style={{fontSize: 40}}>🎟️ LOTERIE</div>
      <div style={{fontSize: 88, color: '#c0141e', marginTop: 6}}>JACKPOT !</div>
      <div style={{fontFamily: UI, fontWeight: 700, fontSize: 30, marginTop: 6}}>Gagnant : JULIEN 😏</div>
    </div>
  );
};

/** Stack of monthly transfers from Julien. */
const Transfers: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(22.0, 27.8, t, 0.2, 0.3);
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', top: 440, left: 70, right: 70, opacity: a}}>
      {Array.from({length: 6}, (_, i) => {
        const k = smooth(22.2 + 0.8 * i, 22.5 + 0.8 * i, t);
        return (
          <div key={i} style={{background: 'rgba(245,245,247,0.96)', borderRadius: 26, padding: '14px 24px', marginBottom: 12, fontFamily: UI, color: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: k, transform: `translateY(${(1 - k) * -30}px)`, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'}}>
            <span style={{fontSize: 28}}>🏦 Julien → Marc · <i>« pardon »</i></span>
            <span style={{fontSize: 30, fontWeight: 800, color: '#1a7f4b'}}>+10 000 €</span>
          </div>
        );
      })}
    </div>
  );
};

/** What the transfer labels really meant. */
const Labels: React.FC<{t: number}> = ({t}) => {
  const rows: [number, string, string][] = [[28.1, '« PRÉPARATION »', 'une surprise 🎁'], [31.0, '« ENTRAÎNEMENT TERMINÉ »', 'cours de cuisine 👨‍🍳']];
  const a = fadeAlpha(28.0, 34.8, t, 0.2, 0.3);
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', top: 520, left: 80, right: 180, opacity: a, background: 'rgba(10,10,14,0.75)', borderRadius: 28, padding: '28px 34px', fontFamily: SANS, color: '#fff', textShadow: SHADOW}}>
      {rows.map(([at, label, meaning]) => {
        const k = smooth(at, at + 0.3, t);
        return (
          <div key={label} style={{opacity: k, transform: `translateX(${(1 - k) * 40}px)`, marginBottom: 18}}>
            <div style={{fontSize: 34, color: '#bbb'}}>{label}</div>
            <div style={{fontSize: 52, color: GREEN}}>= {meaning}</div>
          </div>
        );
      })}
    </div>
  );
};

/** "That's you, watching" over the screens: hearts floating up. */
const Hearts: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(35.2, 40.8, t, 0.3, 0.3);
  if (a <= 0) return null;
  return (
    <>
      {Array.from({length: 12}, (_, i) => {
        const k = ((t - 35.2) * 0.45 + i / 12) % 1;
        return <div key={i} style={{position: 'absolute', right: 120 + (i % 3) * 40 + Math.sin(t * 2 + i) * 20, top: 1150 - k * 600, fontSize: 60, opacity: a * (1 - k)}}>❤️</div>;
      })}
      <div style={{position: 'absolute', top: 520, left: 0, right: 110, textAlign: 'center', fontFamily: SANS, fontSize: 64, color: '#fff', textShadow: SHADOW, opacity: a * smooth(37.6, 38.0, t)}}>
        👀 C'EST TOI QUI REGARDES
      </div>
    </>
  );
};

/** Marc running away: speed lines and a dust puff. */
const Zoom: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(RUN[0] + 0.4, RUN[1] + 0.8, t, 0.1, 0.4);
  if (a <= 0) return null;
  return (
    <>
      {Array.from({length: 14}, (_, i) => (
        <div key={i} style={{position: 'absolute', left: 0, top: 300 + i * 90, width: 1080, height: 4, background: `rgba(255,255,255,${0.25 + 0.2 * Math.sin(t * 30 + i)})`, opacity: a, transform: `translateX(${((t * 3000 + i * 230) % 1600) - 800}px) scaleX(0.4)`}} />
      ))}
      <div style={{position: 'absolute', top: 660, left: 0, right: 110, textAlign: 'center', fontFamily: SANS, fontSize: 130, color: '#fff', textShadow: SHADOW, WebkitTextStroke: '5px #222', opacity: a, transform: 'rotate(-6deg)'}}>
        💨 NOPE !
      </div>
    </>
  );
};

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const title = fadeAlpha(0.1, 4.8, t, 0.12, 0.3);
  const beat = voice.beats.find((b) => b.id !== 'cta' && t >= b.start - 0.1 && t < b.end + 0.35);
  return (
    <>
      {title > 0 && (
        <div style={{position: 'absolute', top: 600, left: 60, right: 150, textAlign: 'center', fontFamily: SANS, fontSize: 74, lineHeight: 1.1, color: '#fff', opacity: title, textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)', transform: `scale(${1.15 - 0.15 * smooth(0.1, 0.5, t)})`}}>
          <div style={{fontSize: 46, color: RED}}>PARTIE 3</div>
          QUI EST<br /><span style={{color: GOLD}}>ORION</span> ? 🕵️
        </div>
      )}
      <Badge t={t} />
      {beat && t < END && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      <RevealStamp t={t} />
      <Flashbacks t={t} />
      <Ticket t={t} />
      <Transfers t={t} />
      <Labels t={t} />
      <Hearts t={t} />
      <Zoom t={t} />
      <div style={{position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center', fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW, opacity: smooth(0.5, 1, t) * (1 - smooth(END - 0.4, END, t))}}>
        Histoire fictive · aucun Marc n'a été cuit pendant le tournage
      </div>
    </>
  );
};

/** End card: subscribe, ask for the next idea. */
export const EndCard: React.FC<{t: number}> = ({t}) => {
  const a = smooth(END, END + 0.3, t);
  if (a <= 0) return null;
  const s = (d: number) => smooth(END + d, END + d + 0.3, t);
  return (
    <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.9 * a})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, color: '#fff', textShadow: SHADOW, paddingBottom: 200}}>
      <div style={{fontSize: 40, letterSpacing: '0.12em', opacity: s(0) * 0.85}}>LA PROCHAINE AVENTURE</div>
      <div style={{fontSize: 90, color: GOLD, marginTop: 10, opacity: s(0), textAlign: 'center', lineHeight: 1.05}}>C'EST TOI<br />QUI CHOISIS 💬</div>
      <div style={{marginTop: 50, fontSize: 48, color: '#1A1A1A', background: GOLD, padding: '20px 48px', borderRadius: 60, opacity: s(0.3), transform: `scale(${(0.8 + 0.2 * s(0.3)) * (1 + 0.05 * Math.sin(t * 8))})`, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', textShadow: 'none'}}>
        🔔 ABONNE-TOI
      </div>
    </div>
  );
};
