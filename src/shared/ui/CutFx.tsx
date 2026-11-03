import React from 'react';
import {AbsoluteFill} from 'remotion';
import {cutLookAt, dipAt, type Cut} from './transitions';

/**
 * Wraps the filmed layer (usually the ThreeCanvas) and plays the cuts' transitions on it: whip,
 * zoom, flash, plus the existing dip to black. Everything is a function of t, so a still and the
 * render show the same frame.
 */
export const CutFx: React.FC<{cuts: Cut[]; t: number; width?: number; height?: number; children: React.ReactNode}> = ({cuts, t, width = 1080, height = 1920, children}) => {
  const look = cutLookAt(cuts, t, width, height);
  const dip = dipAt(cuts, t);
  const id = `cutfx-smear-${Math.round(look.smear)}`;
  const filters = [look.smear > 0.5 ? `url(#${id})` : '', look.blur > 0.3 ? `blur(${look.blur.toFixed(1)}px)` : ''].filter(Boolean).join(' ');
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      {look.smear > 0.5 && (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <filter id={id} x="-20%" y="0" width="140%" height="100%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${look.smear.toFixed(1)} 0`} />
          </filter>
        </svg>
      )}
      <AbsoluteFill style={{transform: look.transform, transformOrigin: look.origin, filter: filters || undefined}}>
        {children}
      </AbsoluteFill>
      {look.flash > 0.005 && <AbsoluteFill style={{background: '#fffaf0', opacity: look.flash, pointerEvents: 'none'}} />}
      {dip > 0 && <AbsoluteFill style={{background: '#000', opacity: dip, pointerEvents: 'none'}} />}
    </AbsoluteFill>
  );
};
