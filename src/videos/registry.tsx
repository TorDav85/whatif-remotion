// Généré depuis catalog.json par npm run video:sync.
import {NatureV2 as Video0} from './nature-v2/Nature';
import Config0 from './nature-v2/nature.json';
import {Gravity as Video1} from './gravity/Gravity';
import Config1 from './gravity/gravity.json';
import {WhatIf as Video2} from './whatif/WhatIf';
import Config2 from './whatif/timeline.json';
import {Nature as Video3} from './nature/Nature';
import Config3 from './nature/nature.json';
import {Heat as Video4} from './heat/Heat';
import Config4 from './heat/timeline.json';
import {WhatIfParisV2 as Video5} from './paris-v2/WhatIfParisV2';
import Config5 from './paris-v2/scenario.json';
import {WhatIfParisV3 as Video6} from './paris-v3/WhatIfParisV3';
import Config6 from './paris-v3/scenario.json';
import {WhatIfParisV4 as Video7} from './paris-v4/WhatIfParisV4';
import Config7 from './paris-v4/scenario.json';
import {WhatIfParisV6 as Video8} from './paris-v6/WhatIfParisV6';
import Config8 from './paris-v6/scenario.json';
import {WhatIfParisTikTok as Video9} from './paris-tiktok/WhatIfParisTikTok';
import Config9 from './paris-tiktok/scenario.json';

const dimensions = (config: {fps: number; width: number; height: number; duration: number}) => ({
  fps: config.fps, width: config.width, height: config.height, durationInFrames: Math.round(config.duration * config.fps),
});

export const videos = [
  {id: 'NatureReprendV2', component: Video0, ...dimensions(Config0)},
  {id: 'Gravite', component: Video1, ...dimensions(Config1)},
  {id: 'WhatIf', component: Video2, ...dimensions(Config2)},
  {id: 'NatureReprend', component: Video3, ...dimensions(Config3)},
  {id: 'Chaleur', component: Video4, ...dimensions(Config4)},
  {id: 'WhatIfParisV2', component: Video5, ...dimensions(Config5)},
  {id: 'WhatIfParisV3', component: Video6, ...dimensions(Config6)},
  {id: 'WhatIfParisV4', component: Video7, ...dimensions(Config7)},
  {id: 'WhatIfParisV6', component: Video8, ...dimensions(Config8)},
  {id: 'WhatIfParisTikTok', component: Video9, ...dimensions(Config9)},
];
