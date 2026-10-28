import React from 'react';
import {Plaza} from './Plaza';
import {Cctv} from './Cctv';
import {Park} from './Park';
import {Drone} from './Drone';
import {Street} from './Street';
import {Metal} from './Metal';
import {Aerial} from './Aerial';

export const SCENES: Record<string, React.FC<{from: number}>> = {
  plaza: Plaza,
  cctv: Cctv,
  park: Park,
  drone: Drone,
  street: Street,
  metal: Metal,
  aerial: Aerial,
};
