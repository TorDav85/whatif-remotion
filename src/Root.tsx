import React from 'react';
import {Composition} from 'remotion';
import {WhatIf} from './WhatIf';
import {Nature} from './nature/Nature';
import {Heat} from './heat/Heat';
import {DURATION_FRAMES, T} from './world';
import {DURATION_FRAMES as NATURE_FRAMES, N} from './nature/time';
import {DURATION_FRAMES as HEAT_FRAMES, H} from './heat/curve';

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
      id="Chaleur"
      component={Heat}
      durationInFrames={HEAT_FRAMES}
      fps={H.fps}
      width={H.width}
      height={H.height}
    />
  </>
);
