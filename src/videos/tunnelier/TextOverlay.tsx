/** HUD, hook, subtitles and closing question of Tunnelier (one kind of overlay at a time). */
import React from 'react';
import {smooth} from '../../core/animation';
import {SAFE} from '../../shared/ui/PlatformSafeArea';
import {layerAlpha, type OverlayPlan} from '../../shared/ui/OverlayPolicy';
import {projectToScreen} from '../../shared/three/projection';
import type {Captions} from '../../shared/captions/CaptionTrack';
import {
  Gauge, HudFrame, Readout, Reticle, ScanLines, Subtitles, VersusPanel, countUp, frNumber, neonShadow, typed, type V3,
} from '../../shared/holo';
import {TBM} from '../../assets/holo/Tbm';
import {
  COLLAPSE, END, PRESSURE, RESTORE, RING, SCREW, THEME, THRUST, WHEEL, chamberPressure, face, faceZ, placedSegments, viewAt,
} from './Scene3D';
import captionsData from './captions.json';

const captions = captionsData as Captions;
const W = 1080;
const H = 1920;
const th = THEME;

export const PLAN: OverlayPlan = [[0, 'story'], [PRESSURE, 'science'], [SCREW, 'story'], [END, 'end']];
/** Closing question (editorial report: CTA share and CTA during the voice). */
export const CTAS: {from: number; to: number}[] = [{from: 41.2, to: 45}];
const HOOK = [0, 5.7] as const;
const KEYWORDS = /^(roue|molettes|pression|sol|vis|déblais|vérins|anneau|voussoirs|béton|bouchon)/i;

const win = (t: number, a: number, b: number, f = 0.25) => smooth(a - f, a, t) * (1 - smooth(b, b + f, t));
const project = (t: number, p: V3) => {
  const v = viewAt(t);
  return projectToScreen({pos: v.pos, target: v.target, fov: v.fov}, p, W, H);
};
const rel = (t: number, d: V3): V3 => {
  const f = face(t);
  return [f[0] + d[0], f[1] + d[1], f[2] + d[2]];
};

const Hook: React.FC<{t: number}> = ({t}) => {
  const a = win(t, HOOK[0] + 0.15, HOOK[1]);
  if (a <= 0) return null;
  return (
    <div style={{position: 'absolute', top: SAFE.top + 70, left: SAFE.left, right: SAFE.right, textAlign: 'center', fontFamily: th.font, opacity: a}}>
      <div style={{fontSize: 150, fontWeight: 800, color: th.text, textShadow: neonShadow(th.primary, 1.6), letterSpacing: -2}}>
        {frNumber(Math.round(countUp(t, 0.2, 1.4, 0, 100)))}&nbsp;m
      </div>
      <div style={{fontSize: 60, fontWeight: 700, color: th.primary, textShadow: neonShadow(th.primary), opacity: smooth(1.2, 1.6, t), letterSpacing: 4}}>SOUS LA VILLE.</div>
      <div style={{marginTop: 26, fontSize: 50, fontWeight: 700, color: th.secondary, textShadow: neonShadow(th.secondary), opacity: smooth(2.6, 3.0, t)}}>
        {typed('…ET RIEN NE S’EFFONDRE ?', t, 2.6, 20)}
      </div>
    </div>
  );
};

const StoryHud: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  const head = project(t, rel(t, [0, 0, 0]));
  const edge = project(t, rel(t, [3.4, 0.6, -0.3]));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: alpha}}>
      {t < WHEEL && head.visible && <Reticle x={head.x} y={head.y} t={t} size={200} appear={win(t, 3.4, WHEEL - 0.1)} label="TUNNELIER" value="Ø 9,8 m" />}
      <Readout label="ROUE DE COUPE" value="Ø 9,8 m" size={54} opacity={win(t, WHEEL + 0.4, PRESSURE - 0.1)} style={{left: SAFE.left + 30, top: SAFE.top + 40}} />
      <Readout label="ROTATION" value="QUELQUES TR/MIN" color={th.secondary} size={44} opacity={win(t, WHEEL + 1.2, PRESSURE - 0.1)} style={{left: SAFE.left + 30, top: SAFE.top + 190}} />
      {t >= 9.4 && edge.visible && <Reticle x={edge.x} y={edge.y} t={t} size={130} color={th.warn} appear={win(t, 9.8, PRESSURE - 0.1)} label="MOLETTE" labelSide="left" />}
    </div>
  );
};

