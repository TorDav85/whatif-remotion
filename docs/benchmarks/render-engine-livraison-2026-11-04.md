# Render Engine 2.0 — livraison (2026-11-04)

Branche `perf/render-engine`, partie de `acceleration-rendu` (42b7156). 7 commits, aucun poussé.
Machine de mesure : i7-9750H (12 threads), 23,9 Go, GTX 1660 Ti + Intel UHD 630, Windows 11, sur secteur,
Node 22.14, Remotion 4.0.539 (inchangé, comme React, Three.js et R3F).

## Fichiers modifiés et raison

| Fichier | Raison |
|---|---|
| `package.json`, `package-lock.json` | `@remotion/bundler` et `@remotion/renderer` déclarés (4.0.539 exacts) ; scripts `render:queue`, `benchmark:matrix` ; nouveaux tests dans `test:project` |
| `scripts/project/render-env.mjs` (nouveau) | lecture et validation communes de `REMOTION_CONCURRENCY` (entier ≥ 1, défaut 2) et `REMOTION_GL` (backends de Remotion installé, défaut `angle`) |
| `scripts/check/benchmark.mjs` | plus de concurrence ni de backend figés ; `--repeat N` ; backend et variables écrits dans le JSON |
| `scripts/project/render-queue.mjs` (nouveau) | file de rendu par slug : préparation unique, `RENDER_JOBS`, FFprobe, une reprise transitoire, protection des livrables, rapport |
| `scripts/check/render-env.test.mjs`, `scripts/check/render-queue.test.mjs` (nouveaux) | 11 tests `node:test` des fonctions de validation, sélection, contrôle FFprobe, file |
| `.claude/skills/render-performance/`, `.claude/skills/render-pipeline/` (nouveaux) | workflows, garde-fous et critères de validation |
| `docs/benchmarks/render-engine-phase1-2026-11-04.{md,json}`, `…-phase4-….md`, ce fichier | mesures et décisions |

Aucun fichier de `src/` n'est modifié : aucune composition, aucun slug, aucun ID, aucun chemin de sortie,
aucun comportement audio n'a changé.

## Dépendances ajoutées

- `@remotion/bundler@4.0.539` et `@remotion/renderer@4.0.539` : déjà importés par 7 scripts mais seulement
  présents en dépendances transitives de `@remotion/cli`. Le lockfile gagne 2 lignes ; aucune version résolue ne change.
- Aucune autre dépendance.

## Avant / après (`MarcGeantCourt`, frames 675–794, 120 images, 3 rendus)

Les réglages par défaut ne changent pas (angle, concurrence 2) : le « après » est ce que les nouvelles options
permettent, mesuré.

| Configuration | ms/image (3 rendus) | 120 images | Rendu complet estimé | RAM système max |
|---|---|---|---|---|
| Avant : angle ×2 (défaut) | 158 / 160 / 158 | 19,0 s | ≈ 3,5 min | 2 253 Mo |
| angle ×1 (`REMOTION_CONCURRENCY=1`) | 167 / 157 / 155 | 19,2 s | ≈ 3,6 min | 1 573 Mo |
| angle ×4 | 186 / 190 / 190 | 22,6 s | ≈ 4,2 min | 3 782 Mo |
| vulkan ×2 (`REMOTION_GL=vulkan`) | 98 / 95 / 94 | 11,5 s | ≈ 2,1 min | 2 059 Mo |
| Contrôle final, angle ×2 | 175 / 157 / 155 | — | ≈ 3,6 min | 2 227 Mo |
| Contrôle final, vulkan ×2 | 97 / 95 / 95 | — | ≈ 2,1 min | 2 000 Mo |

vulkan sur 7 compositions : 3 % (Chaleur) à 39 % (MarcGeant) plus rapide, **mais pas équivalent au pixel**
sur 2 des 9 compositions comparées (Chaleur, MarcDeuxLunes) : il reste une option, pas un défaut.
Détails : `render-engine-phase1-2026-11-04.md`, `render-engine-phase4-2026-11-04.md`.

