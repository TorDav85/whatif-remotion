# Structure du projet

```text
src/
  index.ts                 entrée Remotion
  Root.tsx                 dossiers Videos et Bibliotheque dans le Studio
  videos/
    catalog.json           liste des bases, scénarios, sorties et scripts d'ambiance
    registry.tsx           imports Remotion générés depuis le catalogue
    whatif/                trou noir original, narration XTTS
    nature/                humanité disparue V1
    nature-v2/             humanité disparue V2, importée de 1.01
    gravity/               gravité coupée, importée de 1.01
    heat/                  température croissante
    paris-v2/              trou noir à Paris V2
    paris-v3/              Paris → galaxie V3
    paris-v4/              variante cartoon et système solaire
    paris-v6/              variante hivernale
    paris-tiktok/          montage de 70 secondes
  assets/
    city/index.ts          collection 1.02 : 24 objets de ville et d'extérieur
    city/CityShowcase.tsx  présentation AssetsVille
    index.ts               objets d'extérieur réutilisables
    interior/index.ts      objets d'intérieur réutilisables
    Showcase.tsx           planche des objets d'extérieur
    interior/InteriorShowcase.tsx
  core/
    animation.ts           rng, smooth, sampleNum, clamp01
    temperature.mjs        courbe et créneaux partagés de Chaleur, pour le rendu et le TTS
    physics.ts             calculs physiques et formats français
  shared/
    audio/VoiceTrack.tsx   lecture synchronisée des pistes vocales
    three/common.tsx       caméra, étoiles et textures de halo
    three/SkyDome.tsx      ciel en dégradé
    three/EarthGlobe.tsx   globe procédural, avec position géographique configurable
    ui/tokens.ts           typographie et types d'affichage communs
scripts/
  project/video.mjs        catalogue, copie d'une base, aperçu, rendu
  audio/                  ambiances, Piper, voix Windows, lanceur Python
    xtts/                 préparation, génération, utilitaires, dépendances Python
  assets/                 téléchargement des planètes et préparation géographique
  export/                 scénario, SRT et texte de publication TikTok
  check/                  contrôle des pistes et du MP4 XTTS
docs/                     guides courts, historique, provenance des imports
public/                   ressources utilisées par Remotion
out/                      images et vidéos rendues
voice-samples/            profils vocaux privés, exclus de Git
```

## Une vidéo se reprend depuis son dossier

Le JSON contrôle les textes, timings, sons et paramètres de mise en scène. Le fichier
`WhatIf…tsx`, `Nature.tsx`, `Heat.tsx` ou `Gravity.tsx` assemble les scènes. Le décor et
l'habillage de cette vidéo restent à côté du scénario.

`catalog.json` indique le fichier exact à ouvrir pour chaque base. Les dimensions et la
durée du Studio sont lues directement dans ces JSON : inutile de les recopier dans `Root.tsx`.
Après une modification manuelle du catalogue, lancer `npm run video:sync`.

## Ce qui est partagé

Un nouvel objet générique va dans `src/assets/`. Une animation numérique commune va
dans `src/core/animation.ts`. Un élément de rendu commun va dans `src/shared/`.
Ces modules n'importent aucun scénario de vidéo.

Depuis 1.12, les éléments empruntés d'une vidéo à l'autre vivent hors des dossiers vidéo :

| Élément | Emplacement |
| --- | --- |
| Kit instancié (bâtiments, fenêtres, piétons, arbres, feu), ex-`heat/kit` | `src/shared/three/instanced.tsx` (`heat/kit` le réexporte et garde `HeatEnv`) |
| Tour Eiffel stylisée, ex-`paris-v2` | `src/assets/EiffelLowPoly.tsx` |
| Contours des terres, ex-`paris-v3/land.json` | `src/assets/data/world-land.json` |
| Quartier de Paris, ex-`paris-polar-v2/ParisDistrict` | `src/shared/three/ParisDistrict.tsx` |
| Personnage articulé, ex-`bus-cold` | `src/shared/characters/ArticulatedPerson.tsx` |
| Personnage expressif `Actor`, ex-`internet-off` | `src/shared/characters/Actor.tsx` |
| Four géant, ex-`marc-four` | `src/shared/sets/Oven.tsx` |
| Liste de plans `SHOTS` / `CUTS` | `src/shared/three/shots.ts` |
| Projection 3D → écran, bulles de dialogue | `src/shared/three/projection.ts`, `src/shared/ui/SpeechBubble.tsx` |

**Règle d'imports.** Une vidéo n'importe pas le dossier d'une autre vidéo, sauf une version
ou un épisode de la même histoire : `cafe-cold-v2` → `cafe-cold`, `paris-polar-v2` → `paris-polar`,
`marc-salaire-2` → `marc-salaire`, `marc-salaire-3` → `marc-salaire-2`, `marc-geant-court` → `marc-geant`,
`paris-v2` → le cadre `whatif`. Tout le reste passe par `src/assets/` ou `src/shared/`.
Vérification : `grep -rn "from '\.\./[a-z0-9-]*/" src/videos` ne liste que ces cas.

Les anciens chemins sont dans [path-migration.json](path-migration.json).
Une sauvegarde de l'état avant réorganisation est conservée localement sous
`.cache/backups/before-layout-1.01/`.
