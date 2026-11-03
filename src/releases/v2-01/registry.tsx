import React from 'react';
import {videos} from '../../videos/registry';
import {Release201Frame} from './context';
import {AudioFirstBridge} from '../../videos/audio-first-bridge/AudioFirstBridge';
import compiled from '../../videos/audio-first-bridge/compiled-timeline.json';
import {readTimeline, timelineMetadata} from '../../videos/audio-first-bridge/timeline/runtime.mjs';
import {MarcGeant as Story0} from '../../videos/marc-geant/MarcGeant';
import Config0 from '../../videos/marc-geant/timing.json';
import {MarcMini as Story1} from '../../videos/marc-mini/MarcMini';
import Config1 from '../../videos/marc-mini/timing.json';
import {AsteroideParis as Story2} from '../../videos/asteroide-paris/AsteroideParis';
import Config2 from '../../videos/asteroide-paris/timing.json';
import {InternetOff as Story3} from '../../videos/internet-off/InternetOff';
import Config3 from '../../videos/internet-off/timing.json';
import {ParisPolarV2 as Story4} from '../../videos/paris-polar-v2/ParisPolarV2';
import Config4 from '../../videos/paris-polar-v2/timing.json';
import {ParisPolar as Story5} from '../../videos/paris-polar/ParisPolar';
import Config5 from '../../videos/paris-polar/timing.json';
import {BusCold as Story6} from '../../videos/bus-cold/BusCold';
import Config6 from '../../videos/bus-cold/timing.json';
import {CafeCold as Story7} from '../../videos/cafe-cold/CafeCold';
import Config7 from '../../videos/cafe-cold/timing.json';
import {CafeColdV2 as Story8} from '../../videos/cafe-cold-v2/CafeColdV2';
import Config8 from '../../videos/cafe-cold-v2/timing.json';

type Story = {id: string; component: React.ComponentType<any>; fps: number; width: number; height: number; durationInFrames: number; defaultProps?: any};
const dimensions = (c: {fps: number; width: number; height: number; duration: number}) => ({
  fps: c.fps, width: c.width, height: c.height, durationInFrames: Math.round(c.duration * c.fps),
});
const timeline = readTimeline(compiled);
const sources: Story[] = [
  {id: 'MarcGeant', component: Story0, ...dimensions(Config0)},
  {id: 'MarcMini', component: Story1, ...dimensions(Config1)},
  {id: 'AsteroideParis', component: Story2, ...dimensions(Config2)},
  {id: 'InternetOffV1', component: Story3, ...dimensions(Config3)},
  {id: 'ParisPolarV2', component: Story4, ...dimensions(Config4)},
  {id: 'ParisPolar', component: Story5, ...dimensions(Config5)},
  {id: 'BusCold', component: Story6, ...dimensions(Config6)},
  {id: 'CafeCold', component: Story7, ...dimensions(Config7)},
  {id: 'CafeColdV2', component: Story8, ...dimensions(Config8)},
  ...videos,
  {id: 'AudioFirstBridge', component: AudioFirstBridge, ...timelineMetadata(timeline), defaultProps: {timeline}},
];
const finish = (Component: React.ComponentType<any>): React.FC<any> => {
  const Finished: React.FC<any> = (props) => <Release201Frame><Component {...props} /></Release201Frame>;
  Finished.displayName = `V201(${Component.displayName ?? Component.name ?? 'Video'})`;
  return Finished;
};
export const releaseVideos201 = sources.map((source) => ({...source, id: `${source.id}-V201`, component: finish(source.component)}));
