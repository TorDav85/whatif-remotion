type Config = {
  duration: number;
  curve: readonly {t: number; c: number}[];
  beats: readonly {atC: number; caption?: string}[];
  captionMinSec: number;
  captionMaxSec: number;
  outro: {t: number};
};
export function temperatureTimeline(config: Config): {
  tempAt: (time: number) => number;
  timeAtTemp: (temperature: number) => number;
  cross: number[];
  captions: {i: number; start: number; end: number; text: string}[];
};
