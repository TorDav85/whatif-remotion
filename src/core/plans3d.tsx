import React from 'react';
import {createPortal} from 'react-dom';
import {getInputProps, Img, Internals} from 'remotion';
import {ThreeCanvas} from '@remotion/three';

/**
 * Cache of the 3D shots, apart from voice, captions and overlays (docs/acceleration-rendu.md).
 *
 * A composition draws its 3D through <Layer3D> instead of <ThreeCanvas> (same props). Without the
 * cache props below nothing changes: the canvas is drawn as before, pixel for pixel.
 * - `__layer3d: 'only'`: only the canvas is drawn, alone at the top left of the page (outside any
 *   transform or opacity of its parents), everything else is hidden. scripts/project/plans3d.mjs
 *   renders each shot like this once, into .cache/plans3d.
 * - `__plans3d`: on the frames of a cached shot, the canvas is replaced by its image, placed where
 *   the canvas would be (same box, so the parents' effects apply once, as before). Overlays, captions
 *   and audio are drawn live on top: changing a text or a voice re-renders no 3D.
 */
export type Plan3D = {
  /** stable id within the composition ("rue-marc/porte", "impact") */
  id: string;
  /** first frame and length in the composition */
  from: number;
  durationInFrames: number;
  /**
   * Everything outside the scene code that decides the shot's images (camera, decor, times…), as
   * plain JSON. Part of the cache key: changing it re-renders this shot only.
   */
  inputs: unknown;
};

/** One composition's shots, for the cache (src/core/plans3d-manifests.ts). */
export type Plans3DManifest = {
  composition: string;
  /**
   * Source files of the 3D scene, from the project root. Their whole import graph (minus `perPlan`)
   * is hashed: a change there re-renders every shot of the composition.
   */
  scene: string[];
  /** Data files whose part that matters for each shot is already in its `inputs` (shot table, frozen world…). */
  perPlan?: string[];
  plans: (fps: number) => Plan3D[];
};

export type Plan3DSegment = {from: number; durationInFrames: number; url: string};
export type Plans3DProps = {__layer3d?: 'only'; __plans3d?: Plan3DSegment[]};

export const LAYER3D_CLASS = 'whatif-layer3d';
const ONLY_CSS = `body * {visibility: hidden !important;} .${LAYER3D_CLASS}, .${LAYER3D_CLASS} * {visibility: visible !important;}`;

const cacheProps = (): Plans3DProps => {
  try {
    return getInputProps() as Plans3DProps;
  } catch {
    return {};
  }
};

/** File name of a cached frame: index within the shot. */
export const plan3dFrameName = (index: number) => `${String(index).padStart(5, '0')}.png`;

type CanvasProps = React.ComponentProps<typeof ThreeCanvas>;

export const Layer3D: React.FC<CanvasProps> = (props) => {
  // Absolute frame of the composition, even inside a <Sequence>: shots are cut on it.
  const frame = Internals.Timeline.useTimelinePosition();
  const {__layer3d, __plans3d} = cacheProps();
  const segment = __plans3d?.find((s) => frame >= s.from && frame < s.from + s.durationInFrames);
  if (segment) {
    // Same box as React Three Fiber's <Canvas> wrapper (position relative, 100 %, then width/height/style).
    // willChange: its own compositor layer, like the canvas, so text and veils on top blend the same way.
    const box: React.CSSProperties = {position: 'relative', overflow: 'hidden', willChange: 'transform'};
    return (
      <div style={{...box, width: props.width, height: props.height, ...props.style}}>
        <Img src={segment.url + plan3dFrameName(frame - segment.from)} style={{display: 'block', width: '100%', height: '100%'}} />
      </div>
    );
  }
  if (__layer3d !== 'only' || typeof document === 'undefined') return <ThreeCanvas {...props} />;
  return createPortal(
    <div className={LAYER3D_CLASS} style={{position: 'fixed', left: 0, top: 0, width: props.width, height: props.height, zIndex: 2147483647}}>
      <style>{ONLY_CSS}</style>
      <ThreeCanvas {...props} />
    </div>,
    document.body,
  );
};
