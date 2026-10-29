import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CameraRig} from '../../shared/three/common';
import {SERIF} from '../../shared/ui/tokens';
import {smooth} from '../../core/animation';
import {generateCity} from './generator';
import {LayoutScene, layoutBounds} from './LayoutScene';
import type {CityLayout} from './registry';
import {sampleShots, shotsDuration} from './camera';

type V3 = [number, number, number];
export const CITY_LAYOUT_FRAMES = 12 * 30;

/** Duration follows the director's shots saved with the layout (12 s fly-over otherwise). */
export const calculateCityLayoutMetadata = async ({props}: {props: {layout: string}}) => {
  try {
    const r = await fetch(staticFile(`city-layouts/${props.layout}.json`));
    const l = (await r.json()) as CityLayout;
    const shots = l.camera?.shots ?? [];
    if (shots.length) return {durationInFrames: Math.max(30, Math.round(shotsDuration(shots) * 30))};
  } catch {
    // no saved layout yet: keep the default fly-over
  }
  return {durationInFrames: CITY_LAYOUT_FRAMES};
};

/** Loads public/city-layouts/<layout>.json (saved by `npm run city`) and films it. */
export const useCityLayout = (name: string) => {
  const [layout, setLayout] = useState<CityLayout | null>(null);
  const [handle] = useState(() => delayRender(`city layout ${name}`));
  useEffect(() => {
    fetch(staticFile(`city-layouts/${name}.json`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((l: CityLayout) => setLayout(l))
      .catch(() => setLayout(generateCity({}, name)))
      .finally(() => continueRender(handle));
  }, [name, handle]);
  return layout;
};

export const CityLayoutPreview: React.FC<{layout: string}> = ({layout: name}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const layout = useCityLayout(name);

  const plan = useMemo(() => {
    if (!layout) return null;
    const b = layoutBounds(layout);
    const roads = layout.items.filter((i) => i.type === 'road' && Math.abs(Math.sin(i.ry)) < 0.1);
    const street = roads.sort((a, c) => Math.abs(a.x - b.cx) - Math.abs(c.x - b.cx))[0];
    const sx = street ? street.x - 1.6 : b.cx;
    return {b, sx};
  }, [layout]);
  if (!layout || !plan) return <AbsoluteFill style={{background: '#000'}} />;

  const {b, sx} = plan;
  const shots = layout.camera?.shots ?? [];
  let pos: V3;
  let target: V3;
  let fov = t < 6 ? 50 : 60;
  if (shots.length) {
    const view = sampleShots(shots, t);
    pos = view.pos;
    target = view.target;
    fov = view.fov;
  } else if (t < 6) {
    const a = 0.6 + smooth(0, 6, t) * 1.1;
    const r = b.size * 0.95;
    pos = [b.cx + Math.sin(a) * r, b.size * 0.55, b.cz + Math.cos(a) * r];
    target = [b.cx, 0, b.cz];
  } else {
    const k = smooth(6, 12, t);
    const z = b.cz + b.size * 0.55 - k * b.size * 0.7;
    pos = [sx, 1.8 + (1 - smooth(6, 7.5, t)) * 30, z];
    target = [sx + 0.5, 3, z - 40];
  }

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
        <CameraRig position={pos} target={target} fov={fov} />
        <LayoutScene layout={layout} />
      </ThreeCanvas>
      <div style={{position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center', fontFamily: SERIF, color: '#F6E05E',
        fontSize: 34, letterSpacing: '0.2em', textShadow: '0 2px 12px rgba(0,0,0,0.6)'}}>
        {layout.name.toUpperCase()} · {layout.items.length} OBJETS
      </div>
    </AbsoluteFill>
  );
};
