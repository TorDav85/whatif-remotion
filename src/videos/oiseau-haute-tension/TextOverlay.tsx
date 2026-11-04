/** HUD, hook, subtitles and closing question of OiseauHauteTension (one kind of overlay at a time). */
import React from 'react';
import {clamp01, smooth} from '../../core/animation';
import {SAFE} from '../../shared/ui/PlatformSafeArea';
import {layerAlpha, type OverlayPlan} from '../../shared/ui/OverlayPolicy';
import {projectToScreen} from '../../shared/three/projection';
import type {Captions} from '../../shared/captions/CaptionTrack';
import {
  Gauge, HudFrame, Readout, Reticle, ScanLines, Subtitles, VersusPanel, countUp, frNumber, neonShadow, typed, type V3,
} from '../../shared/holo';
import {BIRD, CLIMAX, CONTACT, END, FEET, FLOW, FOOT_A, FOOT_B, RULE, THEME, WING_TIP, WING_UP, viewAt} from './Scene3D';
import captionsData from './captions.json';

const captions = captionsData as Captions;
const W = 1080;
const H = 1920;
const th = THEME;

export const PLAN: OverlayPlan = [[0, 'story'], [FEET, 'science'], [WING_UP, 'story'], [CLIMAX, 'climax'], [RULE, 'science'], [END, 'end']];
/** Closing question (editorial report: CTA share and CTA during the voice). */
export const CTAS: {from: number; to: number}[] = [{from: 41.2, to: 45}];
const HOOK = [0, 5.7] as const;
const KEYWORDS = /^(volts?|potentiels?|courant|terre|pylône|différence|différents|corps)/i;

/** Phase-to-earth voltage of a 20 kV line (20 000 / √3). */
const PHASE_EARTH = 20000 / Math.sqrt(3);
const win = (t: number, a: number, b: number, f = 0.25) => smooth(a - f, a, t) * (1 - smooth(b, b + f, t));

const project = (t: number, p: V3) => {
  const v = viewAt(t);
  return projectToScreen({pos: v.pos, target: v.target, fov: v.fov}, p, W, H);
};

const Hook: React.FC<{t: number}> = ({t}) => {
  const a = win(t, HOOK[0] + 0.15, HOOK[1]);
  if (a <= 0) return null;
  const volts = countUp(t, 0.2, 1.5, 0, 20000);
  const line2 = smooth(1.2, 1.6, t);
  const line3 = smooth(2.6, 3.0, t);
  return (
    <div style={{position: 'absolute', top: SAFE.top + 70, left: SAFE.left, right: SAFE.right, textAlign: 'center', fontFamily: th.font, opacity: a}}>
      <div style={{fontSize: 150, fontWeight: 800, color: th.text, textShadow: neonShadow(th.primary, 1.6), letterSpacing: -2}}>
        {frNumber(Math.round(volts / 10) * 10)}&nbsp;V
      </div>
      <div style={{fontSize: 66, fontWeight: 700, color: th.primary, textShadow: neonShadow(th.primary), opacity: line2, letterSpacing: 4}}>SOUS SES PATTES.</div>
      <div style={{marginTop: 26, fontSize: 56, fontWeight: 700, color: th.secondary, textShadow: neonShadow(th.secondary), opacity: line3}}>
        {typed('…ET IL NE SENT RIEN.', t, 2.6, 22)}
      </div>
    </div>
  );
};

/** Bird target, then line readouts (story scenes 1–2). */
const StoryHud: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  const bird = project(t, [BIRD[0], BIRD[1] + 0.15, BIRD[2]]);
  const flow = win(t, FLOW + 0.2, FEET - 0.1);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: alpha}}>
      {bird.visible && (
        <Reticle x={bird.x} y={bird.y} t={t} size={t < FLOW ? 190 : 150} appear={win(t, 3.4, FEET - 0.2) * clamp01(1)}
          label="CIBLE" value={t < FLOW ? 'OISEAU · 0,4 m' : undefined} labelSide="below" />
      )}
      <Readout label="TENSION LIGNE" value={`${frNumber(20000)} V`} opacity={flow} style={{left: SAFE.left + 30, top: SAFE.top + 60}} size={60} />
      <Readout label="COURANT" value={`${frNumber(countUp(t, FLOW + 0.3, FLOW + 2, 0, 300))} A`} color={th.secondary} opacity={flow}
        style={{left: SAFE.left + 30, top: SAFE.top + 220}} size={60} />
      <Gauge label="FLUX DANS LE CÂBLE" value={0.55 + 0.25 * Math.sin(t * 2.2) ** 2} opacity={flow} width={430} style={{left: SAFE.left + 30, top: SAFE.top + 390}} />
    </div>
  );
};

