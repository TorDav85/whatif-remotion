/** HUD, hook, subtitles and closing question of AvionPortance (one kind of overlay at a time). */
import React from 'react';
import {smooth} from '../../core/animation';
import {SAFE} from '../../shared/ui/PlatformSafeArea';
import {layerAlpha, type OverlayPlan} from '../../shared/ui/OverlayPolicy';
import {projectToScreen} from '../../shared/three/projection';
import {wordTime, type Captions} from '../../shared/captions/CaptionTrack';
import {
  Gauge, HudFrame, Readout, Reticle, ScanLines, Subtitles, VersusPanel, countUp, frNumber, neonShadow, typed, type V3,
} from '../../shared/holo';
import {
  END, LIFTOFF, MASS_T, RECOVER, RULE, RUNWAY, STALL, STALL_IN, THEME, TUNNEL_BOTTOM, TUNNEL_TOP, TUNNEL_WAKE, WEIGHT, WING,
  liftOrigin, planeAt, viewAt,
} from './Scene3D';
import captionsData from './captions.json';

const captions = captionsData as Captions;
const W = 1080;
const H = 1920;
const th = THEME;

export const PLAN: OverlayPlan = [[0, 'story'], [WING, 'science'], [RUNWAY, 'story'], [STALL_IN, 'climax'], [RULE, 'science'], [END, 'end']];
/** Closing question (editorial report: CTA share and CTA during the voice). */
export const CTAS: {from: number; to: number}[] = [{from: 41.2, to: 45}];
const HOOK = [0, 5.7] as const;
const KEYWORDS = /^(poids|portance|vitesse|aile|air|décrochage|tonnes|quatre|kilos)/i;
/** Weight in meganewtons: 575 t × 9.81. */
const WEIGHT_MN = (MASS_T * 1000 * 9.81) / 1e6;
const LIFT_WORD = wordTime(captions, /^portance/i, WEIGHT) ?? 11.4;

const win = (t: number, a: number, b: number, f = 0.25) => smooth(a - f, a, t) * (1 - smooth(b, b + f, t));
const project = (t: number, p: V3 | {x: number; y: number; z: number}) => {
  const v = viewAt(t);
  const point: V3 = Array.isArray(p) ? p : [p.x, p.y, p.z];
  return projectToScreen({pos: v.pos, target: v.target, fov: v.fov}, point, W, H);
};

const Hook: React.FC<{t: number}> = ({t}) => {
  const a = win(t, HOOK[0] + 0.15, HOOK[1]);
  if (a <= 0) return null;
  const tons = countUp(t, 0.2, 1.6, 0, MASS_T);
  return (
    <div style={{position: 'absolute', top: SAFE.top + 70, left: SAFE.left, right: SAFE.right, textAlign: 'center', fontFamily: th.font, opacity: a}}>
      <div style={{fontSize: 160, fontWeight: 800, color: th.text, textShadow: neonShadow(th.primary, 1.6), letterSpacing: -2}}>
        {frNumber(Math.round(tons))}&nbsp;t
      </div>
      <div style={{fontSize: 60, fontWeight: 700, color: th.primary, textShadow: neonShadow(th.primary), opacity: smooth(1.3, 1.7, t), letterSpacing: 4}}>DANS LE CIEL.</div>
      <div style={{marginTop: 26, fontSize: 52, fontWeight: 700, color: th.secondary, textShadow: neonShadow(th.secondary), opacity: smooth(2.6, 3.0, t)}}>
        {typed('…SANS TOMBER ?', t, 2.6, 18)}
      </div>
    </div>
  );
};

/** Weight then lift, labelled next to their arrows. */
const ForcesHud: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  const c = liftOrigin(t);
  const plane = project(t, c);
  const down = project(t, [c.x, c.y - 44, c.z]);
  const up = project(t, [c.x, c.y + 44, c.z]);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: alpha}}>
      {t < WEIGHT && plane.visible && <Reticle x={plane.x} y={plane.y} t={t} size={230} appear={win(t, 3.4, WEIGHT - 0.1)} label="GROS-PORTEUR" value="72 m · 80 m" />}
      <Readout label="POIDS ↓" value={`${frNumber(WEIGHT_MN, 1)} MN`} color={th.danger} size={58} opacity={win(t, WEIGHT + 0.8, WING - 0.1)}
        style={{left: Math.min(W - SAFE.right - 330, down.x + 40), top: Math.min(H - SAFE.bottom - 760, down.y - 60)}} />
      <Readout label="PORTANCE ↑" value={`${frNumber(WEIGHT_MN, 1)} MN`} color={th.secondary} size={58} opacity={win(t, LIFT_WORD, WING - 0.1)}
        style={{left: Math.min(W - SAFE.right - 330, up.x + 40), top: Math.max(SAFE.top + 40, up.y - 40)}} />
      <Readout label="MASSE" value={`${MASS_T} t`} size={44} opacity={win(t, WEIGHT + 0.4, WING - 0.1)} style={{left: SAFE.left + 30, top: SAFE.top + 40}} />
    </div>
  );
};

