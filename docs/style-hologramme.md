# Style « Hologramme Wireframe Néon / X-Ray »

Style d'explication scientifique : fond noir, grille cyan en perspective, objets en fil de fer émissif
avec un corps translucide « rayons X », courant en impulsions lumineuses, arcs électriques, HUD monospace.
Première vidéo : `src/videos/oiseau-haute-tension/` (composition `OiseauHauteTension`, 45 s).
Planche du kit : composition `HoloKit` (dossier Bibliotheque du Studio).

## Le kit `src/shared/holo/`

| Module | Contenu |
| --- | --- |
| `theme.ts` | `HOLO_DEFAULT` (`bg #000308`, `grid #003344`, `primary #00f0ff`, `secondary #00ffa6`, `danger`, `warn`, police), `withTheme({...})` pour recolorer un autre sujet, `neonShadow`. |
| `geometry.ts` | Fonctions pures testées : `catenary`, `arcPoints` (éclair à graine), `flickerSeed`, `pulseAt`, `ringRadius`, `along`. |
| `materials.ts` | Matériaux additifs (faux bloom sans post-traitement) : fil de fer, rayons X (fresnel), tube à impulsions, grille qui s'estompe, ondes au sol, halo. |
| `WireframeScene.tsx` | `WireframeScene` (fond + grille + caméra `CameraRig`), `HoloGrid`, `WireMesh` (arêtes ou triangles + corps translucide), `WireLines`, `PulseRings`. |
| `CurrentFlow.tsx` | `PulseTube` (impulsions qui défilent, `head`/`tail` pour un front de courant), `ElectronDots`, `ElectricArc` (nouvelle forme tous les `hold` frames, graine fixe), `Spark`. |
| `HudOverlay.tsx` | CSS 2D : `Reticle` [ ] (à placer avec `projectToScreen`), `Readout`, `Gauge`, `VersusPanel` (V1 vs V2, ΔV), `ScanLines`, `HudFrame`, `Glitch` + `glitchAt`/`glitchStyle`, `frNumber`, `countUp`, `typed`. |
| `Subtitles.tsx` | Sous-titres monospace, mêmes données que `CaptionTrack` (`npm run captions -- <slug>`). |

Assets du style : `src/assets/holo/` — `Bird` (ailes articulées, `birdWingTip` pour un contact exact),
`PowerLine` (pylônes treillis, isolateurs, trois conducteurs, `conductorY` pour poser un objet sur un câble).

## Nouvelle vidéo dans ce style

1. Copier la structure de `src/videos/oiseau-haute-tension/` (pas ses constantes) : `narration.json`,
   `timing.json`, `Scene3D.tsx` (horloge en constantes exportées + `SHOTS`), `TextOverlay.tsx` (plan
   d'habillage `PLAN`, `CTAS`), composant principal, `publication.json`.
2. Canvas : `<ThreeCanvas linear={false} flat gl={{antialias: true}}>` — `flat` évite le tone mapping qui ternit le néon.
3. Le temps arrive en prop (`t = frame / fps`) : aucun `useFrame`, `Math.random`, `Date.now` (test dans `tests/holo.test.ts`).
4. Les tableaux de points passés à `PulseTube`/`ElectronDots` doivent être stables (constantes de module ou
   `useMemo`) : sinon le tube est reconstruit à chaque image.
5. Lignes WebGL = 1 px : pour un trait épais (courant, éclair), utiliser un tube fin + halo, pas `linewidth`.
6. Voix : copier `scripts/audio/oiseau-haute-tension.py` (voix XTTS + ambiance électrique procédurale).
7. Vérifier : `npm test`, `npm run stills -- <Composition> --count 16`, `npm run editorial -- <slug>`.

Police : pile système (`JetBrains Mono`, `Share Tech Mono` si installées, sinon `Cascadia Mono`/`Consolas`
sous Windows, `DejaVu Sans Mono` en CI) ; rien n'est téléchargé.
