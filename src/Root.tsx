import React from 'react';
import {Composition, Folder} from 'remotion';
import {videos} from './videos/registry';
import {SHOWCASE_FPS, SHOWCASE_FRAMES, Showcase} from './assets/Showcase';
import {INTERIOR_FRAMES, InteriorShowcase} from './assets/interior/InteriorShowcase';
import {CITY_FRAMES, CityShowcase} from './assets/city/CityShowcase';

export const Root: React.FC = () => (
  <>
    <Folder name="Videos">
      {videos.map((video) => <Composition key={video.id} {...video} />)}
    </Folder>
    <Folder name="Bibliotheque">
      <Composition id="AssetsVille" component={CityShowcase} durationInFrames={CITY_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} />
      <Composition id="Assets" component={Showcase} durationInFrames={SHOWCASE_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} />
      <Composition id="AssetsInterieur" component={InteriorShowcase} durationInFrames={INTERIOR_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} />
    </Folder>
  </>
);
