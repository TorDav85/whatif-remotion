import React from 'react';
import {Composition} from 'remotion';
import {WhatIf} from './WhatIf';
import {Nature} from './nature/Nature';
import {NatureV2} from './nature2/Nature';
import {Heat} from './heat/Heat';
import {Gravity} from './gravity/Gravity';
import {SHOWCASE_FPS, SHOWCASE_FRAMES, Showcase} from './assets/Showcase';
import {INTERIOR_FRAMES, InteriorShowcase} from './assets/interior/InteriorShowcase';
import {DURATION_FRAMES, T} from './world';
import {DURATION_FRAMES as NATURE_FRAMES, N} from './nature/time';
import {DURATION_FRAMES as NATURE2_FRAMES, N as N2} from './nature2/time';
import {DURATION_FRAMES as HEAT_FRAMES, H} from './heat/curve';
import {DURATION_FRAMES as GRAVITY_FRAMES, G} from './gravity/time';

export const Root: React.FC = () => (
  <>
    <Composition
      id="WhatIf"
      component={WhatIf}
      durationInFrames={DURATION_FRAMES}
      fps={T.fps}
      width={T.width}
      height={T.height}
    />
    <Composition
      id="NatureReprend"
      component={Nature}
      durationInFrames={NATURE_FRAMES}
      fps={N.fps}
      width={N.width}
      height={N.height}
    />
    <Composition
      id="NatureReprendV2"
      component={NatureV2}
      durationInFrames={NATURE2_FRAMES}
      fps={N2.fps}
      width={N2.width}
      height={N2.height}
    />
    <Composition
      id="Chaleur"
      component={Heat}
      durationInFrames={HEAT_FRAMES}
      fps={H.fps}
      width={H.width}
      height={H.height}
    />
    <Composition
      id="Gravite"
      component={Gravity}
      durationInFrames={GRAVITY_FRAMES}
      fps={G.fps}
      width={G.width}
      height={G.height}
    />
    <Composition id="Assets" component={Showcase} durationInFrames={SHOWCASE_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} />
    <Composition id="AssetsInterieur" component={InteriorShowcase} durationInFrames={INTERIOR_FRAMES} fps={SHOWCASE_FPS} width={1080} height={1920} />
  </>
);