/** Wind tunnel: low pressure above, high below, air pushed down behind the wing. */
const WingHud: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  const top = project(t, TUNNEL_TOP);
  const bottom = project(t, TUNNEL_BOTTOM);
  const wake = project(t, TUNNEL_WAKE);
  const label = (x: number, y: number, text: string, sub: string, c: string, on: number) => (
    <div style={{
      position: 'absolute', left: Math.max(SAFE.left, Math.min(W - SAFE.right - 360, x - 180)), top: y, width: 360, textAlign: 'center',
      fontFamily: th.font, opacity: on, color: c, textShadow: neonShadow(c, 0.9),
    }}>
      <div style={{fontSize: 40, fontWeight: 800}}>{text}</div>
      <div style={{fontSize: 24, letterSpacing: 3, opacity: 0.85}}>{sub}</div>
    </div>
  );
  return (
    <div style={{position: 'absolute', inset: 0, opacity: alpha}}>
      <Readout label="COUPE DE L'AILE" value="INCIDENCE 6°" size={44} style={{left: SAFE.left + 30, top: SAFE.top + 40}} opacity={smooth(WING + 0.3, WING + 0.8, t)} />
      {top.visible && label(top.x, top.y - 150, 'PRESSION −', 'AIR PLUS RAPIDE', th.secondary, smooth(14.2, 14.8, t))}
      {bottom.visible && label(bottom.x, Math.min(1040, bottom.y + 40), 'PRESSION +', 'DESSOUS', th.primary, smooth(15.0, 15.6, t))}
      {wake.visible && label(wake.x, wake.y + 30, 'AIR ↓', "DÉVIÉ VERS LE BAS", th.warn, smooth(16.2, 16.8, t))}
    </div>
  );
};

/** Take-off roll: speed, lift/weight ratio growing as v². */
const SpeedHud: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  const s = planeAt(t);
  const ratio = Math.min(1, s.lift);
  const off = win(t, LIFTOFF, STALL_IN, 0.15);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: alpha}}>
      <VersusPanel style={{left: (W - 860) / 2, top: SAFE.top + 30}} width={860}
        a={{label: 'VITESSE', value: `${frNumber(s.speed)} km/h`}}
        b={{label: 'PORTANCE', value: `${frNumber(ratio * MASS_T)} t`, color: th.secondary}}
        delta={{label: 'PORTANCE / POIDS', value: `${Math.round(ratio * 100)} %`, color: ratio >= 1 ? th.secondary : th.warn}} />
      <Gauge value={ratio} color={ratio >= 1 ? th.secondary : th.warn} width={860} segments={25} style={{left: (W - 860) / 2, top: SAFE.top + 330}} />
      {off > 0 && (
        <div style={{
          position: 'absolute', top: SAFE.top + 400, left: 0, right: 0, textAlign: 'center', fontFamily: th.font, fontWeight: 800,
          fontSize: 66, color: th.secondary, textShadow: neonShadow(th.secondary, 1.2), opacity: off,
        }}><span style={{background: 'rgba(0,10,16,0.7)', padding: '6px 22px', border: `2px solid ${th.secondary}88`}}>DÉCOLLAGE ✓</span></div>
      )}
    </div>
  );
};

/** Stall: speed falls, lift collapses. */
const StallHud: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const a = win(t, STALL_IN + 0.1, RECOVER - 0.1, 0.15);
  if (a <= 0) return null;
  const s = planeAt(t);
  const alert = win(t, STALL, RECOVER - 0.2, 0.05);
  const blink = frame % 8 < 5;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Readout label="VITESSE" value={`${frNumber(s.speed)} km/h`} color={s.speed < 230 ? th.danger : th.primary} size={52} opacity={a} style={{left: SAFE.left + 30, top: SAFE.top + 200}} />
      <Readout label="PORTANCE / POIDS" value={`${Math.round(s.lift * 100)} %`} color={s.lift < 0.9 ? th.danger : th.secondary} size={52} opacity={a}
        style={{right: SAFE.right + 30, top: SAFE.top + 200}} align="right" />
      {alert > 0 && (
        <div style={{
          position: 'absolute', top: SAFE.top + 50, left: SAFE.left + 20, right: SAFE.right + 20, textAlign: 'center',
          fontFamily: th.font, fontWeight: 800, fontSize: 78, color: th.danger, opacity: alert * (blink ? 1 : 0.35),
          textShadow: neonShadow(th.danger, 1.6), border: `4px solid ${th.danger}`, padding: '10px 0', background: 'rgba(40,0,8,0.45)',
        }}>⚠ DÉCROCHAGE</div>
      )}
    </div>
  );
};

