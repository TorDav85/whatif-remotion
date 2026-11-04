import React from 'react';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {BIKE, CCTV_POV, CHAIR, EYE, EYE_MARC, LOCK, LUNCH, POV, PUNCH, PUNCH_HEAT, END as SCENE_END} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const GHOST = '#BFE6FF';
const HOT = '#FF9A3C';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** The end card starts here. */
export const END = SCENE_END;

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|Julien|invisible|aveugle|rétine|lumière|noir|vélo|trente-sept|cent|watts|chaleur|thermique|police|sandwich|ventre|heures|digestion|espion)/i;

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
  const a = fadeAlpha(at - 0.05, at + 1.4, t, 0.08, 0.4);
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

/** Label above the eye diagram. */
const EyeLabel: React.FC<{t: number}> = ({t}) => {
  if (t < EYE || t >= POV) return null;
  const marc = t >= EYE_MARC;
  const a = marc ? fadeAlpha(EYE_MARC + 0.1, POV, t) : fadeAlpha(EYE + 0.2, EYE_MARC, t);
  return (
    <div style={{position: 'absolute', top: 540, left: 60, right: 150, textAlign: 'center', fontFamily: SANS, opacity: a, textShadow: SHADOW}}>
      <div style={{fontSize: 58, color: marc ? GHOST : '#fff'}}>{marc ? 'ŒIL DE MARC' : 'ŒIL NORMAL'}</div>
      <div style={{fontSize: 36, color: marc ? '#FF6B6B' : '#7CFC8A', marginTop: 8}}>
        {marc ? '✗ la lumière traverse' : '✓ la lumière s’arrête'}
      </div>
    </div>
  );
};

/** Police camera frame: REC, bracket around the target. */
const CctvFrame: React.FC<{t: number}> = ({t}) => {
  if (t < CCTV_POV || t >= LUNCH) return null;
  const lock = smooth(LOCK, LOCK + 0.3, t);
  const size = 380 - 120 * lock;
  const blink = Math.sin(t * 9) > 0;
  const corner = (s: React.CSSProperties) => <div style={{position: 'absolute', width: 60, height: 60, borderColor: lock > 0.5 ? '#FF4040' : '#fff', borderStyle: 'solid', borderWidth: 0, ...s}} />;
  return (
    <>
      <div style={{position: 'absolute', top: 210, left: 60, fontFamily: 'Consolas, monospace', fontSize: 30, color: '#fff', textShadow: SHADOW}}>
        POLICE · CAM 07 <span style={{color: '#FF4040', opacity: blink ? 1 : 0.2}}>● REC</span>
      </div>
      <div style={{position: 'absolute', left: 540 - 55 - size / 2, top: 960 - size / 2 - 40, width: size, height: size * 1.5}}>
        {corner({top: 0, left: 0, borderTopWidth: 6, borderLeftWidth: 6})}
        {corner({top: 0, right: 0, borderTopWidth: 6, borderRightWidth: 6})}
        {corner({bottom: 0, left: 0, borderBottomWidth: 6, borderLeftWidth: 6})}
        {corner({bottom: 0, right: 0, borderBottomWidth: 6, borderRightWidth: 6})}
      </div>
      {lock > 0 && (
        <div style={{position: 'absolute', top: 960 + size * 0.75 - 10, left: 0, right: 110, textAlign: 'center', fontFamily: 'Consolas, monospace',
          fontSize: 34, color: '#FF4040', opacity: lock, textShadow: SHADOW}}>
          CIBLE · 37 °C
        </div>
      )}
    </>
  );
};

/** Punch line: the three giveaways, ticked one by one. */
const Checklist: React.FC<{t: number}> = ({t}) => {
  if (t < PUNCH + 0.4 || t >= END) return null;
  const items = [['AVEUGLE', PUNCH + 0.9], ['REPÉRABLE À LA CHALEUR', PUNCH + 2.0], ['TRAHI PAR SON DÉJEUNER', PUNCH + 3.4]] as const;
  const stamp = smooth(PUNCH_HEAT + 0.6, PUNCH_HEAT + 0.9, t);
  return (
    <div style={{position: 'absolute', top: 300, left: 60, right: 170, fontFamily: SANS, textShadow: SHADOW}}>
      {items.map(([label, at]) => (
        <div key={label} style={{fontSize: 40, color: '#fff', opacity: smooth(at, at + 0.2, t), marginBottom: 10}}>
          <span style={{color: '#FF6B6B'}}>✗</span> {label}
        </div>
      ))}
      {stamp > 0 && (
        <div style={{marginTop: 26, display: 'inline-block', fontSize: 54, color: HOT, border: `6px solid ${HOT}`, padding: '8px 22px', borderRadius: 12,
          opacity: stamp, transform: `scale(${1.6 - 0.6 * stamp}) rotate(-5deg)`, transformOrigin: 'left center'}}>
          PIRE ESPION DU MONDE
        </div>
      )}
    </div>
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
          fontFamily: SANS, fontSize: 72, lineHeight: 1.12, color: '#fff', opacity: hook,
          textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
          transform: `scale(${1.15 - 0.15 * smooth(0.1, 0.5, t)})`,
        }}>
          ET SI <span style={{color: GOLD}}>MARC</span><br />DEVENAIT<br /><span style={{color: GHOST}}>INVISIBLE</span> ?
          <div style={{fontSize: 46, color: GOLD, marginTop: 14, opacity: smooth(2.2, 2.6, t)}}>… ET AVEUGLE 👁️</div>
        </div>
      )}
      {beat && t < END && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      <EyeLabel t={t} />
      <CctvFrame t={t} />
      <Checklist t={t} />
      <Pop t={t} at={CHAIR} text="BAM !" color="#fff" top={640} />
      <Pop t={t} at={BIKE} text="BOUM !" color="#FFB347" top={620} size={150} />
      <div style={{
        position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center',
        fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW,
        opacity: smooth(0.5, 1, t) * (1 - smooth(END - 0.4, END, t)),
      }}>
        Scénario fictif · on suppose Marc invisible à la lumière visible, pas aux infrarouges
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
      <div style={{fontSize: 70, color: GOLD, textAlign: 'center', lineHeight: 1.15, marginTop: 18, opacity: s(0.1),
        transform: `scale(${1.2 - 0.2 * s(0.1)})`}}>
        INVISIBLE 👻<br /><span style={{fontSize: 44, color: '#fff'}}>OU</span><br />VOIR CLAIR 👁️
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
