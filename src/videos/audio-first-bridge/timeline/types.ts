export type Word = {text: string; start: number; end: number; mediaEndClampedBy?: number};
export type NarrationBeat = {
  id: string;
  text: string;
  audioFile: string;
  audioSha256: string;
  audioStart: number;
  audioDuration: number;
  speechStart: number;
  speechEnd: number;
  words: Word[];
  alignment: {method: string; textMatch: boolean; reviewed: boolean};
};
export type Anchor = {
  id: string; text: string; occurrence: number; edge: 'start' | 'end'; beatId?: string;
  resolvedAt: number; wordStart: number; wordEnd: number; matchCount: number;
  references: {beatId: string; wordIndex: number}[];
};
export type AnchoredRecord = {id: string; start: number; end: number; duration: number; offset: number; anchor: Anchor};
export type TimelineEvent = AnchoredRecord & {type: 'metalWeakening' | 'bridgeCollapse' | 'cameraMove'};
export type Editorial = AnchoredRecord & {title: string; text?: string};
export type Subtitle = {id: string; beatId: string; text: string; start: number; end: number; words: Word[]};
export type CompiledTimeline = {
  schemaVersion: 1; id: string; scene: 'bridge'; title: string; handle: string;
  fps: number; width: number; height: number;
  timeUnit: 'seconds'; wordTimeBase: 'global'; usefulEnd: number; endPadding: number; duration: number;
  beats: NarrationBeat[]; events: TimelineEvent[]; editorials: Editorial[]; conclusion: Editorial;
  subtitles: Subtitle[];
  mix: {voiceVolume: number; ambienceVolume: number; speechDuck: number; impactVolume: number; impactDuration: number; ambienceFile: string; impactFile: string};
};
