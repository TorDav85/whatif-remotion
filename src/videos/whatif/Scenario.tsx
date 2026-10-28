import React, {createContext, useContext, useMemo} from 'react';
import {T, createHoleModel} from './world';

export type Scenario = {
  fps: number;
  handle: string;
  hole: typeof T.hole;
  flash: {t: number; a: number}[];
  beats: readonly unknown[];
};
const defaultValue = {timeline: T as Scenario, ...createHoleModel(T.hole)};
const Context = createContext(defaultValue);

/** Le décor et l'habillage lisent exactement le même scénario. */
export const ScenarioProvider: React.FC<{timeline: Scenario; children: React.ReactNode}> = ({timeline, children}) => {
  const value = useMemo(() => ({timeline, ...createHoleModel(timeline.hole)}), [timeline]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useScenario = () => useContext(Context);
