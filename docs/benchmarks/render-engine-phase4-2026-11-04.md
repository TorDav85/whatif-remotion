# Render Engine 2.0 — Phase 4 : profilage, essais et décision (2026-11-04)

Même machine que la phase 1 (i7-9750H, GTX 1660 Ti, Windows 11, secteur), Remotion 4.0.539.
**Résultat : aucune modification de scène ni de réglage par défaut n'est conservée.** Ce document dit pourquoi.

## 1. Frames lentes

`npx remotion render MarcGeantCourt out/benchmark/verbose-mgc.mp4 --codec=h264 --muted --log=verbose`
(concurrence CLI par défaut : 6 onglets).

- `Slowest frames` : frames 0 à 5, ≈ 7 000 ms chacune ; toutes les autres ≤ 472 ms ; `capture => 284ms` en moyenne.
- Les frames 0 à 5 sont la **première frame de chacun des 6 onglets** : coût d'initialisation (page, textures
  canvas, compilation des shaders), aggravé par 6 onglets qui démarrent ensemble.
- Première frame dans un onglet seul (`renderStill`, 3 essais) : 2,5 à 2,9 s (rue), 2,6 à 2,7 s (Paris géant),
  2,0 à 2,2 s (espace). À concurrence 2, ce coût pèse ≈ 2 % d'un rendu complet : pas une cible prioritaire.

## 2. Coût régulier par monde (`MarcGeantCourt`, angle ×2, 3 rendus de 120 images)

| Plage | Monde | ms/image | Draw calls | Triangles | Objets 3D |
|---|---|---|---|---|---|
| 60–179 | rue (`CityBase`) | 150 / 148 / 146 | 781 | 1,19 M | 13 446 (13 446 matériaux) |
| 750–869 | Paris géant | 137 / 119 / 136 | 46 | 6,17 M | 46 |
| 1100–1219 | espace | 77 / 83 / 83 | 38 | 17 k | 38 |

Compteurs relevés par une sonde temporaire (`renderer.info`, retirée, non commitée). Mesure dans la page,
sonde temporaire également : rue = mise à jour des matrices 5,6 ms + rendu GPU 26 ms (angle) / 14 ms (vulkan) ;
Paris géant et espace < 1 ms de GPU.

**Lecture** : l'espace, presque vide, coûte encore ≈ 80 ms/image : c'est le socle fixe (capture de l'image
1080×1920 et page). Capture seule (`renderFrames`) contre capture + encodage (`renderMedia`), 3 essais :
rue 115–136 contre 139–142 ms, espace 67–73 contre 74–80 ms : **l'encodage x264 pèse peu, la capture domine**.
Avec angle, concurrence 1 ≈ 2 : le travail limitant est sérialisé (processus GPU de Chrome partagé par les onglets).

## 3. Essai d'optimisation de scène : rejeté

Changement unique : voitures garées de `CityBase` (≈ 45 `Car` immobiles) regroupées dans un `React.memo`
pour ne plus être réconciliées à chaque image. Mesure A/B/A dans la même session, plage 60–179, 3 rendus :

| Version | ms/image |
|---|---|
| après | 144 / 140 / 139 |
| avant | 145 / 136 / 137 |
| après (bis) | 140 / 136 / 136 |

Écart inférieur à la dispersion : **aucun gain, changement retiré**. La réconciliation React n'est pas le goulot.
Les leviers restants côté scène (géométrie, nombre d'objets) modifieraient le visuel ou demanderaient une
refonte de `CityBase` utilisée par 7 vidéos : hors périmètre de cette mission.

## 4. Backend vulkan : rapide, mais pas équivalent au pixel

Vitesse, 60 images au milieu de chaque composition, ×2, 3 rendus chacun :

| Composition | angle (ms/image) | vulkan (ms/image) | Gain |
|---|---|---|---|
| MarcGeant | 182 / 174 / 176 | 108 / 109 / 108 | 39 % |
| MarcGeantCourt | 204 / 205 / 204 | 141 / 138 / 135 | 32 % |
| MarcMini | 90 / 94 / 93 | 80 / 78 / 79 | 14 % |
| MarcDeuxLunes | 156 / 149 / 149 | 140 / 135 / 138 | 9 % |
| WhatIfParisV6 | 80 / 76 / 75 | 71 / 75 / 74 | 5 % |
| AsteroideParis | 223 / 218 / 215 | 211 / 208 / 208 | 4 % |
| Chaleur | 107 / 107 / 103 | 103 / 101 / 103 | 3 % |

`InternetOffV1` exclu : ses WAV générés (`public/internet-off/*.wav`, ignorés par git) manquent dans ce checkout.

Image, 4 frames (10, 35, 60, 85 % de la durée) × 9 compositions, angle contre vulkan :
34 images sur 36 à écart moyen ≤ 0,67/255. **Deux vraies différences** :

- `Chaleur` frame 1912 : écart moyen 18,2, 40 % des pixels : le motif de lave procédural est différent.
- `MarcDeuxLunes` frame 882 : écart moyen 2,9 : passage piéton et lignes visibles en vulkan, masqués en angle
  (marquages à y = 0,02 sur une route à y = 0,01 : z-fighting tranché différemment par chaque backend).

**Décision** : `angle` reste le défaut (code, `remotion.config.ts`, CI en `swangle`). `REMOTION_GL=vulkan`
est une option, à utiliser seulement après comparaison des planches de la vidéo concernée (skill
`render-performance`), pour un gain de 3 à 39 % selon la scène.

## 5. Cache procédural : non justifié

Aucun calcul procédural n'a été mesuré comme coûteux en régime établi ; l'initialisation par onglet (≈ 2,5 s,
textures canvas incluses) pèse ≈ 2 % d'un rendu. Pas de cache disque sous `.cache/`, pas de skill
`procedural-cache`. Le cache des plans 3D de la branche `acceleration-rendu` (`plans3d`) reste en place.

## Pistes restantes (non traitées, mesurées comme possibles)

- `CityBase` : 13 446 objets et autant de matériaux pour 781 draw calls ; le z-fighting des marquages au sol.
  Une refonte (instanciation, matériaux partagés, marquages décalés) ferait gagner une partie des 26 ms GPU
  par image de rue, mais changerait des pixels de 7 vidéos : à décider à part, avec comparaison au pixel.
- Le premier rendu de chaque onglet (≈ 2,5 s) : peindre `useParisTerrain` seulement dans le monde qui s'en sert.
