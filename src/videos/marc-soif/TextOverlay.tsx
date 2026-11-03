import React from 'react';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {BRIGHT, DAYS, STOP} from './Scene3D';

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const BLUE = '#5FB8F5';
const RED = '#FF4D3D';
const GREEN = '#7BDB7B';
const SHADOW = '0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)';
/** The end card starts here. */
export const END = 79.8;

const fadeAlpha = (start: number, end: number, t: number, fadeIn = 0.25, fadeOut = 0.25) =>
  Math.min(smooth(start, start + fadeIn, t), 1 - smooth(end - fadeOut, end, t));

/** Words highlighted in yellow in the captions. */
const KEYWORDS = /^(Marc|Jour|goutte|eau|soixante|litres|soif|reins|urine|sang|cœur|cerveau|vertiges|lèvres|peau|déchets|tension|confus|température|arrête|trois|cinq|verre)/i;

const Caption: React.FC<{text: string; alpha: number}> = ({text, alpha}) => (
  <div style={{
    position: 'absolute', top: 1180, left: 70, right: 170,
    textAlign: 'center', fontFamily: SANS, fontSize: 52, lineHeight: 1.2,
    color: '#fff', opacity: alpha, textShadow: SHADOW, WebkitTextStroke: '2px rgba(0,0,0,0.55)',
    transform: `scale(${0.94 + 0.06 * alpha})`,
  }}>
    {text.split(' ').map((w, i) => (
      <span key={i} style={{color: KEYWORDS.test(w.replace(/^[«(]/, '')) ? GOLD : '#fff'}}>{w} </span>
    ))}
  </div>
);

/** Big "JOUR N" stamp when a day starts. */
const DayStamp: React.FC<{t: number}> = ({t}) => {
  const i = DAYS.filter((d) => t >= d).length - 1;
  if (i < 0 || t > DAYS[i] + 1.3) return null;
  const k = (t - DAYS[i]) / 1.3;
  return (
    <div style={{
      position: 'absolute', top: 760, left: 0, right: 110, textAlign: 'center', fontFamily: SANS, fontSize: 120,
      color: i >= 3 ? RED : '#fff', textShadow: SHADOW, WebkitTextStroke: '4px rgba(0,0,0,0.5)',
      opacity: Math.min(1, k * 6) * (1 - smooth(0.6, 1, k)), transform: `scale(${1.25 - 0.25 * smooth(0, 0.3, k)})`,
    }}>
      JOUR {i + 1}
    </div>
  );
};

/** ECG line that races, then goes flat as the picture fades out. */
const Ecg: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(61.8, BRIGHT - 0.2, t, 0.4, 0.5);
  if (a <= 0) return null;
  const flat = smooth(STOP - 0.2, STOP + 0.2, t);
  const W = 760;
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 4) {
    // Spikes scroll from right to left, every 95 px.
    const phase = ((x + t * 420) % 95) / 95;
    const spike = phase < 0.08 ? -Math.sin((phase / 0.08) * Math.PI) * 110 : phase < 0.14 ? Math.sin(((phase - 0.08) / 0.06) * Math.PI) * 35 : 0;
    // The line flattens from the right edge (most recent) first.
    const k = 1 - smooth(W * (1 - flat) - 60, W * (1 - flat), x);
    pts.push(`${x},${120 + spike * k * (1 - flat)}`);
  }
  return (
    <div style={{position: 'absolute', top: 760, left: 100, opacity: a}}>
      <svg width={W} height={240}>
        <polyline points={pts.join(' ')} fill="none" stroke={flat > 0.5 ? '#ff7a6e' : GREEN} strokeWidth={6} strokeLinejoin="round" />
      </svg>
      <div style={{textAlign: 'center', fontFamily: SANS, fontSize: 40, color: flat > 0.5 ? RED : GREEN, textShadow: SHADOW, marginTop: 10}}>
        {flat > 0.5 ? '0 bpm' : '150 bpm'}
      </div>
    </div>
  );
};

