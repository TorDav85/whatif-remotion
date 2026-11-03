import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {
  CAPTIONS,
  FPS,
  H,
  elapsedMin,
  fmtClock,
  fmtElapsed,
  fmtTemp,
  splitKeyword,
  stateAt,
  tempAt,
  thermoColor,
  timelapseAt,
} from './curve';

const INK = '#ffffff';
const TURQUOISE = '#3fe6d6';
const SHADOW = '0 2px 4px rgba(0,0,0,0.55), 0 0 24px rgba(0,0,0,0.45)';
const fadeWin = (t: number, a: number, b: number, f = 0.35) => Math.min(smooth(a, a + f, t), 1 - smooth(b - f, b, t));
const hudAlpha = (t: number) => 1 - smooth(H.outro.t - 0.6, H.outro.t, t);

/** Texte avec UN mot-clé {entre accolades} en turquoise. */
export const Keyword: React.FC<{text: string}> = ({text}) => (
  <>
    {splitKeyword(text).map((p, i) =>
      p.k ? (
        <span key={i} style={{color: TURQUOISE}}>
          {p.s}
        </span>
      ) : (
        <React.Fragment key={i}>{p.s}</React.Fragment>
      ),
    )}
  </>
);

export const Title: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const a = fadeWin(t, -1, H.titleEnd, 0.5);
  if (a <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute', top: 200, left: 80, right: 80, textAlign: 'center',
        fontFamily: SERIF, fontSize: 70, lineHeight: 1.15, color: INK, opacity: a, textShadow: SHADOW,
      }}
    >
      <Keyword text={H.title} />
    </div>
  );
};

const Line: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{fontSize: 24, letterSpacing: '0.16em', opacity: 0.82, ...style}}>{children}</div>
);

export const Hud: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const c = tempAt(t);
  const lapse = timelapseAt(t);
  const a = hudAlpha(t);
  if (a <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: a, pointerEvents: 'none'}}>
      {/* léger voile pour rester lisible sur ciel clair comme sur fond rouge */}
      <div
        style={{
          position: 'absolute', left: -120, top: 560, width: 860, height: 620,
          background: 'radial-gradient(ellipse at 35% 50%, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0) 72%)',
        }}
      />
      <div style={{position: 'absolute', left: 76, top: 690, fontFamily: SERIF, color: INK, textShadow: SHADOW}}>
        <Line>TEMPÉRATURE</Line>
        <div style={{display: 'flex', alignItems: 'flex-start', marginTop: 4}}>
          <span style={{fontSize: 172, lineHeight: 1, letterSpacing: '-0.01em'}}>{fmtTemp(c)}</span>
          <span style={{fontSize: 56, lineHeight: 1, marginTop: 18, marginLeft: 10}}>°C</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, letterSpacing: '0.16em', marginTop: 16}}>
          <span style={{width: 6, height: 30, borderRadius: 3, background: thermoColor(Math.max(c, 60)), boxShadow: '0 0 8px rgba(0,0,0,0.6)'}} />
          {stateAt(c)}
        </div>
        <div style={{marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8}}>
          <Line style={{fontSize: 21, opacity: 0.7}}>+{H.rateCPerMin} °C / MIN</Line>
          <Line style={{fontSize: 21, opacity: 0.7}}>ÉCOULÉ {fmtElapsed(elapsedMin(c))}</Line>
          <Line style={{fontSize: 21, opacity: 0.7}}>{lapse < 0.5 ? 'TIME-LAPSE EN PAUSE' : `TIME-LAPSE ×${Math.round(lapse)}`}</Line>
        </div>
      </div>
      <Thermo c={c} />
    </AbsoluteFill>
  );
};

