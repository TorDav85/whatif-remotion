/**
 * Library sheet of the holo style (Studio › Bibliotheque › HoloKit): grid, wireframe bird, pulsed
 * current, lightning, ground rings and HUD pieces, to reuse the style on another subject.
 */
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {smooth} from '../../core/animation';
import {SAFE} from '../../shared/ui/PlatformSafeArea';
import {projectToScreen} from '../../shared/three/projection';
import {
  ElectricArc, ElectronDots, Gauge, HOLO_DEFAULT, PulseRings, PulseTube, Readout, Reticle, ScanLines, Subtitles,
  VersusPanel, WireframeScene, catenary, type V3,
} from '../../shared/holo';
import {Bird} from './Bird';

export const HOLO_KIT_FRAMES = 180;
const th = HOLO_DEFAULT;
const SAMPLE = {segments: [{start: 0.3, end: 5.8, text: 'Sous-titres holo'}]};

export const HoloKitShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const a = t * 0.5;
  const view = {pos: [Math.sin(a) * 2.2, 1.1, Math.cos(a) * 2.2] as V3, target: [0, 0.35, 0] as V3, fov: 45};
  const cable = useMemo(() => catenary([-6, 0.3, 0], [6, 0.3, 0], 0.15), []);
  const bird = projectToScreen(view, [0, 0.5, 0], width, height);
  const wing = 0.5 + 0.5 * Math.sin(t * 1.6);
  return (
    <AbsoluteFill style={{background: th.bg}}>
      <ThreeCanvas width={width} height={height} linear={false} flat gl={{antialias: true}}>
        <WireframeScene view={view} theme={th} grid={{step: 0.5, size: 20, near: 2, far: 9}}>
          <PulseTube points={cable} t={t} color={th.primary} radius={0.015} count={10} speed={0.08} />
          <ElectronDots points={cable} t={t} color={th.primary} count={50} size={0.04} />
          <Bird position={[0, 0.315, 0]} pose={{left: {open: wing, raise: 0.3}, right: {open: wing, raise: 0.3}}} color={th.secondary} fill={0.45} />
          <ElectricArc from={[0.3, 0.3, 0]} to={[0.5, 0.8, -0.25]} frame={frame} color={th.danger} radius={0.003} intensity={smooth(2, 2.3, t) * (1 - smooth(4, 4.3, t))} />
          <PulseRings t={t} start={0.2} origin={[0, 0, 0]} color={th.primary} speed={2} spacing={0.8} count={4} life={3} radius={8} intensity={0.5} />
        </WireframeScene>
      </ThreeCanvas>
      <ScanLines t={t} />
      {bird.visible && <Reticle x={bird.x} y={bird.y} t={t} label="RETICLE" value="[ ]" />}
      <Readout label="READOUT" value="20 000 V" style={{left: SAFE.left + 30, top: SAFE.top + 40}} />
      <Gauge label="GAUGE" value={0.5 + 0.4 * Math.sin(t * 2)} style={{left: SAFE.left + 30, top: SAFE.top + 200}} />
      <VersusPanel style={{left: 140, top: 1330}} width={800} a={{label: 'V1', value: '230 V'}} b={{label: 'V2', value: '0 V', color: th.warn}}
        delta={{label: 'ΔV =', value: '230 V', color: th.danger}} />
      <Subtitles captions={SAMPLE} t={t} />
    </AbsoluteFill>
  );
};
