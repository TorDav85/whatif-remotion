---
name: nouvelle-video-marc
description: Créer de bout en bout un nouvel épisode « Et si Marc… ? » (Remotion + Three.js, 9:16) - scénario, scène 3D, HUD, sous-titres, voix XTTS, ambiance, enregistrement, vérification et rendu. Utiliser quand l'utilisateur demande une nouvelle vidéo avec Marc ou un nouveau « Et si… » dans le style de la série ; pas pour retoucher une vidéo existante.
---

# Nouvel épisode de la série Marc

Modèles à ouvrir avant d'écrire : `src/videos/marc-deux-lunes/` (épisode complet avec rue, espace
et décor extérieur) et `src/videos/marc-congel/` (huis clos en intérieur). Copier leur structure,
pas leurs constantes.

## 1. Dossier de l'épisode `src/videos/marc-<sujet>/`
| Fichier | Contenu |
| --- | --- |
| `narration.json` | `{duration, beats: [{id, slot: [début, fin], text, source?}]}` (skill `whatif-ghostwriter`) |
| `timing.json` | `{fps: 30, width: 1080, height: 1920, duration}` |
| `Scene3D.tsx` | horloge du récit en constantes exportées, décors, personnages, `SHOTS` via `src/shared/three/shots.ts` |
| `Hud.tsx` | compteur(s) en haut à gauche (`SAFE.top`), polices `SERIF` de `src/shared/ui/tokens` |
| `TextOverlay.tsx` | accroche (0–4,5 s), sous-titres, mots sonores, mention « scénario fictif », carte de fin |
| `Marc<Sujet>.tsx` | `ThreeCanvas` + calques + `Audio` de l'ambiance et des répliques (`voice.json`) |
| `publication.json` | variante d'accroche et de montage, métriques par plateforme (skill `publication-et-stats`) |

Personnages : `Marc` (`src/shared/characters/Marc.tsx` : `walk`, `cold`, `smile`, `frost`, mains)
et Julien = `Person` (`src/assets/Person`, chemise `#3a6fb0`). Décors : `CityBase` (rue, `lit` 0/1 pour
la nuit, `skyTop`/`skyBottom`), `src/assets/interior`, `src/shared/sets/`, `EarthGlobe` pour l'espace.

## 2. Écrire le récit (80–85 s, ou 40–45 s en version courte)
Accroche ≤ 4,5 s avec règle + problème, puis 8 à 12 temps qui apportent chacun une conséquence, une
escalade, une chute et une seule question finale. Mettre les instants clés en constantes dans
`Scene3D.tsx` et les **recopier** en tête du script audio (ils pilotent les bruitages).

## 3. Voix et ambiance
Copier `scripts/audio/marc-deux-lunes.py` → `scripts/audio/marc-<sujet>.py` (changer `SLUG`, la graine
de base `XX000 + i`, les événements et `ambience()`). Lancer
`node scripts/audio/python.mjs scripts/audio/marc-<sujet>.py --voice morpheus`, puis transcrire
et corriger (skill `voix-xtts`). Sous-titres synchronisés : `npm run captions -- marc-<sujet>`.

## 4. Enregistrer
- `src/Root.tsx` : import du composant et de `timing.json`, `<Composition id="Marc<Sujet>" …/>`.
- `package.json` : `voice:marc-<sujet>` et `render:marc-<sujet>` (sortie `out/marc-<sujet>/marc-<sujet>-<durée>s.mp4`).
- `npx tsc --noEmit`.

## 5. Vérifier puis rendre (skill `verification-rendu`)
Planche de 15–20 images couvrant chaque plan ; corriger les cadrages (caméra derrière un objet, élément
du ciel masqué par une façade, caméra sous l'eau, texte sur le visage) ; `npm run validate`,
`npm run editorial -- marc-<sujet>` ; rendu en arrière-plan ; `npm run audio:levels -- marc-<sujet> <mp4>`.

## Pièges rencontrés
- Objets du ciel (lunes, soleil, anneaux) : les placer autour de la caméra (`cam + dir × 400`),
  `fog={false}`, `far` ≥ 3000 ; vérifier le sens d'une rotation de `ringGeometry` (un signe faux la met
  derrière la caméra).
- Un plan « depuis les yeux » de Marc : caméra devant sa tête, pas dedans.
- Exposant « ᵉ » absent d'Arial Black : écrire « DEUXIÈME ».
- Licence XTTS non commerciale : le rappeler si la vidéo doit être monétisée.
