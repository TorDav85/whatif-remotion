---
name: camera-realisateur
description: Découper et cadrer les plans de caméra d'une vidéo verticale 9:16 (Remotion + Three.js) comme un réalisateur. Utiliser pour créer ou retoucher la caméra d'une vidéo, choisir les plans d'une scène, corriger un cadrage (dos qui bouche l'image, tête coupée, texte illisible) ou filmer une ville de l'éditeur.
---

# Caméra réalisateur — vidéos verticales 1080×1920

## Principe
Un plan = un moment du récit. Jamais un seul plan large pendant toute une scène.
Chaque plan a une vue de début et une vue de fin `{pos, target, fov}` et un mouvement.
Les coupes entre plans sont franches, masquées par un fondu au noir de ~0,2 s.

Code à réutiliser (ne pas réécrire) :
- `src/assets/city/camera.ts` : types `Shot`/`View`, `sampleShots(shots, t)`, `shotsDuration`, `PRESETS`.
- `src/shared/three/common.tsx` : `CameraRig` (caméra pilotée par le temps, jamais `useFrame`).
- Modèle de découpe par scène : `SHOTS` / `CUTS` dans `src/videos/internet-off/Scene3D.tsx`.
- Ville : `npm run city`, onglet **Caméra** → plans enregistrés dans `public/city-layouts/<nom>.json`,
  filmés par la composition `CityLayoutPreview`.

## Vocabulaire (valeurs de départ pour le 9:16)
| Plan | Caméra | Usage |
| --- | --- | --- |
| Vue d'ensemble 3/4 | haute, en diagonale, fov 48–50, léger zoom avant | installer le lieu |
| Drone en orbite | orbite autour du sujet, 4–6 s | révéler, montrer l'échelle |
| Plongée zénithale | au-dessus, cible au sol (décaler un peu en z) | carte, foule, organisation |
| Travelling de rue | 1,8 m, avance à vitesse constante, fov 60 | immersion, trajet |
| Grue montante | part de la rue, monte au-dessus des toits | transition, fin de séquence |
| Regard piéton | 1,65 m, lente approche, fov 55–58 | point de vue humain |
| Contre-plongée | 0,5–0,6 m, regarde vers le haut, fov 62–66 | grandeur, menace, tours |
| Révélation | démarre serré, recule et s'élève | dévoiler un décor |
| Gros plan visage | ~0,9 m du visage, hauteur des yeux, fov 45 | émotion, rire, réaction |
| Champ / contre-champ | deux personnages de profil, caméra perpendiculaire | dialogue, poignée de main |

## Règles du format vertical
- Le champ horizontal est étroit (≈ 33° à fov 55) : cadrer serré sur l'action, pas sur le décor.
- Rien entre la caméra et le sujet : vérifier arbres, potelets, stores, dos de personnages.
- Garder le haut (HUD) et le bas (sous-titres) libres : le sujet entre 25 % et 70 % de la hauteur.
- Lignes de fuite : une avenue qui mène au sujet (la tour Eiffel au bout) guide l'œil.
- Règle des 180° : dans un dialogue, rester du même côté de l'axe entre les personnages.
- Mouvement motivé : la caméra suit une action ou révèle une information, sinon plan fixe.
- Lumière forte (feu, téléphone, phares) : intensité modérée, sinon l'image brûle et le texte disparaît.

## Vérifier avant tout rendu complet
1. Rendre **une image au milieu de chaque plan** (`npx remotion still <Composition> out/x.png --frame=<n>`).
2. Les assembler en planche (5 par ligne) et relire : sujet visible, aucune coupe de tête, texte lisible.
3. Corriger les plans fautifs, re-rendre seulement ceux-là, puis lancer le rendu complet.