/** Scene 2b: both feet at the same potential. */
const FeetPanel: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  // V1 = foot on the left of the screen, V2 = on the right.
  const a = project(t, FOOT_B);
  const b = project(t, FOOT_A);
  const zero = smooth(16.3, 16.7, t);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: alpha}}>
      {a.visible && <Reticle x={a.x} y={a.y} size={120} t={t} color={th.secondary} appear={smooth(FEET + 0.5, FEET + 1, t)} label="V1" labelSide="left" />}
      {b.visible && <Reticle x={b.x} y={b.y} size={120} t={t} color={th.secondary} appear={smooth(FEET + 0.8, FEET + 1.3, t)} label="V2" labelSide="right" />}
      <VersusPanel style={{left: (W - 860) / 2, top: SAFE.top + 30}} width={860}
        a={{label: 'V1 · PATTE G', value: `${frNumber(PHASE_EARTH)} V`, color: th.secondary}}
        b={{label: 'V2 · PATTE D', value: `${frNumber(PHASE_EARTH)} V`, color: th.secondary}}
        delta={{label: 'ΔV ≈', value: '0,003 V', color: th.secondary}} opacity={smooth(FEET + 0.4, FEET + 0.9, t)} />
      <div style={{
        position: 'absolute', top: SAFE.top + 345, left: 0, right: 0, textAlign: 'center', fontFamily: th.font, fontSize: 24,
        letterSpacing: 3, color: th.primary, opacity: 0.8 * smooth(FEET + 0.9, FEET + 1.4, t),
      }}>TENSION CÂBLE ↔ TERRE · LIGNE 20 kV</div>
      <div style={{
        position: 'absolute', top: SAFE.top + 400, left: 0, right: 0, textAlign: 'center', fontFamily: th.font, fontWeight: 800,
        fontSize: 54, color: th.secondary, textShadow: neonShadow(th.secondary, 1.2), opacity: zero, transform: `scale(${1.15 - 0.15 * zero})`,
      }}><span style={{background: 'rgba(0, 10, 16, 0.78)', padding: '6px 20px', border: `2px solid ${th.secondary}88`}}>POTENTIAL: 0V → I ≈ 0 A</span></div>
    </div>
  );
};

/** Scene 3: the wing closes in on the grounded cross-arm, then the short circuit. */
const FaultHud: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const near = win(t, WING_UP + 0.6, CONTACT + 0.1, 0.2);
  const alert = win(t, CONTACT, CLIMAX - 0.1, 0.05);
  const tip = project(t, WING_TIP);
  const dist = Math.max(0, 0.42 * (1 - smooth(WING_UP + 0.3, CONTACT, t)));
  const blink = frame % 8 < 5;
  return (
    <>
      {near > 0 && tip.visible && (
        <Reticle x={tip.x} y={tip.y} size={140} t={t} color={th.warn} appear={near} label="AILE ↔ PYLÔNE" value={`${frNumber(dist, 2)} m`} labelSide="left" />
      )}
      {near > 0 && <Readout label="PYLÔNE" value="RELIÉ À LA TERRE · 0 V" color={th.warn} opacity={near} size={44} style={{left: SAFE.left + 30, top: SAFE.top + 60}} />}
      {alert > 0 && (
        <div style={{
          position: 'absolute', top: SAFE.top + 50, left: SAFE.left + 20, right: SAFE.right + 20, textAlign: 'center',
          fontFamily: th.font, fontWeight: 800, fontSize: 78, color: th.danger, opacity: alert * (blink ? 1 : 0.35),
          textShadow: neonShadow(th.danger, 1.6), border: `4px solid ${th.danger}`, padding: '10px 0', background: 'rgba(40,0,8,0.45)',
        }}>⚠ COURT-CIRCUIT</div>
      )}
    </>
  );
};

