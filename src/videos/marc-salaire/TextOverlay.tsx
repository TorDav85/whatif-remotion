import React from 'react';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {BLACK, CALL, DOOR_OPEN, MSG, PAYMENTS} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const UI = '"Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const GREEN = '#5BE38A';
const RED = '#FF4D3D';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** The end card starts here. */
export const END = 76.8;

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|dix|mille|euros|jamais|Orion|répond|préparation|démissionne|télé|Soixante|entraînement|voiture|noire|erreur|reprendre|Cent|vingt|message|mission|seul|minuit|porte|ouvres|commentaire|partie)/i;

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

/** iPhone-like banner sliding from the top. */
const Banner: React.FC<{t: number; at: number; dur: number; icon: string; app: string; title: string; body: string; top?: number}> = ({t, at, dur, icon, app, title, body, top = 120}) => {
  const a = fadeAlpha(at, at + dur, t, 0.2, 0.3);
  if (a <= 0) return null;
  const slide = 1 - smooth(at, at + 0.3, t);
  return (
    <div style={{
      position: 'absolute', top: top - 160 * slide, left: 60, right: 60, opacity: a,
      background: 'rgba(245,245,247,0.96)', borderRadius: 34, padding: '22px 28px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.45)', fontFamily: UI, color: '#111', display: 'flex', gap: 20, alignItems: 'center',
    }}>
      <div style={{width: 76, height: 76, borderRadius: 18, background: '#1a7f4b', color: '#fff', fontSize: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{icon}</div>
      <div style={{flex: 1}}>
        <div style={{fontSize: 22, color: '#666', display: 'flex', justifyContent: 'space-between'}}><span>{app.toUpperCase()}</span><span>maintenant</span></div>
        <div style={{fontSize: 32, fontWeight: 700, marginTop: 2}}>{title}</div>
        <div style={{fontSize: 28, color: '#333'}}>{body}</div>
      </div>
    </div>
  );
};

const PAY_TEXT: {title: string; body: string}[] = [
  {title: 'Virement reçu : +10 000,00 €', body: 'ORION SAS · Salaire'},
  {title: 'Virement reçu : +10 000,00 €', body: 'ORION SAS · Salaire mois 1'},
  {title: 'Virement reçu : +10 000,00 €', body: 'ORION SAS · « PRÉPARATION »'},
  {title: 'Virement reçu : +10 000,00 €', body: 'ORION SAS · « ENTRAÎNEMENT TERMINÉ »'},
  {title: 'Virement reçu : +10 000,00 €', body: 'ORION SAS · « TOUT EST PRÊT »'},
];

/** Full-screen phone: the unanswered call. */
const CallScreen: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(CALL[0] + 0.3, CALL[1], t, 0.3, 0.3);
  if (a <= 0) return null;
  const failed = t > 14.0;
  return (
    <div style={{
      position: 'absolute', top: 560, left: 250, width: 480, height: 560, opacity: a, borderRadius: 50,
      background: 'linear-gradient(#2b3550, #11141c)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', border: '6px solid #222',
      fontFamily: UI, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 70,
    }}>
      <div style={{width: 130, height: 130, borderRadius: 65, background: '#5a6478', fontSize: 70, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>❓</div>
      <div style={{fontSize: 48, fontWeight: 700, marginTop: 24}}>ORION SAS</div>
      <div style={{fontSize: 30, marginTop: 10, color: failed ? RED : '#bbb'}}>{failed ? 'Pas de réponse' : 'Appel' + '.'.repeat(1 + Math.floor((t * 2) % 3))}</div>
      <div style={{marginTop: 'auto', marginBottom: 60, width: 110, height: 110, borderRadius: 55, background: RED, fontSize: 52, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>📞</div>
    </div>
  );
};

/** Full-screen phone: Orion's messages. */
const Messages: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(MSG[0] - 0.2, 64.2, t, 0.3, 0.3);
  if (a <= 0) return null;
  const bubble = (at: number, text: string) => {
    if (t < at - 0.9) return null;
    const typing = t < at;
    return (
      <div style={{alignSelf: 'flex-start', maxWidth: 400, background: '#2c2c2e', color: '#fff', borderRadius: 26, padding: '18px 24px', fontSize: 32, lineHeight: 1.25, marginTop: 16, opacity: smooth(at - 0.9, at - 0.7, t)}}>
        {typing ? '•'.repeat(1 + Math.floor((t * 4) % 3)) : text}
      </div>
    );
  };
  return (
    <div style={{
      position: 'absolute', top: 470, left: 220, width: 540, height: 640, opacity: a, borderRadius: 50,
      background: '#000', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', border: '6px solid #222',
      fontFamily: UI, color: '#fff', display: 'flex', flexDirection: 'column', padding: '40px 28px',
    }}>
      <div style={{textAlign: 'center', borderBottom: '1px solid #333', paddingBottom: 16}}>
        <div style={{fontSize: 44}}>⚫</div>
        <div style={{fontSize: 30, fontWeight: 700}}>ORION</div>
        <div style={{fontSize: 20, color: '#888'}}>Aujourd'hui 23:47</div>
      </div>
      {bubble(MSG[0], 'Votre première mission commence ce soir.')}
      {bubble(MSG[1], 'Une voiture vous attend en bas. Ne prenez rien. Venez seul.')}
    </div>
  );
};

/** "MOIS N" stamp when the months change. */
const MonthStamp: React.FC<{t: number}> = ({t}) => {
  const stamps: [number, string][] = [[16.2, 'MOIS 2'], [28.1, 'MOIS 6'], [47.1, 'MOIS 12']];
  const s = stamps.filter(([at]) => t >= at).pop();
  if (!s || t > s[0] + 1.3) return null;
  const k = (t - s[0]) / 1.3;
  return (
    <div style={{
      position: 'absolute', top: 760, left: 0, right: 110, textAlign: 'center', fontFamily: SANS, fontSize: 120,
      color: '#fff', textShadow: SHADOW, WebkitTextStroke: '4px rgba(0,0,0,0.5)',
      opacity: Math.min(1, k * 6) * (1 - smooth(0.6, 1, k)), transform: `scale(${1.25 - 0.25 * smooth(0, 0.3, k)})`,
    }}>
      {s[1]}
    </div>
  );
};

/** Real-life reminder. */
const LawCard: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(40.4, 46.8, t, 0.3, 0.4);
  if (a <= 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 640, left: 90, right: 190, opacity: a,
      background: 'rgba(10,10,14,0.72)', borderRadius: 28, padding: '28px 36px',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW, textAlign: 'center',
    }}>
      <div style={{fontSize: 34, color: GOLD}}>⚖️ DANS LA VRAIE VIE</div>
      <div style={{fontFamily: UI, fontWeight: 700, fontSize: 34, marginTop: 14, lineHeight: 1.3}}>
        Un virement reçu par erreur doit être rendu : l'expéditeur peut le réclamer.
      </div>
    </div>
  );
};

/** Doorbell "DING DONG" and the 00:00 clock. */
const Midnight: React.FC<{t: number}> = ({t}) => {
  const clock = fadeAlpha(64.8, 66.6, t, 0.2, 0.3);
  const bell = fadeAlpha(66.6, 68.4, t, 0.08, 0.3);
  return (
    <>
      {clock > 0 && (
        <div style={{position: 'absolute', top: 640, left: 0, right: 110, textAlign: 'center', fontFamily: SANS, fontSize: 150, color: RED, textShadow: SHADOW, opacity: clock}}>00:00</div>
      )}
      {bell > 0 && (
        <div style={{position: 'absolute', top: 680, left: 0, right: 110, textAlign: 'center', fontFamily: SANS, fontSize: 110, color: '#fff', textShadow: SHADOW, WebkitTextStroke: '5px #222', opacity: bell, transform: `rotate(-5deg) scale(${0.8 + 0.3 * smooth(66.6, 66.8, t)})`}}>
          DING DONG 🔔
        </div>
      )}
    </>
  );
};

/** The question to the viewer, on black. */
const Question: React.FC<{t: number}> = ({t}) => {
  const a = smooth(BLACK + 0.6, BLACK + 1.1, t) * (1 - smooth(END - 0.3, END, t));
  if (a <= 0) return null;
  const s = (d: number) => smooth(BLACK + d, BLACK + d + 0.35, t);
  const btn = (label: string, bg: string, d: number) => (
    <div style={{fontSize: 54, background: bg, color: '#111', padding: '22px 46px', borderRadius: 30, opacity: s(d), transform: `scale(${0.8 + 0.2 * s(d)})`, textShadow: 'none'}}>{label}</div>
  );
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, color: '#fff', textShadow: SHADOW, opacity: a, paddingBottom: 300}}>
      <div style={{fontSize: 96, textAlign: 'center', lineHeight: 1.05}}>TU OUVRES<br />LA PORTE ? 🚪</div>
      <div style={{display: 'flex', gap: 40, marginTop: 60}}>
        {btn('OUI 😎', GREEN, 1.4)}
        {btn('NON 😱', RED, 1.7)}
      </div>
      <div style={{fontSize: 40, marginTop: 50, opacity: s(2.4)}}>💬 RÉPONDS EN COMMENTAIRE</div>
    </div>
  );
};

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const hook = fadeAlpha(0.15, 4.3, t, 0.12, 0.3);
  const beat = voice.beats.find((b) => b.id !== 'hook' && b.id !== 'msg' && b.id !== 'msg2' && b.id !== 'cta' && t >= b.start - 0.1 && t < b.end + 0.35);
  return (
    <>
      {PAYMENTS.map((at, i) => (
        <Banner key={at} t={t} at={at} dur={i === 0 ? 3.6 : 3.2} icon="🏦" app="Ma Banque" title={PAY_TEXT[i].title} body={PAY_TEXT[i].body} top={i === 0 ? 270 : 540} />
      ))}
      <Banner t={t} at={22.6} dur={3.0} icon="✉️" app="Mail" title="Démission envoyée ✅" body="« Merci pour tout. Bisous. Marc »" top={540} />
      {hook > 0 && (
        <div style={{
          position: 'absolute', top: 660, left: 60, right: 150, textAlign: 'center',
          fontFamily: SANS, fontSize: 78, lineHeight: 1.1, color: '#fff', opacity: hook,
          textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
          transform: `scale(${1.2 - 0.2 * smooth(0.15, 0.5, t)})`,
        }}>
          IL TOUCHE<br /><span style={{color: GREEN}}>10 000 €</span>/MOIS<br />POUR… <span style={{color: GOLD}}>RIEN</span> 🤨
        </div>
      )}
      {beat && t < BLACK && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      <CallScreen t={t} />
      <MonthStamp t={t} />
      <LawCard t={t} />
      <Messages t={t} />
      <Midnight t={t} />
      <Question t={t} />
      <div style={{
        position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center',
        fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW,
        opacity: smooth(0.5, 1, t) * (1 - smooth(DOOR_OPEN, DOOR_OPEN + 0.3, t)),
      }}>
        Histoire fictive · Orion est une société imaginaire
      </div>
    </>
  );
};

/** End card: subscribe for part 2. */
export const EndCard: React.FC<{t: number}> = ({t}) => {
  const a = smooth(END, END + 0.3, t);
  if (a <= 0) return null;
  const s = (d: number) => smooth(END + d, END + d + 0.3, t);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.85 + 0.15 * a})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW, paddingBottom: 200,
    }}>
      <div style={{fontSize: 40, letterSpacing: '0.16em', opacity: s(0) * 0.85}}>LA SUITE…</div>
      <div style={{fontSize: 110, color: GOLD, marginTop: 10, opacity: s(0), transform: `scale(${1.2 - 0.2 * s(0)})`}}>PARTIE 2</div>
      <div style={{
        marginTop: 50, fontSize: 48, color: '#1A1A1A', background: GOLD, padding: '20px 48px', borderRadius: 60,
        opacity: s(0.3), transform: `scale(${(0.8 + 0.2 * s(0.3)) * (1 + 0.05 * Math.sin(t * 8))})`,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)', textShadow: 'none',
      }}>
        🔔 ABONNE-TOI
      </div>
    </div>
  );
};