const RuleCard: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  const row = (on: number, big: string, note: string, c: string) => (
    <div style={{opacity: on, transform: `translateX(${(1 - on) * -40}px)`, marginTop: 22}}>
      <div style={{fontSize: 60, fontWeight: 800, color: c, textShadow: neonShadow(c, 1.1), whiteSpace: 'nowrap'}}>{big}</div>
      <div style={{fontSize: 26, letterSpacing: 4, color: c, opacity: 0.85}}>{note}</div>
    </div>
  );
  return (
    <div style={{
      position: 'absolute', top: SAFE.top + 20, left: SAFE.left + 30, right: SAFE.right + 10, fontFamily: th.font, opacity: alpha,
      padding: '24px 34px', border: `2px solid ${th.primary}66`, background: 'rgba(0,18,28,0.55)',
    }}>
      <div style={{fontSize: 34, letterSpacing: 8, color: th.primary, textShadow: neonShadow(th.primary, 0.6)}}>{typed('> RÈGLE', t, RULE + 0.2, 18)}</div>
      {row(smooth(35.8, 36.3, t), 'PORTANCE ∝ VITESSE²', '×2 EN VITESSE = ×4 EN PORTANCE', th.secondary)}
      {row(smooth(37.8, 38.3, t), '≈ 680 kg / m²', "575 t SUR 845 m² D'AILE", th.warn)}
      <div style={{marginTop: 20, fontSize: 30, color: th.text, opacity: 0.7 * smooth(39, 39.5, t)}}>L = ½ ρ v² S C<sub>L</sub></div>
    </div>
  );
};

const Question: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 720, left: SAFE.left + 20, right: SAFE.right + 20, textAlign: 'center', fontFamily: th.font,
      opacity: alpha, transform: `scale(${0.94 + 0.06 * alpha})`,
    }}>
      <div style={{fontSize: 30, letterSpacing: 8, color: th.primary, marginBottom: 18}}>{typed('> QUESTION', t, END, 20)}</div>
      <div style={{fontSize: 70, fontWeight: 800, lineHeight: 1.15, color: th.text, textShadow: neonShadow(th.secondary, 1.2)}}>
        Et là-haut, où l'air est trois fois plus léger&nbsp;?
      </div>
    </div>
  );
};

export const TextOverlay: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const hud = layerAlpha(PLAN, t, 'hud');
  const diagram = layerAlpha(PLAN, t, 'diagram');
  const cta = layerAlpha(PLAN, t, 'cta');
  const caps = layerAlpha(PLAN, t, 'captions') * (1 - win(t, HOOK[0], HOOK[1] - 0.1, 0.1));
  const danger = t >= STALL && t < RECOVER;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <ScanLines t={t} opacity={0.9} color={th.primary} />
      <HudFrame theme={th} t={t} status={danger ? 'ALERTE · DÉCROCHAGE' : t >= WING && t < RUNWAY ? 'SOUFFLERIE · COUPE D’AILE' : 'HOLO-SCAN · GROS-PORTEUR 575 t'}
        color={danger ? th.danger : th.primary} opacity={1 - smooth(END + 2.5, 45, t)}
        box={{left: SAFE.left - 20, top: SAFE.top - 80, right: SAFE.right - 30, bottom: SAFE.bottom - 60}} />
      <Hook t={t} />
      <ForcesHud t={t} alpha={hud * (t < WING ? 1 : 0)} />
      <WingHud t={t} alpha={diagram * (t < RUNWAY ? 1 : 0)} />
      <SpeedHud t={t} alpha={hud * (t >= RUNWAY && t < STALL_IN ? 1 : 0)} />
      <StallHud t={t} frame={frame} />
      <RuleCard t={t} alpha={diagram * (t >= RULE ? 1 : 0)} />
      <Question t={t} alpha={cta} />
      <Subtitles captions={captions} t={t} theme={th} keywords={KEYWORDS} opacity={caps} />
    </div>
  );
};
