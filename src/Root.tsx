import React from 'react';
import {Composition, Folder} from 'remotion';
import {videos} from './videos/registry';
import {SHOWCASE_FPS, SHOWCASE_FRAMES, Showcase} from './assets/Showcase';
import {INTERIOR_FRAMES, InteriorShowcase} from './assets/interior/InteriorShowcase';
import {CITY_FRAMES, CityShowcase} from './assets/city/CityShowcase';
import {CITY_PREVIEW_FRAMES, CityBasePreview} from './assets/city/CityBasePreview';
import {CITY_LAYOUT_FRAMES, CityLayoutPreview, calculateCityLayoutMetadata} from './assets/city/CityLayoutPreview';
import {AudioFirstBridge} from './videos/audio-first-bridge/AudioFirstBridge';
import compiledAudioFirst from './videos/audio-first-bridge/compiled-timeline.json';
import {readTimeline, timelineMetadata} from './videos/audio-first-bridge/timeline/runtime.mjs';
import {CafeCold} from './videos/cafe-cold/CafeCold';
import cafeTiming from './videos/cafe-cold/timing.json';
import {CafeColdV2} from './videos/cafe-cold-v2/CafeColdV2';
import cafeTimingV2 from './videos/cafe-cold-v2/timing.json';
import {BusCold} from './videos/bus-cold/BusCold';
import busTiming from './videos/bus-cold/timing.json';
import {ParisPolar} from './videos/paris-polar/ParisPolar';
import polarTiming from './videos/paris-polar/timing.json';
import {ParisPolarV2} from './videos/paris-polar-v2/ParisPolarV2';
import polarTimingV2 from './videos/paris-polar-v2/timing.json';
import {InternetOff} from './videos/internet-off/InternetOff';
import internetTiming from './videos/internet-off/timing.json';

const audioFirst = readTimeline(compiledAudioFirst);

export const Root: React.FC = () => (
  <>
    <Folder name="AudioFirst">
      <Composition id="AudioFirstBridge" component={AudioFirstBridge} defaultProps={{timeline: audioFirst}}
        {...timelineMetadata(audioFirst)} calculateMetadata={({props}) => timelineMetadata(props.timeline)} />
    </Folder>
    <Folder name="Videos">
      <Composition id="InternetOffV1" component={InternetOff} durationInFrames={Math.round(internetTiming.duration * internetTiming.fps)} fps={internetTiming.fps} width={internetTiming.width} height={internetTiming.height} />
      <Composition id="ParisPolarV2" component={ParisPolarV2} durationInFrames={Math.round(polarTimingV2.duration * polarTimingV2.fps)} fps={polarTimingV2.fps} width={polarTimingV2.width} height={polarTimingV2.height} />
      <Composition id="ParisPolar" component={ParisPolar} durationInFrames={Math.round(polarTiming.duration * polarTiming.fps)} fps={polarTiming.fps} width={polarTiming.width} height={polarTiming.height} />
      <Composition id="BusCold" component={BusCold} durationInFrames={Math.round(busTiming.duration * busTiming.fps)} fps={busTiming.fps} width={busTiming.width} height={busTiming.height} />
      <Composition id="CafeCold" component={CafeCold} durationInFrames={Math.round(cafeTiming.duration * cafeTiming.fps)} fps={cafeTiming.fps} width={cafeTiming.width} height={cafeTiming.height} />
      <Composition id="CafeColdV2" component={CafeColdV2} durationInFrames={Math.round(cafeTimingV2.duration * cafeTimingV2.fps)} fps={cafeTimingV2.fps} width={cafeTimingV2.width} height={cafeTimingV2.height} />
      {videos.map((video) => <Composition key={video.id} {...video} />)}
    </Folder>
    <Folder name="Bibliotheque">
      <Composition id="CityLayoutPreview" component={CityLayoutPreview} durationInFrames={CITY_LAYOUT_FRAMES} fps={30} width={1080} height={1920} defaultProps={{layout: 'ma-ville'}} calculateMetadata={calculateCityLayoutMetadata} />
      <Composition id="CityBasePreview"component={CityBasePreview} durationInFrames={CITY_PREVIEW_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="AssetsVille"component={CityShowcase} durationInFrames={CITY_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} />
      <Composition id="Assets" component={Showcase} durationInFrames={SHOWCASE_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} />
      <Composition id="AssetsInterieur" component={InteriorShowcase} durationInFrames={INTERIOR_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} />
    </Folder>
  </>
);
