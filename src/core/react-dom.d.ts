// react-dom ships without types here (@types/react-dom is not installed): only what plans3d.tsx uses.
declare module 'react-dom' {
  import type {ReactNode, ReactPortal} from 'react';
  export function createPortal(children: ReactNode, container: Element | DocumentFragment): ReactPortal;
}
