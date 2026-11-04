# Render Engine 2.0 — Phase 1 : référence, concurrence et backend GL (2026-11-04)

Données brutes : `render-engine-phase1-2026-11-04.json` (28 rendus). Aucune scène n'a été modifiée.

## Conditions

| | |
|---|---|
| Machine | i7-9750H (12 threads), 23,9 Go, GTX 1660 Ti + Intel UHD 630, Windows 11, sur secteur |
| Logiciel | Node 22.14, Remotion 4.0.539, branche `perf/render-engine` (base `acceleration-rendu`) |
| Composition | `MarcGeantCourt`, frames 675–794 (120), 1080×1920, h264, sans audio |
| Commande | `REMOTION_GL=<gl> node scripts/check/benchmark.mjs MarcGeantCourt --frames 120 --concurrency <c> --repeat 3` |
| Mémoire | « système » = hausse de la RAM utilisée de toute la machine pendant le rendu (inclut Chrome/WebGL) |

Le temps mesuré est celui de `renderMedia` seul (bundle en cache, navigateur déjà ouvert).

## Résultats (moyenne de 3 rendus)

| Backend | Concurrence | ms/frame (3 rendus) | Moy. ms/frame | 120 frames | RAM système moy. / max |
|---|---|---|---|---|---|
| angle | 1 | 167 / 157 / 155 | 160 | 19,2 s | 1 360 / 1 573 Mo |
| angle | 2 (défaut actuel) | 158 / 160 / 158 | **159** | 19,0 s | 2 034 / 2 253 Mo |
| angle | 4 | 186 / 190 / 190 | 189 | 22,6 s | 3 313 / 3 782 Mo |
| vulkan | 1 | 122 / 124 / 124 | 123 | 14,8 s | 1 361 / 1 397 Mo |
| vulkan | 2 | 98 / 95 / 94 | **96** | 11,5 s | 2 027 / 2 059 Mo |
| vulkan | 4 | 94 / 94 / 95 | 94 | 11,3 s | 3 218 / 3 246 Mo |
| egl | 2 | 538 / 538 / 539 | 538 | 64,6 s | 1 751 / 2 117 Mo |
| angle-egl | 2 | 526 / 517 / 523 | 522 | 62,6 s | 1 779 / 2 120 Mo |
| swiftshader | 2 | 521 / 513 / 524 | 519 | 62,3 s | 1 776 / 2 171 Mo |
| swangle | — | non mesuré en matrice : 14,8 s pour un seul still contre 3,1 s en angle | | | |

Premier rendu de référence (avant toute modification, 1 rendu, angle ×2) : 172 ms/frame. Il inclut un
navigateur fraîchement lancé ; les rendus répétés ci-dessus se stabilisent autour de 159.

### Contre-mesure `remotion benchmark` (`npm run benchmark:matrix`, angle, 3 rendus, bundle et navigateur compris)

| Concurrence | Temps moyen ± σ | ≈ ms/frame |
|---|---|---|
| 1 | 18,98 s ± 0,33 | 158 |
| 2 | 19,06 s ± 0,11 | 159 |
| 4 | 23,46 s ± 0,49 | 196 |

Les deux outils concordent.

## Image identique ? (frame 735, comparée à angle)

| Backend | Écart moyen (0–255) | Écart max | Pixels > 8 |
|---|---|---|---|
| swangle | 0,109 | 155 | 0,29 % |
| vulkan | 0,046 | 52 | 0,00 % |
| egl / angle-egl / swiftshader | 0,054 | 53 | 0,00 % |

Les petits écarts (anticrénelage, arrondis GPU) sont sous le seuil de `compare_images.py` (écart moyen ≤ 2).
**Une seule frame a été comparée** : la validation de vulkan sur plusieurs frames et plusieurs compositions
reste à faire avant de changer quoi que ce soit (phase 4).

## Lecture

- **Avec angle, le rendu est limité par le GPU, pas par le CPU** : passer de 1 à 2 onglets n'apporte rien, 4
  ralentit (+19 %) et coûte 2,4× la mémoire de 1.
- **vulkan est 40 % plus rapide qu'angle** à concurrence 2 (96 contre 159 ms/frame), à mémoire égale. Il profite
  du deuxième onglet (123 → 96) mais pas d'un quatrième (94, +60 % de mémoire).
- `egl`, `angle-egl` et `swiftshader` sont acceptés sous Windows mais tournent environ 3,3× plus lentement :
  leurs images identiques entre elles laissent penser qu'ils retombent tous sur un rendu logiciel. Ils sont inutiles sur cette machine.
- Candidat pour la phase 4, à valider visuellement : `REMOTION_GL=vulkan`, concurrence 2. La CI (Linux, sans GPU)
  doit garder `swangle`.

## Limites

- Une seule composition, une seule plage de 120 frames, une seule machine (portable : sensible à la chaleur).
- L'encodage et l'audio ne sont pas mesurés séparément (rendu `muted`).
- Mémoire système approximative : elle inclut tout ce qui tourne sur la machine.
