import React from 'react';
import {Composition, Folder} from 'remotion';
import {releaseVideos201} from './releases/v2-01/registry';
import {videos} from './videos/registry';
import {CharactersPreview, CHARACTERS_FRAMES} from './assets/CharactersPreview';
import {ASSET_DETAILS_FRAMES, AssetDetailsShowcase} from './assets/AssetDetailsShowcase';
import {SHOWCASE_FPS, SHOWCASE_FRAMES, Showcase} from './assets/Showcase';
import {INTERIOR_FRAMES, InteriorShowcase} from './assets/interior/InteriorShowcase';
import {CITY_FRAMES, CityShowcase} from './assets/city/CityShowcase';
import {CITY_PREVIEW_FRAMES, CityBasePreview} from './assets/city/CityBasePreview';
import {CITY_LAYOUT_FRAMES, CityLayoutPreview, calculateCityLayoutMetadata} from './assets/city/CityLayoutPreview';
import {CityTour, tourFrames} from './assets/city/reference/CityTour';
import {REFERENCE_DEMO_FRAMES, ReferenceDemo} from './assets/city/reference/ReferenceDemo';
import {BombeNucleaireVille} from './videos/bombe-nucleaire-ville/BombeNucleaireVille';
import bombeVilleTiming from './videos/bombe-nucleaire-ville/timing.json';
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
import {AsteroideParis} from './videos/asteroide-paris/AsteroideParis';
import asteroideTiming from './videos/asteroide-paris/timing.json';
import {MarcGeant} from './videos/marc-geant/MarcGeant';
import {MarcMini} from './videos/marc-mini/MarcMini';
import marcMiniTiming from './videos/marc-mini/timing.json';
import marcGeantTiming from './videos/marc-geant/timing.json';
import {MarcSoif} from './videos/marc-soif/MarcSoif';
import marcSoifTiming from './videos/marc-soif/timing.json';
import {MarcFour} from './videos/marc-four/MarcFour';
import marcFourTiming from './videos/marc-four/timing.json';
import {MarcCongel} from './videos/marc-congel/MarcCongel';
import marcCongelTiming from './videos/marc-congel/timing.json';
import {MarcSalaire} from './videos/marc-salaire/MarcSalaire';
import marcSalaireTiming from './videos/marc-salaire/timing.json';
import {MarcSalaire2} from './videos/marc-salaire-2/MarcSalaire2';
import marcSalaire2Timing from './videos/marc-salaire-2/timing.json';
import {MarcSalaire3} from './videos/marc-salaire-3/MarcSalaire3';
import marcSalaire3Timing from './videos/marc-salaire-3/timing.json';
import {MarcDeuxLunes} from './videos/marc-deux-lunes/MarcDeuxLunes';
import marcDeuxLunesTiming from './videos/marc-deux-lunes/timing.json';
import {MarcGeantCourt} from './videos/marc-geant-court/MarcGeantCourt';
import {Cover} from './publication/Cover';
import marcGeantCourtTiming from './videos/marc-geant-court/timing.json';
import {OiseauHauteTension} from './videos/oiseau-haute-tension/OiseauHauteTension';
import oiseauTiming from './videos/oiseau-haute-tension/timing.json';
import {AvionPortance} from './videos/avion-portance/AvionPortance';
import avionTiming from './videos/avion-portance/timing.json';
import {HOLO_KIT_FRAMES, HoloKitShowcase} from './assets/holo/HoloKitShowcase';

const audioFirst = readTimeline(compiledAudioFirst);

