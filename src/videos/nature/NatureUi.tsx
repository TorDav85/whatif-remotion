import React from 'react';
import {useCurrentFrame} from 'remotion';
import {smooth} from '../../core/animation';
import {fmtInt} from '../../core/physics';
import {SERIF, Val} from '../../shared/ui/tokens';
import {FPS, N, elapsedDays, elapsedYears, fmtElapsed} from './time';

type Beat = {
  t: number;
  end: number;
  title?: string;
  label?: string;
  field?: Val;
  big?: Val;
  sub?: Val;
  caption?: string;
  right?: 'none' | 'humans' | 'year';
  verify?: boolean;
};
const BEATS = N.beats as unknown as Beat[];
const INK = '#f3efe6';
const HUMANS_GONE = 6; // instant (s) où le compteur d'humains tombe à zéro

const activeBeat = (t: number) => BEATS.find((b) => t >= b.t && t < b.end);
const beatAlpha = (b: Beat, t: number) => Math.min(smooth(b.t, b.t + 0.3, t), 1 - smooth(b.end - 0.3, b.end, t));

const resolve = (v: Val | undefined, t: number): string => {
  if (v === undefined) return '';
  if (typeof v === 'string') return v;
  if (v.compute === 'elapsed') return fmtElapsed(elapsedDays(t));
  return '';
};

const fmtHumans = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1).replace('.', ',')} milliards` : fmtInt(n));

const Small: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{fontSize: 24, letterSpacing: '0.14em', opacity: 0.78, ...style}}>{children}</div>
);

export const NatureHud: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const b = activeBeat(t);
  if (!b) return null;
  const alpha = beatAlpha(b, t);

  if (b.title) {
    return (
      <div
        style={{
          position: 'absolute', top: 190, left: 90, right: 90, textAlign: 'center',
          fontFamily: SERIF, fontSize: 68, lineHeight: 1.15, color: INK, opacity: alpha,
          textShadow: '0 2px 18px rgba(0,0,0,0.45)',
        }}
      >
        {b.title}
      </div>
    );
  }

  const right = b.right ?? 'none';
  // le compteur d'humains chute d'un coup : 8,2 milliards → 0
  const humans = N.humans * (1 - smooth(HUMANS_GONE, HUMANS_GONE + 0.6, t));
  return (
    <div style={{position: 'absolute', top: 150, left: 72, right: 72, fontFamily: SERIF, color: INK, opacity: alpha, textShadow: '0 2px 14px rgba(0,0,0,0.45)'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', gap: 24}}>
        <div style={{maxWidth: right === 'none' ? 936 : 620}}>
          <Small style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <span style={{width: 12, height: 12, borderRadius: 6, background: '#e5482f', display: 'inline-block'}} />
            {b.label}
          </Small>
          <Small style={{marginTop: 26}}>{resolve(b.field, t)}</Small>
          <div style={{fontSize: 66, lineHeight: 1.08, marginTop: 6}}>{resolve(b.big, t)}</div>
          <Small style={{marginTop: 8, fontSize: 22}}>{resolve(b.sub, t)}</Small>
        </div>

        {right !== 'none' && (
          <div style={{textAlign: 'right', minWidth: 260}}>
            {right === 'year' && (
              <>
                <Small>ANNÉE</Small>
                <div style={{fontSize: 34}}>{Math.floor(N.startYear + elapsedYears(t))}</div>
              </>
            )}
            <Small style={{marginTop: right === 'year' ? 22 : 0}}>HUMAINS</Small>
            <div style={{fontSize: 34}}>{fmtHumans(right === 'year' ? 0 : humans)}</div>
            {right === 'humans' && t >= HUMANS_GONE && <Small style={{fontSize: 20}}>DU JOUR AU LENDEMAIN</Small>}
          </div>
        )}
      </div>
    </div>
  );
};

export const NatureCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const b = activeBeat(t);
  if (!b?.caption) return null;
  return (
    <div
      style={{
        position: 'absolute', left: 90, right: 90, bottom: 330, textAlign: 'center',
        fontFamily: SERIF, fontStyle: 'italic', fontSize: 58, lineHeight: 1.2,
        color: INK, opacity: beatAlpha(b, t),
        textShadow: '0 2px 14px rgba(0,0,0,0.75)',
      }}
    >
      {b.caption}
    </div>
  );
};

export const NatureEndCard: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const a = smooth(from, from + 0.5, t);
  return (
    <div
      style={{
        position: 'absolute', inset: 0, background: '#05060b', color: INK, opacity: a,
        fontFamily: SERIF, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 110px', gap: 44,
      }}
    >
      <div style={{fontSize: 60, lineHeight: 1.2}}>{BEATS[0].title}</div>
      <div style={{fontSize: 24, letterSpacing: '0.16em', opacity: 0.7, lineHeight: 1.7}}>
        CECI EST UNE FICTION
        <br />
        LES DURÉES SONT DES ESTIMATIONS
      </div>
      <div style={{fontSize: 34, letterSpacing: '0.16em'}}>QUE RESTERAIT-IL DE NOUS ?</div>
      <div style={{fontSize: 26, letterSpacing: '0.12em', opacity: 0.8}}>{N.handle}</div>
    </div>
  );
};