File de rendu : `RENDER_JOBS=2` sur nature + whatif (46 s chacune) = 169 s au total, préparation comprise
(1 seule mesure) ; seule, une vidéo de 46 s prend ≈ 88 s.

## Tests exécutés et résultats réels (phase 5)

| Commande | Résultat |
|---|---|
| `npm ci` | OK |
| `npm run typecheck` | OK |
| `npm test` | OK : 57 tests TS + 11 tests projet, validation OK (10 avertissements préexistants : WAV de internet-off absents) |
| `node scripts/check/benchmark.mjs MarcGeantCourt --frames 120 --repeat 3` (angle puis vulkan) | voir tableau |
| `npm run render:queue -- gravity` | 1 ok, 130,7 s ; `out/gravite.mp4`, rapport `out/queue-reports/2026-11-04T12-53-16Z.json` |
| `npx remotion ffprobe` sur `out/gravite.mp4` | h264 1080×1920, 30/1, 1 650 images, 55,000 s ; AAC 48 kHz stéréo ; 73,6 Mo |
| Images extraites à 10 s et 40 s | contenu correct (non noir), vérifié à l'œil |

Essais de la phase 2 : relance (2 ignorées, MD5 inchangés), `--overwrite`, échec de mise en place
(code 1, pas de reprise, partiel supprimé), arguments invalides refusés, parité avec `remotion render`
(mêmes flux, écart d'image ≤ 0,38/255).

## Limites et optimisations restantes

- La file ne connaît que les 10 vidéos de `src/videos/catalog.json` ; les épisodes Marc\*, BombeNucleaireVille,
  AsteroideParis… (déclarés dans `src/Root.tsx`) n'y sont pas.
- `video.mjs prepare` réécrit `src/videos/registry.tsx` en fins de ligne LF (contenu identique) : à restaurer
  avec `git checkout` après une campagne (comportement préexistant).
- Le socle ≈ 80 ms/image vient de la capture d'image Remotion/Chrome : non réductible sans perte de qualité.
- `CityBase` : 13 446 objets et matériaux pour 781 draw calls, et z-fighting des marquages au sol ; une refonte
  accélérerait les scènes de rue mais changerait des pixels de 7 vidéos (à décider à part).
- Initialisation de chaque onglet ≈ 2,5 s (`useParisTerrain` peint même quand il ne sert pas).
- Mesures sur une seule machine (portable) ; la CI Linux (`swangle`) ne mesure pas la performance.
- `scripts/project/render-session.mjs` (branche `acceleration-rendu`) cite `docs/acceleration-rendu.md`,
  qui n'existe pas.

## Résumé pour la Pull Request

**Titre** : Render Engine 2.0 : benchmark configurable, file de rendu FFprobe, skills de performance

**Description** :

Basée sur `acceleration-rendu`. Ne modifie aucune composition (`src/` inchangé).

- Déclare `@remotion/bundler` et `@remotion/renderer` 4.0.539 (déjà importés, jusqu'ici transitifs).
- `REMOTION_CONCURRENCY` et `REMOTION_GL` validés (`scripts/project/render-env.mjs`) ; benchmark sans valeurs
  figées, `--repeat`, `npm run benchmark:matrix` (`remotion benchmark`, concurrences 1/2/4 × 3).
- `npm run render:queue` : rendu par slug du catalogue, préparation unique, `RENDER_JOBS` 1–4, contrôle
  FFprobe (durée, taille, pistes), une reprise pour erreur transitoire, livrables jamais écrasés sans
  `--overwrite`, rapport JSON, code de sortie non nul en cas d'échec.
- Skills `render-performance` et `render-pipeline`.
- Mesures (`docs/benchmarks/render-engine-*`) : avec angle la concurrence 2 est optimale (4 est 19 % plus
  lente) ; vulkan est 3 à 39 % plus rapide mais change des pixels sur Chaleur et MarcDeuxLunes, donc reste
  optionnel ; un `React.memo` dans `CityBase` n'apportait rien et a été retiré ; aucun cache procédural justifié.

Tests : `npm ci`, `npm run typecheck`, `npm test` (57 + 11), benchmark, rendu complet `gravity` via la file
contrôlé par FFprobe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
