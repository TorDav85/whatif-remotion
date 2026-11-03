import type {CompiledTimeline, NarrationBeat, TimelineEvent} from './types';
export function readTimeline(value: unknown): CompiledTimeline;
export function timelineMetadata(value: unknown): {durationInFrames: number; fps: number; width: number; height: number};
export function audioFrameWindow(beat: NarrationBeat, fps: number): {from: number; durationInFrames: number};
export function compositionFrames(timeline: CompiledTimeline): number;
export function eventOf(timeline: CompiledTimeline, type: TimelineEvent['type']): TimelineEvent;
export function eventProgress(event: TimelineEvent, time: number): number;
export function speechGain(timeline: CompiledTimeline, time: number): number;
