import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {seeded} from '../../kit';
import {CityEnvironment, LayoutSurroundings} from '../LayoutScene';
import {CityItem} from '../registry';
import {ApartmentInterior} from './ApartmentInterior';
import {resolveEpisodeSet, type EpisodeSet, type EpisodeSetSpec} from './episode';
import {FarBlocks} from './FarBlocks';

/** Resolved once per spec (place + variants): the frozen world is read, never written. */
export const useEpisodeSet = (spec: EpisodeSetSpec): EpisodeSet => {
  const key = JSON.stringify(spec);
  return useMemo(() => resolveEpisodeSet(spec), [key]);
};

/**
 * A place of the reference city with the episode's variants, ready for a ThreeCanvas (add the CameraRig
 * and the characters as children). `inside` draws the place's interior and hides its host building.
 */
export const ReferenceScene: React.FC<{set: EpisodeSet; inside?: boolean; surroundings?: boolean; children?: React.ReactNode}> = ({set, inside = false, surroundings = true, children}) => {
  const {environment: env, place, near, far, layout} = set;
  const hidden = inside ? place.interior?.building : undefined;
  return (
    <>
      <CityEnvironment night={env.night} palette={env.palette} fogNear={env.fogNear} fogFar={env.fogFar} />
      {surroundings && <LayoutSurroundings layout={layout} snow={env.snow} />}
      {near.map((it) => (it.id === hidden ? null : <CityItem key={it.id} item={it} lit={env.lit} />))}
      <FarBlocks items={hidden ? far.filter((it) => it.id !== hidden) : far} snow={env.snow} />
      {inside && <ApartmentInterior place={place} lit={env.lit} />}
      {children}
    </>
  );
};

/** Rain streaks or snowflakes over the image (outside the canvas), driven by the frame only. */
export const WeatherOverlay: React.FC<{set: EpisodeSet; frame: number; width: number; height: number}> = ({set, frame, width, height}) => {
  const {rain, snow} = set.environment;
  const drops = useMemo(() => {
    const r = seeded(7);
    return Array.from({length: 180}, () => ({x: r(), y: r(), s: 0.6 + r() * 0.8}));
  }, []);
  if (!rain && !snow) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={width} height={height}>
        {drops.map((d, i) => {
          if (rain) {
            const y = ((d.y + frame * 0.045 * d.s) % 1) * (height + 200) - 100;
            const x = ((d.x + frame * 0.006) % 1) * width;
            return <line key={i} x1={x} y1={y} x2={x - 10 * d.s} y2={y + 60 * d.s} stroke="rgba(220,230,240,0.35)" strokeWidth={2 * d.s} />;
          }
          const y = ((d.y + frame * 0.004 * d.s) % 1) * height;
          const x = (d.x * width + Math.sin(frame * 0.05 + i) * 18) % width;
          return <circle key={i} cx={x} cy={y} r={4 * d.s} fill="rgba(255,255,255,0.8)" />;
        })}
      </svg>
    </AbsoluteFill>
  );
};
