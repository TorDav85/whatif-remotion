import React from 'react';
import {useCurrentFrame} from 'remotion';
import {smooth} from '../world';
import {SERIF, Val} from '../ui/Hud';
import {
  FPS,
  G,
  GRAVITY_ON,
  PEOPLE,
  SPIN_MS,
  clockAt,
  driftAt,
  fallSec,
  fmtKm,
  fmtKmh,
  fmtM,
  impactMS,
  liftAt,
  plumeAt,
  tauAt,
} from './time';

type Beat = {t: number; end: number; title?: boolean; label?: string; field?: Val; big?: Val; sub?: Val; caption?: string; verify?: boolean};
const BEATS = G.beats as unknown as Beat[];
const INK = '#f3efe6';
const GOLD = '#f2c46d';

const activeBeat = (t: number) => BEATS.find((b) => t >= b.t && t < b.end);
const beatAlpha = (b: Beat, t: number) => Math.min(smooth(b.t, b.t + 0.3, t), 1 - smooth(b.end - 0.3, b.end, t));

/** Valeurs calculées affichées dans le HUD (toutes viennent de la physique de time.ts). */
const COMPUTE: Record<string, (tau: number) => string> = {
  spin: () => fmtKmh(SPIN_MS),
  alt: (tau) => fmtM(liftAt(tau)),
  altPeople: (tau) => fmtM(liftAt(tau, PEOPLE)),
  driftSub: (tau) => `ET GLISSE DE ${fmtM(driftAt(tau)).toUpperCase()} VERS LE SUD`,
  plume: (tau) => fmtKm(plumeAt(tau)),
  impact: () => fmtKmh(impactMS()),
  fallSub: () => `CHUTE DE ${fmtM(liftAt(G.physics.offSec)).toUpperCase()} EN ${fallSec().toFixed(1).replace('.', ',')} S`,
  driftEnd: (tau) => `${fmtM(driftAt(tau))} au sud`,
};

const resolve = (v: Val | undefined, tau: number): string => {
  if (v === undefined) return '';
  if (typeof v === 'string') return v;
  return COMPUTE[v.compute]?.(tau) ?? '';
};

const Small: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{fontSize: 24, letterSpacing: '0.14em', opacity: 0.78, ...style}}>{children}</div>
);

export const GravityHud: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const tau = tauAt(t);
  const b = activeBeat(t);
  if (!b) return null;
  const alpha = beatAlpha(b, t);

  if (b.title) {
    return (
      <div
        style={{
          position: 'absolute', top: 190, left: 90, right: 90, textAlign: 'center',
          fontFamily: SERIF, fontSize: 68, lineHeight: 1.15, color: INK, opacity: alpha,
          textShadow: '0 2px 18px rgba(0,0,0,0.5)',
        }}
      >
        {G.title}
      </div>
    );
  }

  const on = GRAVITY_ON(tau);
  return (
    <div style={{position: 'absolute', top: 150, left: 72, right: 72, fontFamily: SERIF, color: INK, opacity: alpha, textShadow: '0 2px 14px rgba(0,0,0,0.5)'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', gap: 24}}>
        <div style={{maxWidth: 640}}>
          <Small style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <span style={{width: 12, height: 12, borderRadius: 6, background: on ? '#6fcf8a' : '#e5482f', display: 'inline-block'}} />
            {b.label}
          </Small>
          <Small style={{marginTop: 26}}>{resolve(b.field, tau)}</Small>
          <div style={{fontSize: 66, lineHeight: 1.08, marginTop: 6}}>{resolve(b.big, tau)}</div>
          <Small style={{marginTop: 8, fontSize: 22}}>{resolve(b.sub, tau)}</Small>
        </div>
        <div style={{textAlign: 'right', minWidth: 240}}>
          <Small>HEURE</Small>
          <div style={{fontSize: 34, fontVariantNumeric: 'tabular-nums'}}>{clockAt(tau)}</div>
          <Small style={{marginTop: 22}}>GRAVITÉ</Small>
          <div style={{fontSize: 34, color: on ? INK : GOLD}}>{on ? '9,81 m/s²' : '0 m/s²'}</div>
        </div>
      </div>
    </div>
  );
};

export const GravityCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const b = activeBeat(t);
  if (!b?.caption) return null;
  return (
    <div
      style={{
        position: 'absolute', left: 90, right: 90, bottom: 330, textAlign: 'center',
        fontFamily: SERIF, fontStyle: 'italic', fontSize: 56, lineHeight: 1.2,
        color: INK, opacity: beatAlpha(b, t), textShadow: '0 2px 14px rgba(0,0,0,0.8)',
      }}
    >
      {b.caption}
    </div>
  );
};

/** Frise du bas : où en est-on (quais → Champ-de-Mars → ciel → Terre). */
export const GravitySteps: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const scene = G.scenes.filter((s) => s.id !== 'end' && t >= s.from).pop();
  const end = G.scenes.find((s) => s.id === 'end')!;
  if (!scene || scene.step === undefined) return null;
  const a = smooth(4, 4.6, t) * (1 - smooth(end.from - 0.4, end.from, t));
  const reached = Math.max(...G.scenes.filter((s) => s.step !== undefined && t >= s.from).map((s) => s.step!));
  return (
    <div style={{position: 'absolute', left: 72, right: 72, bottom: 120, display: 'flex', alignItems: 'center', gap: 18, fontFamily: SERIF, opacity: a}}>
      {G.steps.map((name, i) => (
        <React.Fragment key={name}>
          {i > 0 && <div style={{flex: 1, height: 1, background: i <= reached ? GOLD : 'rgba(243,239,230,0.3)'}} />}
          <div style={{fontSize: 21, letterSpacing: '0.12em', color: i === scene.step ? GOLD : INK, opacity: i <= reached ? 1 : 0.5, textShadow: '0 2px 10px rgba(0,0,0,0.6)'}}>
            {name}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export const GravityEndCard: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  return (
    <div
      style={{
        position: 'absolute', inset: 0, background: '#05060b', color: INK, opacity: smooth(from, from + 0.5, t),
        fontFamily: SERIF, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 110px', gap: 44,
      }}
    >
      <div style={{fontSize: 60, lineHeight: 1.2}}>{G.title}</div>
      <div style={{fontSize: 24, letterSpacing: '0.16em', opacity: 0.7, lineHeight: 1.7}}>
        CECI EST UNE FICTION
        <br />
        CHIFFRES CALCULÉS, ORDRES DE GRANDEUR
      </div>
      <div style={{fontSize: 34, letterSpacing: '0.16em'}}>ET VOUS, À QUOI VOUS ACCROCHERIEZ-VOUS ?</div>
      <div style={{fontSize: 26, letterSpacing: '0.12em', opacity: 0.8}}>{G.handle}</div>
    </div>
  );
};