export const Root: React.FC = () => (
  <>
    <Folder name="AudioFirst">
      <Composition id="AudioFirstBridge" component={AudioFirstBridge} defaultProps={{timeline: audioFirst}}
        {...timelineMetadata(audioFirst)} calculateMetadata={({props}) => timelineMetadata(props.timeline)} />
    </Folder>
    <Folder name="Videos">
      <Composition id="AvionPortance" component={AvionPortance} durationInFrames={Math.round(avionTiming.duration * avionTiming.fps)} fps={avionTiming.fps} width={avionTiming.width} height={avionTiming.height} />
      <Composition id="OiseauHauteTension" component={OiseauHauteTension} durationInFrames={Math.round(oiseauTiming.duration * oiseauTiming.fps)} fps={oiseauTiming.fps} width={oiseauTiming.width} height={oiseauTiming.height} />
      <Composition id="BombeNucleaireVille" component={BombeNucleaireVille} durationInFrames={Math.round(bombeVilleTiming.duration * bombeVilleTiming.fps)} fps={bombeVilleTiming.fps} width={bombeVilleTiming.width} height={bombeVilleTiming.height} />
      <Composition id="MarcSalaire2" component={MarcSalaire2} durationInFrames={Math.round(marcSalaire2Timing.duration * marcSalaire2Timing.fps)} fps={marcSalaire2Timing.fps} width={marcSalaire2Timing.width} height={marcSalaire2Timing.height} />
      <Composition id="Couverture" component={Cover} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{slug: 'marc-geant', t: 46, title: 'Et si Marc devenait géant ?'}} />
      <Composition id="MarcGeantCourt" component={MarcGeantCourt} durationInFrames={Math.round(marcGeantCourtTiming.duration * marcGeantCourtTiming.fps)} fps={marcGeantCourtTiming.fps} width={marcGeantCourtTiming.width} height={marcGeantCourtTiming.height} />
      <Composition id="MarcDeuxLunes" component={MarcDeuxLunes} durationInFrames={Math.round(marcDeuxLunesTiming.duration * marcDeuxLunesTiming.fps)} fps={marcDeuxLunesTiming.fps} width={marcDeuxLunesTiming.width} height={marcDeuxLunesTiming.height} />
      <Composition id="MarcSalaire3" component={MarcSalaire3} durationInFrames={Math.round(marcSalaire3Timing.duration * marcSalaire3Timing.fps)} fps={marcSalaire3Timing.fps} width={marcSalaire3Timing.width} height={marcSalaire3Timing.height} />
      <Composition id="MarcSalaire" component={MarcSalaire} durationInFrames={Math.round(marcSalaireTiming.duration * marcSalaireTiming.fps)} fps={marcSalaireTiming.fps} width={marcSalaireTiming.width} height={marcSalaireTiming.height} />
      <Composition id="MarcCongel" component={MarcCongel} durationInFrames={Math.round(marcCongelTiming.duration * marcCongelTiming.fps)} fps={marcCongelTiming.fps} width={marcCongelTiming.width} height={marcCongelTiming.height} />
      <Composition id="MarcFour" component={MarcFour} durationInFrames={Math.round(marcFourTiming.duration * marcFourTiming.fps)} fps={marcFourTiming.fps} width={marcFourTiming.width} height={marcFourTiming.height} />
      <Composition id="MarcSoif" component={MarcSoif} durationInFrames={Math.round(marcSoifTiming.duration * marcSoifTiming.fps)} fps={marcSoifTiming.fps} width={marcSoifTiming.width} height={marcSoifTiming.height} />
      <Composition id="MarcGeant" component={MarcGeant} durationInFrames={Math.round(marcGeantTiming.duration * marcGeantTiming.fps)} fps={marcGeantTiming.fps} width={marcGeantTiming.width} height={marcGeantTiming.height} />
      <Composition id="MarcMini" component={MarcMini} durationInFrames={Math.round(marcMiniTiming.duration * marcMiniTiming.fps)} fps={marcMiniTiming.fps} width={marcMiniTiming.width} height={marcMiniTiming.height} />
      <Composition id="AsteroideParis" component={AsteroideParis} durationInFrames={Math.round(asteroideTiming.duration * asteroideTiming.fps)} fps={asteroideTiming.fps} width={asteroideTiming.width} height={asteroideTiming.height} />
      <Composition id="InternetOffV1" component={InternetOff} durationInFrames={Math.round(internetTiming.duration * internetTiming.fps)} fps={internetTiming.fps} width={internetTiming.width} height={internetTiming.height} />
      <Composition id="ParisPolarV2" component={ParisPolarV2} durationInFrames={Math.round(polarTimingV2.duration * polarTimingV2.fps)} fps={polarTimingV2.fps} width={polarTimingV2.width} height={polarTimingV2.height} />
      <Composition id="ParisPolar" component={ParisPolar} durationInFrames={Math.round(polarTiming.duration * polarTiming.fps)} fps={polarTiming.fps} width={polarTiming.width} height={polarTiming.height} />
      <Composition id="BusCold" component={BusCold} durationInFrames={Math.round(busTiming.duration * busTiming.fps)} fps={busTiming.fps} width={busTiming.width} height={busTiming.height} />
      <Composition id="CafeCold" component={CafeCold} durationInFrames={Math.round(cafeTiming.duration * cafeTiming.fps)} fps={cafeTiming.fps} width={cafeTiming.width} height={cafeTiming.height} />
      <Composition id="CafeColdV2" component={CafeColdV2} durationInFrames={Math.round(cafeTimingV2.duration * cafeTimingV2.fps)} fps={cafeTimingV2.fps} width={cafeTimingV2.width} height={cafeTimingV2.height} />
      {videos.map((video) => <Composition key={video.id} {...video} />)}
    </Folder>
    <Folder name="Videos-2-01">
      {releaseVideos201.map((video) => <Composition key={video.id} {...video} />)}
    </Folder>
    <Folder name="Bibliotheque">
      <Composition id="HoloKit" component={HoloKitShowcase} durationInFrames={HOLO_KIT_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="Personnages" component={CharactersPreview} durationInFrames={CHARACTERS_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="AssetsDetails" component={AssetDetailsShowcase} durationInFrames={ASSET_DETAILS_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} defaultProps={{details: true}} />
      <Composition id="CityLayoutPreview" component={CityLayoutPreview} durationInFrames={CITY_LAYOUT_FRAMES} fps={30} width={1080} height={1920} defaultProps={{layout: 'ma-ville'}} calculateMetadata={calculateCityLayoutMetadata} />
      <Composition id="VilleReferenceVisite" component={CityTour} durationInFrames={tourFrames(30)} fps={30} width={1080} height={1920} defaultProps={{lod: true}} />
      <Composition id="VilleReferenceVisiteSansLOD" component={CityTour} durationInFrames={tourFrames(30)} fps={30} width={1080} height={1920} defaultProps={{lod: false}} />
      <Composition id="VilleReferenceDemo" component={ReferenceDemo} durationInFrames={REFERENCE_DEMO_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="CityBasePreview"component={CityBasePreview} durationInFrames={CITY_PREVIEW_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="AssetsVille"component={CityShowcase} durationInFrames={CITY_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} />
      <Composition id="Assets" component={Showcase} durationInFrames={SHOWCASE_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} />
      <Composition id="AssetsInterieur" component={InteriorShowcase} durationInFrames={INTERIOR_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} />
    </Folder>
  </>
);