/** Food vs water, row by row while the voice says it. */
const FACTS: {at: number; label: string; value: string; color: string}[] = [
  {at: 67.6, label: 'SANS MANGER', value: '≈ 3 SEMAINES', color: GREEN},
  {at: 70.3, label: 'SANS EAU', value: '3 À 5 JOURS', color: RED},
];
const Facts: React.FC<{t: number}> = ({t}) => {
  const a = fadeAlpha(67.4, 74.2, t, 0.3, 0.4);
  if (a <= 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 360, left: 90, right: 190, opacity: a,
      background: 'rgba(10,10,14,0.62)', borderRadius: 28, padding: '26px 36px',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW,
    }}>
      {FACTS.map((f) => {
        const k = smooth(f.at, f.at + 0.3, t);
        return (
          <div key={f.label} style={{opacity: k, transform: `translateX(${(1 - k) * 40}px)`, marginBottom: 14}}>
            <div style={{fontSize: 30, opacity: 0.8}}>{f.label}</div>
            <div style={{fontSize: 60, color: f.color}}>{f.value}</div>
          </div>
        );
      })}
    </div>
  );
};

export const TextOverlay: React.FC<{t: number}> = ({t}) => {
  const hook = fadeAlpha(0.1, 4.2, t, 0.15, 0.3);
  const beat = voice.beats.find((b) => b.id !== 'hook' && t >= b.start - 0.1 && t < b.end + 0.35);
  return (
    <>
      {hook > 0 && (
        <div style={{
          position: 'absolute', top: 700, left: 60, right: 150, textAlign: 'center',
          fontFamily: SANS, fontSize: 74, lineHeight: 1.12, color: '#fff', opacity: hook,
          textShadow: SHADOW, WebkitTextStroke: '3px rgba(0,0,0,0.6)',
          transform: `scale(${1.15 - 0.15 * smooth(0.1, 0.5, t)})`,
        }}>
          ET SI <span style={{color: GOLD}}>MARC</span><br />NE BUVAIT PLUS<br /><span style={{color: BLUE}}>D'EAU</span> ?
          <div style={{fontSize: 44, color: RED, marginTop: 14}}>PENDANT 7 JOURS 💧</div>
        </div>
      )}
      {beat && t < END && <Caption key={beat.id} text={beat.text} alpha={fadeAlpha(beat.start - 0.1, beat.end + 0.35, t, 0.15, 0.2)} />}
      <DayStamp t={t} />
      <Ecg t={t} />
      <Facts t={t} />
      <div style={{
        position: 'absolute', bottom: 380, left: 0, right: 110, textAlign: 'center',
        fontFamily: SANS, fontSize: 16, color: 'rgba(255,255,255,0.6)', textShadow: SHADOW,
        opacity: smooth(0.5, 1, t) * (1 - smooth(END - 0.4, END, t)),
      }}>
        Scénario fictif · valeurs approximatives, adulte de 75 kg au repos
      </div>
    </>
  );
};

/** End card: the message, then subscribe. */
export const EndCard: React.FC<{t: number}> = ({t}) => {
  const a = smooth(END, END + 0.4, t);
  if (a <= 0) return null;
  const s = (d: number) => smooth(END + d, END + d + 0.35, t);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: `rgba(6,10,20,${a * 0.9})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: SANS, color: '#fff', textShadow: SHADOW, paddingBottom: 200,
    }}>
      <div style={{fontSize: 80, color: BLUE, textAlign: 'center', lineHeight: 1.1, opacity: s(0.1),
        transform: `scale(${1.2 - 0.2 * s(0.1)})`}}>
        VA BOIRE<br />UN VERRE D'EAU 💧
      </div>
      <div style={{
        marginTop: 56, fontSize: 48, color: '#1A1A1A', background: GOLD, padding: '20px 48px', borderRadius: 60,
        opacity: s(0.45), transform: `scale(${(0.8 + 0.2 * s(0.45)) * (1 + 0.05 * Math.sin(t * 8))})`,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)', textShadow: 'none',
      }}>
        🔔 ABONNE-TOI
      </div>
    </div>
  );
};
