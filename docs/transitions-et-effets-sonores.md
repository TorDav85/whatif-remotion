# Transitions et effets sonores

Deux outils partagés, adaptés de [papercut-explainer](https://github.com/0xS4N4TG/papercut-explainer) (MIT,
voir `scripts/audio/sfx/THIRD_PARTY.md`). Démonstration : composition **Bibliotheque → Transitions**.

## Transitions de coupe

`src/shared/ui/transitions.ts` garde `Cut {at, kind}` et `dipAt`, inchangés ; trois types s'ajoutent, joués sur la
même scène 3D par `<CutFx>` (`src/shared/ui/CutFx.tsx`) :

| `kind` | Effet | Usage |
| --- | --- | --- |
| `cut` | coupe franche | action qui continue (par défaut) |
| `dip` | noir de ±0,16 s | vrai saut de temps, de lieu ou d'échelle |
| `whip` | panoramique filé, flou horizontal de part et d'autre (±0,12 s) | changer de sujet, « pendant ce temps » |
| `zoom` | plongée vers un point `x, y` (px de l'image 1080 × 1920), le plan suivant se pose (0,2 + 0,17 s) | entrer quelque part : une fenêtre, un écran |
| `flash` | éclair blanc sur la coupe (0,3 s) | choc, détonation, révélation |

```tsx
const CUTS: Cut[] = [{at: 8, kind: 'flash'}, {at: 24, kind: 'whip'}, {at: 46, kind: 'zoom', x: 540, y: 820}];
<CutFx cuts={CUTS} t={t}>
  <ThreeCanvas …>…</ThreeCanvas>
</CutFx>
```

Tout dépend de `t` : une image fixe et le rendu montrent la même chose. Règle du skill `camera-realisateur` :
coupe franche par défaut, une transition marquée seulement quand le récit change vraiment.

## Effets sonores

38 effets synthétisés en code (aucun fichier audio sous licence) : impacts (`hit`, `thud`, `crack`, `door`, `gong`),
mouvements (`whoosh`, `whip`, `zoom`, `cut`), feu (`crackle`, `fire-flare`, `sizzle`), eau (`splash`, `drip`,
`bubbles`, `fizz`), signaux (`monitor-beeps`, `radio`, `tick`, `count`, `buzz`, `x`), positifs (`chime`, `ding`,
`end-chime`, `sparkle`, `glint`), ambiance (`elevator`, `birds`, `soft-swell`)… Liste complète et instants d'écoute :
`scripts/audio/sfx/CATALOG.md`.

```powershell
npm run sfx -- --list                                         # noms, durées, descriptions
npm run sfx -- --catalog                                      # tous les effets → out/sfx/catalog.wav
npm run sfx -- public/<slug>/fx.cues.json public/<slug>/fx.wav
```

Feuille d'effets (secondes du film ; `gain` facultatif) :

```json
{"duration": 60, "cues": [{"t": 8, "sfx": "hit"}, {"t": 18, "sfx": "crack", "gain": 0.8}]}
```

`cutCues(CUTS)` (dans `transitions.ts`) donne les effets des transitions (`whip` → `whip`, `zoom` → `zoom`,
`flash` → `hit`), à ajouter à la feuille. Dans la vidéo : `<Audio src={staticFile('<slug>/fx.wav')} />` à côté de la
voix. Le rendu est déterministe et ne demande ni navigateur ni dépendance : `offline-audio.mjs` reproduit la partie
de Web Audio dont les effets ont besoin (oscillateurs, bruit, filtres biquad, enveloppes).

Ajouter un effet : une fonction `SFX['nom'] = (K, t) => { … }` dans `library.mjs`, précédée de sa ligne
`// @sfx nom | étiquettes | secondes | description | origine` et ajoutée à `SFX_INFO`, puis `npm run sfx -- --catalog`
et `npm run test:city -- transitions` (chaque effet doit sonner sans saturer).
