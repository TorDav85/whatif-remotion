# Code tiers : papercut-explainer

Les définitions d'effets de `library.mjs`, les primitives de `kit.mjs` (`noise`, `tone`, `pop`, `chime`, générateur
pseudo-aléatoire, bus fx et master) et le principe des transitions `whip` et `zoom` de
`src/shared/ui/transitions.ts` viennent de [0xS4N4TG/papercut-explainer](https://github.com/0xS4N4TG/papercut-explainer),
commit `ff8223a` (`library/audio/engine.js`, `library/audio/sfx/*.js`, `library/papercut/kit/paper/transitions.tsx`).
Le moteur hors ligne `offline-audio.mjs` remplace le Chrome sans fenêtre de l'original ; les transitions ont été
réécrites pour une seule scène 3D (pas de `@remotion/transitions`).

```
MIT License

Copyright (c) 2026 sanat

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
