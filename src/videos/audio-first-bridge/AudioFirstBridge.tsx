import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import type {CompiledTimeline} from './timeline/types';
import {audioFrameWindow, eventOf, speechGain} from './timeline/runtime.mjs';
import {ParisScene} from './world/ParisScene';
import {Subtitles} from './ui/Subtitles';
import {NarrativeHud} from './ui/NarrativeHud';

export const AudioFirstBridge: React.FC<{timeline: CompiledTimeline}> = ({timeline}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const time = frame / fps;
  const impact = eventOf(timeline, 'bridgeCollapse');
  return <AbsoluteFill style={{background: '#a4c4c7', fontFamily: 'Arial, sans-serif'}}>
    <ThreeCanvas width={width} height={height} camera={{fov: 42, position: [10, 7, 15]}}>
      <ParisScene timeline={timeline} time={time} />
    </ThreeCanvas>
    <NarrativeHud timeline={timeline} time={time} />
    <Subtitles timeline={timeline} time={time} />
    {timeline.beats.map((beat) => <Sequence key={beat.id} {...audioFrameWindow(beat, fps)}>
      <Audio src={staticFile(beat.audioFile)} volume={timeline.mix.voiceVolume} />
    </Sequence>)}
    <Audio src={staticFile(timeline.mix.ambienceFile)} volume={(f) => timeline.mix.ambienceVolume * speechGain(timeline, f / fps)
      * Math.min(1, Math.max(0, (timeline.duration - f / fps) / Math.max(0.1, timeline.endPadding)))} />
    <Sequence from={Math.round(impact.start * fps)}>
      <Audio src={staticFile(timeline.mix.impactFile)} volume={(f) => timeline.mix.impactVolume * speechGain(timeline, impact.start + f / fps)} />
    </Sequence>
  </AbsoluteFill>;
};