/** Jauge verticale fine : remplissage en racine pour que les premiers degrés se voient. */
const Thermo: React.FC<{c: number}> = ({c}) => {
  const X = 1080 - 104;
  const TOP = 640;
  const HGT = 500;
  const MAX = 1200;
  const k = (v: number) => Math.sqrt(Math.max(0, v) / MAX);
  const col = thermoColor(c);
  return (
    <div style={{position: 'absolute', left: X, top: TOP, width: 60, height: HGT + 60, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))'}}>
      <div style={{position: 'absolute', left: 22, top: 0, width: 14, height: HGT, borderRadius: 7, background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.75)', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: `${k(c) * 100}%`, background: col, boxShadow: `0 0 14px ${col}`}} />
      </div>
      <div style={{position: 'absolute', left: 13, top: HGT - 6, width: 32, height: 32, borderRadius: 16, background: col, border: '1.5px solid rgba(255,255,255,0.85)', boxShadow: `0 0 18px ${col}`}} />
      {[100, 500, 1000].map((v) => (
        <div key={v} style={{position: 'absolute', right: 44, top: HGT * (1 - k(v)) - 9, fontFamily: SERIF, fontSize: 16, letterSpacing: '0.1em', color: INK, opacity: 0.7, textShadow: SHADOW, whiteSpace: 'nowrap'}}>
          {fmtTemp(v)}
        </div>
      ))}
    </div>
  );
};

export const Captions: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cap = CAPTIONS.find((x) => t >= x.start && t < x.end);
  if (!cap) return null;
  return (
    <div
      style={{
        position: 'absolute', left: 80, right: 80, top: 1270, textAlign: 'center',
        fontFamily: SERIF, fontStyle: 'italic', fontSize: 58, lineHeight: 1.22, color: INK,
        opacity: fadeWin(t, cap.start, cap.end, 0.3), textShadow: SHADOW,
      }}
    >
      <Keyword text={cap.text} />
    </div>
  );
};

/** Habillage « caméra de surveillance » (séquence 2). */
export const CctvOverlay: React.FC<{from: number; to: number}> = ({from, to}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const a = fadeWin(t, from, to, 0.6);
  if (a <= 0) return null;
  const mono = '"Courier New", ui-monospace, monospace';
  const br = (s: React.CSSProperties) => <div style={{position: 'absolute', width: 70, height: 70, borderColor: 'rgba(255,255,255,0.85)', borderStyle: 'solid', borderWidth: 0, ...s}} />;
  const rec = Math.floor(t * 1.6) % 2 === 0;
  return (
    <AbsoluteFill style={{opacity: a, pointerEvents: 'none'}}>
      {/* grain léger : bruit SVG dont la graine change à chaque frame (déterministe) */}
      <svg width="1080" height="1920" style={{position: 'absolute', inset: 0, opacity: 0.16, mixBlendMode: 'overlay'}}>
        <filter id="g">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 97} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1080" height="1920" filter="url(#g)" />
      </svg>
      {/* lignes de balayage */}
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, rgba(0,0,0,0) 3px)'}} />
      {br({left: 46, top: 46, borderLeftWidth: 4, borderTopWidth: 4})}
      {br({right: 46, top: 46, borderRightWidth: 4, borderTopWidth: 4})}
      {br({left: 46, bottom: 46, borderLeftWidth: 4, borderBottomWidth: 4})}
      {br({right: 46, bottom: 46, borderRightWidth: 4, borderBottomWidth: 4})}
      <div style={{position: 'absolute', left: 80, top: 82, fontFamily: mono, fontSize: 30, color: '#fff', letterSpacing: '0.08em', textShadow: SHADOW}}>
        CAM 04 · AV. &amp; PARK ST
      </div>
      <div style={{position: 'absolute', right: 84, top: 82, display: 'flex', alignItems: 'center', gap: 12, fontFamily: mono, fontSize: 30, color: '#fff', textShadow: SHADOW}}>
        <span style={{width: 20, height: 20, borderRadius: 10, background: '#ff2a2a', opacity: rec ? 1 : 0.25, boxShadow: '0 0 10px #ff2a2a'}} />
        REC
      </div>
      <div style={{position: 'absolute', left: 80, bottom: 84, fontFamily: mono, fontSize: 30, color: '#fff', letterSpacing: '0.06em', textShadow: SHADOW}}>
        {fmtClock(elapsedMin(tempAt(t)))}
      </div>
    </AbsoluteFill>
  );
};

/** 72–75 s : assombrissement et dernière phrase. */
export const Outro: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const dark = smooth(H.outro.t - 0.4, H.outro.t + 1, t);
  if (dark <= 0) return null;
  const a = smooth(H.outro.t + 0.5, H.outro.t + 1.1, t);
  return (
    <AbsoluteFill style={{background: `rgba(4,2,2,${0.92 * dark})`, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 62, lineHeight: 1.25, color: INK, textAlign: 'center', padding: '0 110px', opacity: a}}>
        <Keyword text={H.outro.text} />
      </div>
      <div style={{position: 'absolute', bottom: 240, fontFamily: SERIF, fontSize: 26, letterSpacing: '0.14em', color: INK, opacity: a * 0.75}}>{H.handle}</div>
    </AbsoluteFill>
  );
};