/** Pressure balance, and the demo of what happens without it. */
const PressureHud: React.FC<{t: number; frame: number; alpha: number}> = ({t, frame, alpha}) => {
  if (alpha <= 0) return null;
  const p = chamberPressure(t);
  const bad = p < 0.7;
  const blink = frame % 8 < 5;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: alpha}}>
      <VersusPanel style={{left: (W - 860) / 2, top: SAFE.top + 30}} width={860} opacity={smooth(PRESSURE + 0.4, PRESSURE + 0.9, t)}
        a={{label: 'POUSSÉE DU SOL', value: '100 %', color: bad ? th.danger : th.primary}}
        b={{label: 'CHAMBRE', value: `${Math.round(p * 100)} %`, color: bad ? th.danger : th.secondary}}
        delta={{label: bad ? '' : '', value: bad ? 'DÉSÉQUILIBRE' : 'ÉQUILIBRE ✓', color: bad ? th.danger : th.secondary}} />
      <Gauge label="PRESSION DANS LA CHAMBRE" value={p} color={bad ? th.danger : th.secondary} width={860} segments={25}
        style={{left: (W - 860) / 2, top: SAFE.top + 330}} opacity={smooth(PRESSURE + 0.9, PRESSURE + 1.4, t)} />
      {win(t, COLLAPSE, RESTORE, 0.1) > 0 && (
        <div style={{
          position: 'absolute', top: SAFE.top + 450, left: SAFE.left + 20, right: SAFE.right + 20, textAlign: 'center',
          fontFamily: th.font, fontWeight: 800, color: th.danger, opacity: win(t, COLLAPSE, RESTORE, 0.1) * (blink ? 1 : 0.4),
          textShadow: neonShadow(th.danger, 1.4), border: `4px solid ${th.danger}`, padding: '8px 0', background: 'rgba(40,0,8,0.5)',
        }}>
          <div style={{fontSize: 64}}>⚠ EFFONDREMENT</div>
          <div style={{fontSize: 24, letterSpacing: 4}}>SIMULATION · SANS PRESSION</div>
        </div>
      )}
    </div>
  );
};

const MachineHud: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  const adv = faceZ(0) - faceZ(t);
  const placed = placedSegments(t);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: alpha}}>
      <Readout label="DÉBLAIS" value="VIS → TAPIS" color={th.warn} size={50} opacity={win(t, SCREW + 0.4, THRUST - 0.1)} style={{left: SAFE.left + 30, top: SAFE.top + 40}} />
      <Readout label="TRAIN SUIVEUR" value="≈ 100 m" size={44} opacity={win(t, SCREW + 2, THRUST - 0.1)} style={{left: SAFE.left + 30, top: SAFE.top + 200}} />
      <Readout label="VÉRINS DE POUSSÉE" value={`AVANCE ${frNumber(adv, 2)} m`} color={th.secondary} size={50} opacity={win(t, THRUST + 0.4, RING - 0.1)}
        style={{left: SAFE.left + 30, top: SAFE.top + 40}} />
      <Gauge label="APPUI SUR LE DERNIER ANNEAU" value={adv / TBM.ringWidth} color={th.secondary} width={600} opacity={win(t, THRUST + 0.8, RING - 0.1)}
        style={{left: SAFE.left + 30, top: SAFE.top + 220}} />
      <Readout label="ÉRECTEUR · ANNEAU EN BÉTON" value={`VOUSSOIRS ${placed} / ${TBM.segments}`} color={th.warn} size={50}
        opacity={win(t, RING + 0.4, END - 0.1)} style={{left: SAFE.left + 30, top: SAFE.top + 40}} />
      <Readout label="CYCLE" value="CREUSER → POUSSER → POSER" size={36} opacity={win(t, 39.2, END - 0.1)} style={{left: SAFE.left + 30, top: SAFE.top + 200}} />
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
        Combien de mètres creuse-t-il par jour&nbsp;?
      </div>
    </div>
  );
};

export const TextOverlay: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const hud = layerAlpha(PLAN, t, 'hud');
  const diagram = layerAlpha(PLAN, t, 'diagram');
  const cta = layerAlpha(PLAN, t, 'cta');
  const caps = layerAlpha(PLAN, t, 'captions') * (1 - win(t, HOOK[0], HOOK[1] - 0.1, 0.1));
  const danger = chamberPressure(t) < 0.7;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <ScanLines t={t} opacity={0.9} color={th.primary} />
      <HudFrame theme={th} t={t} status={danger ? 'ALERTE · PERTE DE PRESSION' : 'HOLO-SCAN · TUNNELIER Ø 9,8 m · −24 m'}
        color={danger ? th.danger : th.primary} opacity={1 - smooth(END + 2.5, 45, t)}
        box={{left: SAFE.left - 20, top: SAFE.top - 80, right: SAFE.right - 30, bottom: SAFE.bottom - 60}} />
      <Hook t={t} />
      <StoryHud t={t} alpha={hud * (t < PRESSURE ? 1 : 0)} />
      <PressureHud t={t} frame={frame} alpha={diagram * (t < SCREW ? 1 : 0)} />
      <MachineHud t={t} alpha={hud * (t >= SCREW ? 1 : 0)} />
      <Question t={t} alpha={cta} />
      <Subtitles captions={captions} t={t} theme={th} keywords={KEYWORDS} opacity={caps} />
    </div>
  );
};
