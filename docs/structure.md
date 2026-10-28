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

Les anciennes variantes Paris conservent quelques dépendances entre vidéos : le kit
historique de `heat`, la tour Eiffel de `paris-v2`, les contours de `paris-v3`.
La commande de copie conserve ces imports. Pour une nouvelle scène indépendante,
préférer les objets de `src/assets/` et les outils de `src/shared/`.

Les anciens chemins sont dans [path-migration.json](path-migration.json).
Une sauvegarde de l'état avant réorganisation est conservée localement sous
`.cache/backups/before-layout-1.01/`.
