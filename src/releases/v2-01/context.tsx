import React, {createContext, useContext} from 'react';
import {AbsoluteFill} from 'remotion';

const ReleaseContext = createContext(false);
export const useRelease201 = () => useContext(ReleaseContext);

/** Finishing pass only: no crop, scale, camera, timing or audio transformation. */
export const Release201Frame: React.FC<{children: React.ReactNode}> = ({children}) => (
  <ReleaseContext.Provider value={true}>
    <AbsoluteFill style={{filter: 'contrast(1.025) saturate(1.025) brightness(1.02)'}}>{children}</AbsoluteFill>
  </ReleaseContext.Provider>
);
