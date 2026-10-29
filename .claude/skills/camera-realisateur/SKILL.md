---
name: camera-realisateur
description: Découper et cadrer les plans de caméra d'une vidéo verticale 9:16 (Remotion + Three.js) comme un réalisateur. Utiliser pour créer ou retoucher la caméra d'une vidéo, choisir les plans d'une scène, corriger un cadrage (dos qui bouche l'image, tête coupée, texte illisible) ou filmer une ville de l'éditeur.
---

# Caméra réalisateur — vidéos verticales 1080×1920

## Principe
Un plan = un moment du récit. Jamais un seul plan large pendant toute une scène.
Chaque plan a une vue de début et une vue de fin `{pos, target, fov}`, un mouvement (`ligne` ou `orbite`),
une vitesse (`doux`, `lineaire`, `entree` = démarrage lent, `sortie` = arrêt progressif),
une entrée (`coupe` ou `fondu` noir de 0,35 s) et un tremblé caméra épaule `shake` (0 à 1).

Code à réutiliser (ne pas réécrire) :
- `src/assets/city/camera.ts` : `Shot`, `sampleShots(shots, t)` (renvoie aussi `fade` à appliquer en noir
  par-dessus l'image), `viewAt`, `shotStarts`, `trajectory`, `PRESETS` (14 mouvements).
- `src/shared/three/common.tsx` : `CameraRig` (caméra pilotée par le temps, jamais `useFrame` dans Remotion).
- Exemple de découpe à la main : `SHOTS` / `CUTS` dans `src/videos/internet-off/Scene3D.tsx`.
- Ville : `npm run city`, onglet **Caméra** → plans enregistrés dans `public/city-layouts/<nom>.json`,
  filmés par `CityLayoutPreview` (sa durée suit celle des plans).

## Vocabulaire (valeurs de départ pour le 9:16)
| Plan | Caméra | Usage |
| --- | --- | --- |
| Vue d'ensemble 3/4 | haute, en diagonale, fov 48–50, léger zoom avant | installer le lieu |
| Drone en orbite | orbite autour du sujet, 4–6 s | révéler, montrer l'échelle |
| Plongée zénithale | au-dessus, cible au sol (décaler un peu en z) | carte, foule, organisation |
| Travelling de rue | 1,8 m, vitesse constante, fov 60 | immersion, trajet |
| Travelling latéral | glisse parallèlement aux façades | découvrir une rue, une vitrine |
| Grue montante | part de la rue, monte au-dessus des toits | transition, fin de séquence |
| Tilt vertical | caméra fixe, la cible monte du pied au sommet | hauteur d'une tour |
| Panoramique | caméra fixe, la cible balaie l'horizon | paysage, skyline |
| Regard piéton | 1,65 m, lente approche, fov 55–58 | point de vue humain |
| Caméra épaule | `shake` 0,5–0,7, vitesse constante | urgence, reportage, panique |
| Contre-plongée | 0,5–0,6 m, regarde vers le haut, fov 62–66 | grandeur, menace |
| Effet Vertigo | avance en élargissant le champ (taille du sujet constante) | malaise, prise de conscience |
| Révélation | démarre serré, recule et s'élève | dévoiler un décor |
| Gros plan visage | ~0,9 m du visage, hauteur des yeux, fov 45 | émotion, rire, réaction |
| Champ / contre-champ | personnages de profil, caméra perpendiculaire | dialogue, poignée de main |

## Montage
- Coupe franche par défaut ; `fondu` pour un saut de temps, de lieu, ou la fin d'une séquence.
- Raccord de mouvement : le plan suivant démarre là où le précédent s'arrête (bouton **Raccord**).
- Alterner large / serré : une vue d'ensemble, puis un plan à hauteur humaine.
- Mouvement motivé : la caméra suit une action ou révèle une information, sinon plan fixe.

## Règles du format vertical
- Le champ horizontal est étroit (≈ 33° à fov 55) : cadrer serré sur l'action, pas sur le décor.
- Rien entre la caméra et le sujet : arbres, potelets, stores, dos de personnages. L'éditeur le détecte
  (**Vérifier le cadrage** : obstacle à moins de 12 m devant l'objectif, caméra dans un objet ou sous le sol).
- Haut (HUD) et bas (sous-titres) libres : le sujet entre 25 % et 70 % de la hauteur.
- Lignes de fuite : une avenue qui mène au sujet (tour Eiffel au bout) guide l'œil.
- Règle des 180° : dans un dialogue, rester du même côté de l'axe entre les personnages.
- Lumières fortes (feu, téléphone, phares) modérées, sinon l'image brûle et le texte disparaît.
- Brume : `fogFar` au moins 3 × la distance caméra-sujet, sinon les plans larges sont délavés.

## Vérifier
Suivre le skill `verification-rendu` : `npm run stills -- <Composition> --shots` (une image au milieu
de chaque plan, en planche), corriger, puis seulement lancer le rendu complet.