const ClimaxPanel: React.FC<{t: number}> = ({t}) => {
  const a = win(t, CLIMAX + 0.1, 28.0);
  if (a <= 0) return null;
  return (
    <VersusPanel style={{left: (W - 860) / 2, top: SAFE.top + 30}} width={860} opacity={a}
      a={{label: 'V1 · CÂBLE', value: `${frNumber(PHASE_EARTH)} V`, color: th.danger}}
      b={{label: 'V2 · PYLÔNE', value: '0 V', color: th.warn}}
      delta={{label: 'ΔV =', value: `${frNumber(Math.round(PHASE_EARTH / 100) * 100)} V`, color: th.danger}} />
  );
};

/** Scene 4: the rule as a two-line diagram. */
const RuleCard: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  const row = (on: number, left: string, right: string, c: string, note: string) => (
    <div style={{opacity: on, transform: `translateX(${(1 - on) * -40}px)`, marginTop: 22}}>
      <div style={{fontSize: 64, fontWeight: 800, color: c, textShadow: neonShadow(c, 1.1), whiteSpace: 'nowrap'}}>{left} <span style={{color: th.text}}>→</span> {right}</div>
      <div style={{fontSize: 26, letterSpacing: 4, color: c, opacity: 0.85}}>{note}</div>
    </div>
  );
  return (
    <div style={{
      position: 'absolute', top: SAFE.top + 20, left: SAFE.left + 30, right: SAFE.right + 10, fontFamily: th.font, opacity: alpha,
      padding: '24px 34px', border: `2px solid ${th.primary}66`, background: 'rgba(0,18,28,0.55)',
    }}>
      <div style={{fontSize: 34, letterSpacing: 8, color: th.primary, textShadow: neonShadow(th.primary, 0.6)}}>{typed('> RÈGLE', t, RULE + 0.2, 18)}</div>
      {row(smooth(34.6, 35.1, t), 'ΔV = 0', 'I = 0', th.secondary, 'UN SEUL FIL · OISEAU INDEMNE')}
      {row(smooth(36.3, 36.8, t), 'ΔV ≠ 0', 'I ≠ 0', th.danger, 'FIL + TERRE · COURANT DANS LE CORPS')}
      <div style={{marginTop: 20, fontSize: 30, color: th.text, opacity: 0.7 * smooth(38, 38.5, t)}}>I = ΔV / R</div>
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
        Et l'écureuil, pourquoi fait-il sauter le courant&nbsp;?
      </div>
    </div>
  );
};

export const TextOverlay: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const hud = layerAlpha(PLAN, t, 'hud');
  const diagram = layerAlpha(PLAN, t, 'diagram');
  const cta = layerAlpha(PLAN, t, 'cta');
  const caps = layerAlpha(PLAN, t, 'captions') * (1 - win(t, HOOK[0], HOOK[1] - 0.1, 0.1));
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <ScanLines t={t} opacity={0.9} color={th.primary} />
      <HudFrame theme={th} t={t} status={t < CONTACT || t >= RULE ? 'HOLO-SCAN · LIGNE HTA 20 kV' : 'ALERTE · DÉFAUT À LA TERRE'}
        color={t >= CONTACT && t < RULE ? th.danger : th.primary} opacity={1 - smooth(END + 2.5, 45, t)}
        box={{left: SAFE.left - 20, top: SAFE.top - 80, right: SAFE.right - 30, bottom: SAFE.bottom - 60}} />
      <Hook t={t} />
      <StoryHud t={t} alpha={hud * (t < FEET ? 1 : 0)} />
      <FeetPanel t={t} alpha={diagram * (t < WING_UP ? 1 : 0)} />
      {t >= WING_UP && t < RULE && <FaultHud t={t} frame={frame} />}
      <ClimaxPanel t={t} />
      <RuleCard t={t} alpha={diagram * (t >= RULE ? 1 : 0)} />
      <Question t={t} alpha={cta} />
      <Subtitles captions={captions} t={t} theme={th} keywords={KEYWORDS} opacity={caps} />
    </div>
  );
};
