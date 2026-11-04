/**
 * HudOverlay: the 2D layer of the holo style, in CSS over the 3D canvas. Reticles [ ] that follow a 3D
 * point (with projectToScreen), readouts, gauges, a "V1 vs V2" panel, scan lines and a short glitch.
 * Positions are in pixels of the 1080×1920 frame; keep them inside SAFE (src/shared/ui/PlatformSafeArea).
 */
import React from 'react';
import {clamp01, rng, smooth} from '../../core/animation';
import {HOLO_DEFAULT, neonShadow, type HoloTheme} from './theme';

/** French number with non-breaking thousands: 20000 → "20 000", 0.003 → "0,003". */
export const frNumber = (v: number, decimals = 0) => {
  const [int, dec] = Math.abs(v).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${v < 0 ? '−' : ''}${grouped}${dec ? `,${dec}` : ''}`;
};

/** Value that counts up from `from` to `to` between t0 and t1 (eased), for readouts. */
export const countUp = (t: number, t0: number, t1: number, from: number, to: number) => from + (to - from) * smooth(t0, t1, t);

/** Typewriter: first characters of `text` revealed from `t0` at `cps` characters per second. */
export const typed = (text: string, t: number, t0: number, cps = 40) => text.slice(0, Math.max(0, Math.floor((t - t0) * cps)));

const corner = (c: string, w: number, s: number, pos: React.CSSProperties, sides: [string, string]): React.CSSProperties => ({
  position: 'absolute', width: s, height: s, ...pos,
  [`border${sides[0]}`]: `${w}px solid ${c}`, [`border${sides[1]}`]: `${w}px solid ${c}`,
  boxShadow: `0 0 10px ${c}66`,
});

/** Four corner brackets around (x, y). `appear` 0..1 zooms them in; `label`/`value` sit underneath. */
export const Reticle: React.FC<{
  x: number; y: number; size?: number; color?: string; appear?: number; label?: string; value?: string;
  theme?: HoloTheme; t?: number; labelSide?: 'below' | 'right' | 'left';
}> = ({x, y, size = 160, color, appear = 1, label, value, theme = HOLO_DEFAULT, t = 0, labelSide = 'below'}) => {
  if (appear <= 0) return null;
  const c = color ?? theme.primary;
  const s = size * (1.6 - 0.6 * appear);
  const arm = Math.max(18, s * 0.22);
  const w = 4;
  const breathe = 1 + 0.03 * Math.sin(t * 4);
  const lab: React.CSSProperties =
    labelSide === 'below' ? {left: '50%', top: s / 2 + 18, transform: 'translateX(-50%)', textAlign: 'center'}
      : labelSide === 'right' ? {left: s / 2 + 22, top: -24, textAlign: 'left'}
        : {right: s / 2 + 22, top: -24, textAlign: 'right'};
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: appear, transform: `scale(${breathe})`}}>
      <div style={{position: 'absolute', left: -s / 2, top: -s / 2, width: s, height: s}}>
        <div style={corner(c, w, arm, {left: 0, top: 0}, ['Left', 'Top'])} />
        <div style={corner(c, w, arm, {right: 0, top: 0}, ['Right', 'Top'])} />
        <div style={corner(c, w, arm, {left: 0, bottom: 0}, ['Left', 'Bottom'])} />
        <div style={corner(c, w, arm, {right: 0, bottom: 0}, ['Right', 'Bottom'])} />
        <div style={{position: 'absolute', left: s / 2 - 5, top: s / 2 - 5, width: 10, height: 10, borderRadius: 5, background: c, boxShadow: `0 0 12px ${c}`}} />
      </div>
      {(label || value) && (
        <div style={{position: 'absolute', ...lab, whiteSpace: 'nowrap', fontFamily: theme.font, color: c, textShadow: neonShadow(c, 0.7)}}>
          {label && <div style={{fontSize: 30, letterSpacing: 3, opacity: 0.85}}>{label}</div>}
          {value && <div style={{fontSize: 52, fontWeight: 700, color: theme.text, textShadow: neonShadow(c, 1)}}>{value}</div>}
        </div>
      )}
    </div>
  );
};

/** Label + big value block (top-left HUD). */
export const Readout: React.FC<{
  label: string; value: string; color?: string; theme?: HoloTheme; size?: number; align?: 'left' | 'right' | 'center';
  style?: React.CSSProperties; opacity?: number;
}> = ({label, value, color, theme = HOLO_DEFAULT, size = 64, align = 'left', style, opacity = 1}) => {
  const c = color ?? theme.primary;
  if (opacity <= 0) return null;
  return (
    <div style={{position: 'absolute', fontFamily: theme.font, textAlign: align, opacity, ...style}}>
      <div style={{fontSize: size * 0.42, letterSpacing: 4, color: c, textShadow: neonShadow(c, 0.6)}}>{label}</div>
      <div style={{fontSize: size, fontWeight: 700, color: theme.text, textShadow: neonShadow(c, 1), whiteSpace: 'nowrap'}}>{value}</div>
    </div>
  );
};

/** Segmented bar gauge, `value` 0..1. */
export const Gauge: React.FC<{
  label?: string; value: number; color?: string; theme?: HoloTheme; width?: number; segments?: number;
  style?: React.CSSProperties; opacity?: number;
}> = ({label, value, color, theme = HOLO_DEFAULT, width = 420, segments = 20, style, opacity = 1}) => {
  const c = color ?? theme.primary;
  const lit = Math.round(clamp01(value) * segments);
  if (opacity <= 0) return null;
  return (
    <div style={{position: 'absolute', fontFamily: theme.font, opacity, ...style}}>
      {label && <div style={{fontSize: 26, letterSpacing: 4, color: c, marginBottom: 8, textShadow: neonShadow(c, 0.5)}}>{label}</div>}
      <div style={{display: 'flex', gap: 5, width}}>
        {Array.from({length: segments}, (_, i) => (
          <div key={i} style={{
            flex: 1, height: 26, border: `2px solid ${c}88`,
            background: i < lit ? c : 'transparent', boxShadow: i < lit ? `0 0 10px ${c}` : 'none',
          }} />
        ))}
      </div>
    </div>
  );
};

export type VersusSide = {label: string; value: string; color?: string};

/** Two potentials face to face and their difference: the core of an electricity explanation. */
export const VersusPanel: React.FC<{
  a: VersusSide; b: VersusSide; delta: VersusSide; theme?: HoloTheme; style?: React.CSSProperties; opacity?: number; width?: number;
}> = ({a, b, delta, theme = HOLO_DEFAULT, style, opacity = 1, width = 800}) => {
  if (opacity <= 0) return null;
  const side = (s: VersusSide) => {
    const c = s.color ?? theme.primary;
    return (
      <div style={{flex: 1, textAlign: 'center'}}>
        <div style={{fontSize: 28, letterSpacing: 4, color: c, textShadow: neonShadow(c, 0.5)}}>{s.label}</div>
        <div style={{fontSize: 50, fontWeight: 700, color: theme.text, textShadow: neonShadow(c, 1), whiteSpace: 'nowrap'}}>{s.value}</div>
      </div>
    );
  };
  const dc = delta.color ?? theme.secondary;
  return (
    <div style={{
      position: 'absolute', width, fontFamily: theme.font, opacity, padding: '22px 26px',
      border: `2px solid ${theme.primary}66`, background: 'rgba(0, 20, 30, 0.55)', boxShadow: `0 0 24px ${theme.primary}33 inset`, ...style,
    }}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        {side(a)}
        <div style={{fontSize: 34, color: theme.text, opacity: 0.7}}>vs</div>
        {side(b)}
      </div>
      <div style={{marginTop: 16, paddingTop: 14, borderTop: `2px dashed ${dc}88`, textAlign: 'center'}}>
        <span style={{fontSize: 30, letterSpacing: 4, color: dc, textShadow: neonShadow(dc, 0.5)}}>{delta.label} </span>
        <span style={{fontSize: 60, fontWeight: 700, color: dc, textShadow: neonShadow(dc, 1.2), whiteSpace: 'nowrap'}}>{delta.value}</span>
      </div>
    </div>
  );
};

/** Faint CRT scan lines, a slow bright sweep and a vignette over the whole frame. */
export const ScanLines: React.FC<{t: number; opacity?: number; color?: string; height?: number}> = ({t, opacity = 1, color = '#00f0ff', height = 1920}) => {
  const sweep = ((t * 0.35) % 1.2) * height - 100;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity}}>
      <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 2px, transparent 2px, transparent 5px)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: sweep, height: 90, background: `linear-gradient(180deg, transparent, ${color}14, transparent)`}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.65) 100%)'}} />
    </div>
  );
};

/** Glitch strength (0..1) at time t: short bursts at the given [start, end] windows (seconds). */
export const glitchAt = (t: number, windows: [number, number][]) =>
  Math.max(0, ...windows.map(([a, b]) => (t >= a && t <= b ? 1 - Math.abs((t - a) / (b - a) - 0.5) : 0)));

/** CSS for the element holding the 3D image during a glitch: jitter + split colours. */
export const glitchStyle = (frame: number, amount: number): React.CSSProperties => {
  if (amount <= 0) return {};
  const r = rng(frame * 31 + 7);
  const dx = (r() - 0.5) * 60 * amount;
  const dy = (r() - 0.5) * 14 * amount;
  return {transform: `translate(${dx}px, ${dy}px)`, filter: `hue-rotate(${(r() - 0.5) * 80 * amount}deg) saturate(${1 + amount})`};
};

/** Glitch slices: displaced bands of colour, new every frame (seeded by the frame). */
export const Glitch: React.FC<{frame: number; amount: number; theme?: HoloTheme; height?: number}> = ({frame, amount, theme = HOLO_DEFAULT, height = 1920}) => {
  if (amount <= 0) return null;
  const r = rng(frame * 131 + 3);
  const n = 3 + Math.floor(r() * 5 * amount);
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen'}}>
      {Array.from({length: n}, (_, i) => {
        const top = r() * height;
        const h = 6 + r() * 60 * amount;
        const c = [theme.danger, theme.primary, theme.secondary][i % 3];
        return <div key={i} style={{position: 'absolute', left: (r() - 0.5) * 140 * amount, right: (r() - 0.5) * 140 * amount, top, height: h, background: c, opacity: 0.18 + 0.4 * amount * r()}} />;
      })}
    </div>
  );
};

/** Small corner brackets framing the safe area, and a status line (top) like an instrument screen. */
export const HudFrame: React.FC<{
  theme?: HoloTheme; status?: string; t: number; opacity?: number; box: {left: number; top: number; right: number; bottom: number};
  color?: string;
}> = ({theme = HOLO_DEFAULT, status, t, opacity = 1, box, color}) => {
  const c = color ?? theme.primary;
  const arm = 46;
  const blink = Math.floor(t * 2) % 2 === 0;
  if (opacity <= 0) return null;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity}}>
      <div style={{position: 'absolute', ...box}}>
        <div style={corner(`${c}aa`, 3, arm, {left: 0, top: 0}, ['Left', 'Top'])} />
        <div style={corner(`${c}aa`, 3, arm, {right: 0, top: 0}, ['Right', 'Top'])} />
        <div style={corner(`${c}aa`, 3, arm, {left: 0, bottom: 0}, ['Left', 'Bottom'])} />
        <div style={corner(`${c}aa`, 3, arm, {right: 0, bottom: 0}, ['Right', 'Bottom'])} />
        {status && (
          <div style={{position: 'absolute', left: 18, top: 14, fontFamily: theme.font, fontSize: 24, letterSpacing: 4, color: c, opacity: 0.8}}>
            <span style={{color: theme.danger, opacity: blink ? 1 : 0.25}}>●</span> {status}
          </div>
        )}
      </div>
    </div>
  );
};
