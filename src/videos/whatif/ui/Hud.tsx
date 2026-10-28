import {SERIF, type Val} from '../../../shared/ui/tokens';
export {SERIF, type Val} from '../../../shared/ui/tokens';
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {
  T,
  sampleNum,
  smooth,
  sunHoleDiameter,
} from '../world';
import {fmtG, fmtInt, fmtLength, fmtMicro, fmtSci, fmtTonnes} from '../../../core/physics';
import {useScenario} from '../Scenario';

export type Beat = {
  t: number;
  end: number;
  title?: string;
  label?: string;
  field?: Val;
  big?: Val;
  sub?: Val;
  caption?: string;
  voice?: string;
  right?: 'none' | 'elapsed' | 'fall';
  verify?: boolean;
};
export const BEATS = T.beats as unknown as Beat[];


export const activeBeat = (t: number, beats: readonly Beat[] = BEATS) => beats.find((b) => t >= b.t && t < b.end);
export const beatAlpha = (b: Beat, t: number) => Math.min(smooth(b.t, b.t + 0.3, t), 1 - smooth(b.end - 0.3, b.end, t));
export const inkColor = (t: number, flash = T.flash) => (sampleNum(flash, t, 'a') > 0.55 ? '#1b1a17' : '#f3efe6');

const resolve = (v: Val | undefined, t: number, scenario: ReturnType<typeof useScenario>): string => {
  if (v === undefined) return '';
  if (typeof v === 'string') return v;
  const {timeline: T, holeStateAt, holeDiameter, pullInG} = scenario;
  const st = holeStateAt(t);
  switch (v.compute) {
    case 'diameter':
      return fmtLength(holeDiameter);
    case 'mass':
      return fmtSci(T.hole.massKg, 'kg');
    case 'pull':
      return fmtG(pullInG(st.r));
    case 'pullField':
      return `ATTRACTION À ${fmtLength(st.r)}`.toUpperCase();
    case 'weightSub':
      return `TU PÈSERAIS ≈ ${fmtTonnes((T.hole.personKg * pullInG(st.r)) / 1000)}`.toUpperCase();
    case 'distance':
      return fmtLength(st.r);
    case 'sunDiameter':
      return `≈ ${fmtLength(sunHoleDiameter)}`;
    default:
      return '';
  }
};

const Small: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{fontSize: 24, letterSpacing: '0.14em', opacity: 0.78, ...style}}>{children}</div>
);

export const Hud: React.FC = () => {
  const scenario = useScenario();
  const {timeline: T, holeStateAt} = scenario;
  const frame = useCurrentFrame();
  const t = frame / T.fps;
  const b = activeBeat(t, T.beats as Beat[]);
  if (!b) return null;
  const alpha = beatAlpha(b, t);
  const color = inkColor(t, T.flash);
  const st = holeStateAt(t);

  if (b.title) {
    return (
      <div
        style={{
          position: 'absolute', top: 190, left: 90, right: 90, textAlign: 'center',
          fontFamily: SERIF, fontSize: 68, lineHeight: 1.15, color, opacity: alpha,
          textShadow: '0 2px 18px rgba(0,0,0,0.45)',
        }}
      >
        {b.title}
      </div>
    );
  }

  const right = b.right ?? 'none';
  return (
    <div style={{position: 'absolute', top: 150, left: 72, right: 72, fontFamily: SERIF, color, opacity: alpha, textShadow: '0 2px 14px rgba(0,0,0,0.35)'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', gap: 24}}>
        <div style={{maxWidth: right === 'none' ? 936 : 620}}>
          <Small style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <span style={{width: 12, height: 12, borderRadius: 6, background: '#e5482f', display: 'inline-block'}} />
            {b.label}
          </Small>
          <Small style={{marginTop: 26}}>{resolve(b.field, t, scenario)}</Small>
          <div style={{fontSize: 66, lineHeight: 1.08, marginTop: 6}}>{resolve(b.big, t, scenario)}</div>
          <Small style={{marginTop: 8, fontSize: 22}}>{resolve(b.sub, t, scenario)}</Small>
        </div>

        {right !== 'none' && (
          <div style={{textAlign: 'right', minWidth: 290}}>
            <Small>ÉCOULÉ</Small>
            <div style={{fontSize: 34}}>{fmtMicro(st.realT)}</div>
            {right === 'elapsed' ? (
              <>
                <Small style={{marginTop: 22}}>TEMPS RALENTI</Small>
                <div style={{fontSize: 34}}>{fmtInt(T.hole.slowFactor)}×</div>
                <Small style={{fontSize: 20}}>1 s ICI = {fmtMicro(1 / T.hole.slowFactor)} LÀ-BAS</Small>
              </>
            ) : (
              <>
                <Small style={{marginTop: 22}}>TA VITESSE</Small>
                <div style={{fontSize: 34}}>{fmtInt(st.v / 1000)} km/s</div>
                <Small style={{fontSize: 20}}>ET ÇA ACCÉLÈRE</Small>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
