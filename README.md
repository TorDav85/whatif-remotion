# What if… — vidéos verticales Remotion + Three.js

Vidéos TikTok / YouTube Shorts « Et si… ? » en 1080 × 1920 : scènes 3D low-poly à faces plates rendues
avec Remotion et Three.js, voix off générée en local (XTTS), ambiance et bruitages synthétisés en code.
Personnage récurrent : **Marc** (avec Julien), dans des épisodes de 40 à 85 s. Une seconde famille de
vidéos explique un phénomène réel dans un style **hologramme néon / rayons X**.

> **Un seul dossier, une seule branche de travail : `1.12`.** Elle réunit toute la production (série Marc,
> style hologramme, bombe nucléaire, ville de référence, accélération du rendu). `main` est protégée : on y
> fusionne par Pull Request une fois la CI verte. Feuille de route : [AMELIORATIONS.md](AMELIORATIONS.md).

Chaque section renvoie au **skill** qui détaille la méthode (`.claude/skills/`, voir [section 14](#14-skills-du-projet)).

## Sommaire

1. [Démarrer](#1-démarrer)
2. [Les vidéos](#2-les-vidéos)
3. [D'un scénario à une vidéo](#3-dun-scénario-à-une-vidéo)
4. [Créer un épisode Marc](#4-créer-un-épisode-marc)
5. [Style hologramme](#5-style-hologramme)
6. [Voix off et son](#6-voix-off-et-son)
7. [Vérifier](#7-vérifier)
8. [Rendre](#8-rendre)
9. [Améliorer la rétention](#9-améliorer-la-rétention)
10. [Faits et sources](#10-faits-et-sources)
11. [Publier](#11-publier)
12. [Code partagé](#12-code-partagé)
13. [Bibliothèque 3D, ville de référence et éditeur](#13-bibliothèque-3d-ville-de-référence-et-éditeur)
14. [Skills du projet](#14-skills-du-projet)
15. [Branches, CI et versions](#15-branches-ci-et-versions)

## 1. Démarrer

Prérequis : Node 20+ (la CI utilise Node 22), Git LFS pour les MP4 de `review/` ; pour la voix,
Python 3.12 et idéalement une carte NVIDIA.

```powershell
npm ci
npm run dev          # Remotion Studio
```

Dossiers du Studio : **Videos** (toutes les compositions et `Couverture`), **Videos-2-01** (finition visuelle 2.01),
**AudioFirst** (`AudioFirstBridge`), **Bibliotheque** (`Assets`, `AssetsVille`, `AssetsInterieur`, `AssetsDetails`,
`Personnages`, `HoloKit`, `Transitions`, `VilleReferenceDemo`, aperçus de ville).

Voix locale (facultatif, une fois) — détails dans [docs/voice.md](docs/voice.md) :

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124
.\.venv\Scripts\python.exe -m pip install -r scripts/audio/xtts/requirements.txt
npm run venv:check   # après un déplacement du dossier : Python de base, paquets, lanceur pip
```

Le modèle XTTS v2 (≈ 1,8 Go) est téléchargé au premier usage dans `.cache/`. Les chemins sont relatifs :
le dossier peut être déplacé (`venv:check` dit comment réparer `pip` si besoin).

## 2. Les vidéos

Chaque vidéo a son dossier dans `src/videos/<slug>/`, sa composition dans `src/Root.tsx` et ses scripts
`npm run voice:<slug>` / `npm run render:<slug>` (sortie `out/<slug>/<slug>-<durée>s.mp4`).

### Série Marc

| Composition | Slug | Durée | Titre public |
| --- | --- | --- | --- |
| `MarcGeant` | `marc-geant` | 83 s | Et si Marc devenait géant ? |
| `MarcGeantCourt` | `marc-geant-court` | 45 s | idem — pilote éditorial 1.11 monté à partir des plans de `MarcGeant` |
| `MarcMini` | `marc-mini` | 85 s | Et si Marc rétrécissait ? |
| `MarcSoif` | `marc-soif` | 81 s | Et si Marc ne buvait plus d'eau ? |
| `MarcFour` | `marc-four` | 84 s | Et si Marc était enfermé dans un four ? |
| `MarcCongel` | `marc-congel` | 85 s | Et si Marc était enfermé dans un congélateur ? |
| `MarcSalaire`, `MarcSalaire2`, `MarcSalaire3` | `marc-salaire*` | 3 × 79 s | Et si Marc était payé pour ne rien faire ? (parties 2 et 3 sans titre public) |
| `MarcDeuxLunes` | `marc-deux-lunes` | 84 s | Et si Marc voyait une deuxième lune ? |
| `MarcInvisible` | `marc-invisible` | 75 s | Et si Marc devenait invisible ? — aveugle, repérable à la chaleur, trahi par son déjeuner |
| `MarcInsomnie` | `marc-insomnie` | 80 s | Et si Marc ne dormait plus jamais ? — micro-sommeils, record de Randy Gardner, rats de Rechtschaffen |
| `MarcNoix` | `marc-noix` | 70 s | Et si le cerveau de Marc tenait dans une noix ? — neurones, corneille, cas de Marseille 2007 |
| `MarcBranchies` | `marc-branchies` | 75 s | Et si Marc respirait sous l'eau ? — oxygène dissous, 50 L/min, refroidissement par les branchies |

### Style hologramme (45 s chacune)

| Composition | Slug | Titre public |
| --- | --- | --- |
| `OiseauHauteTension` | `oiseau-haute-tension` | Et si l'oiseau touchait le pylône ? |
| `AvionPortance` | `avion-portance` | Et si l'avion ralentissait trop ? |
| `Tunnelier` | `tunnelier` | Et si la terre n'était plus retenue ? |

### Autres épisodes et bases

| Composition | Slug | Durée | Contenu |
| --- | --- | --- | --- |
| `BombeNucleaire` | `bombe-nucleaire` | 60 s | Et si une bombe nucléaire tombait sur cette ville ? (partie 1, [README](src/videos/bombe-nucleaire/README.md)) |
| `BombeNucleaireVille` | `bombe-nucleaire-ville` | 60 s | le même épisode tourné dans la ville de référence |
| `AsteroideParis` | `asteroide-paris` | 40 s | Et si un astéroïde tombait sur Paris ? |
| `InternetOffV1` | `internet-off` | 85 s | Et si Internet disparaissait ? |
| `CafeCold`, `CafeColdV2`, `BusCold`, `ParisPolar`, `ParisPolarV2` | `cafe-cold*`, `bus-cold`, `paris-polar*` | 66–68 s | « −10 °C par minute » |
| `AudioFirstBridge` | `audio-first-bridge` | variable | timeline compilée depuis l'audio aligné |
| Bases du catalogue (`WhatIf`, `Chaleur`, `NatureReprend[V2]`, `Gravite`, `WhatIfParisV2…V6`, `WhatIfParisTikTok`) | voir [catalog.json](src/videos/catalog.json) | | rendues par `npm run video -- render <slug>` ou `npm run render:queue` |

Rendus contrôlés et mesures : `review/1.10/` (tous les MP4) et `review/1.11/` (pilote), en Git LFS.

## 3. D'un scénario à une vidéo

Réserve d'idées : [50scenariomarc.txt](50scenariomarc.txt), 50 scénarios « Et si Marc… ? » au format
`narration.json` (cinq catégories). Ce sont des **brouillons** : sur les quatre premiers produits, chacun
contenait des erreurs factuelles ou des créneaux trop longs pour le texte. Avant de construire :

1. **Vérifier chaque fait** (skill `verification-faits`) et corriger ou retirer ce qui ne tient pas
   (« 10 fois moins d'oxygène » → environ 30 ; « il ne reconnaît plus personne » au record de Gardner → faux).
2. **Réécrire pour la voix** (skill `whatif-ghostwriter`) : ≈ 2,3 mots/s, 10 à 13 temps, accroche ≤ 4,4 s qui
   pose la règle **et** le problème, une escalade, une chute, une seule question finale.
3. **Valider le texte et l'intention de chaque plan** avant d'écrire la scène 3D.
4. Construire (section 4), vérifier (section 7), rendre (section 8), exporter (section 11).

## 4. Créer un épisode Marc

Skill [`nouvelle-video-marc`](.claude/skills/nouvelle-video-marc/SKILL.md), avec
[`camera-realisateur`](.claude/skills/camera-realisateur/SKILL.md) pour les plans.
Modèles : `marc-deux-lunes/` (rue, espace, extérieur), `marc-congel/` (huis clos) et les quatre derniers
épisodes (`marc-invisible`, `marc-insomnie`, `marc-noix`, `marc-branchies`) pour les décors multiples.

| Étape | Fichier | Contenu |
| --- | --- | --- |
| Format | `timing.json` | `{fps: 30, width: 1080, height: 1920, duration}` |
| Texte | `narration.json` | `{duration, beats: [{id, slot: [début, fin], text, seed?, source}]}` |
| Scène | `Scene3D.tsx` | horloge du récit en constantes exportées, décors, personnages, `SHOTS` via `src/shared/three/shots.ts` |
| Habillage | `Hud.tsx`, `TextOverlay.tsx` | compteur en haut à gauche, accroche, sous-titres, mention « scénario fictif », carte de fin |
| Composition | `Marc<Sujet>.tsx` + `src/Root.tsx` | `ThreeCanvas`, calques, pistes audio de `voice.json` |
| Voix et ambiance | `scripts/audio/marc-<sujet>.py` | prises XTTS calées sur les créneaux, bruitages ; instants clés recopiés de `Scene3D.tsx` |
| Publication | `publication.json` | titre « Et si … ? », source, instant de couverture, métriques |
| Couverture | `src/publication/Cover.tsx` | ajouter la scène à `SCENES` |

Règles :

- **Tout dépend du temps de la vidéo** (`frame / fps`) : jamais `Date.now()`, `Math.random()` ni `useFrame`.
- **Un plan par moment du récit**, coupes franches ; fondu au noir seulement aux vrais changements de temps,
  de lieu ou d'échelle.
- **Format vertical** : champ horizontal étroit (≈ 33° à fov 55), sujet entre 25 % et 70 % de la hauteur, rien
  devant l'objectif, textes dans la zone sûre (`src/shared/ui/PlatformSafeArea.ts`) ; l'accroche occupe
  ≈ 340–620 px et les sous-titres partent de 1 180 px : garder le visage entre les deux.

Pièges déjà rencontrés :

- **Fond et brouillard** : `<color attach="background">` ou `<fog attach="fog">` placés **dans un groupe** ne
  touchent pas la scène ; les régler sur `scene` (composant `Look` de `marc-branchies/Scene3D.tsx`).
- **Fondu de fin d'ambiance** : `smooth(END + 4, length, t)` avec `END + 4 > length` met **toute** la piste à zéro
  (`audio:levels` affiche −180 dB) ; borner le début à `length − 0,6`.
- **Matériaux transparents** (effacement, rayons X) : chaque mesh de `Marc` a son propre matériau, on peut donc
  régler `opacity` en parcourant le groupe (`Ghost` de `marc-invisible`, `Glassy` de `marc-noix`).
- **Mots que XTTS ne sait pas dire** : « cervelet », « l'épuise », « tu irais vivre ». Après deux graines ratées,
  reformuler et garder le mot technique à l'écran (HUD).
- Objets du ciel : les placer autour de la caméra (`cam + dir × 400`), `fog={false}`, `far` ≥ 3000.
- Exposant « ᵉ » absent d'Arial Black : écrire « DEUXIÈME ».

## 5. Style hologramme

Guide complet : [docs/style-hologramme.md](docs/style-hologramme.md). Fond noir, grille cyan, objets en fil de fer
émissif avec un corps translucide « rayons X », courant en impulsions lumineuses, HUD monospace.

- Kit : `src/shared/holo/` (thème, géométrie testée, matériaux additifs, `WireframeScene`, `PulseTube`,
  `ElectricArc`, `HudOverlay`, sous-titres) ; assets : `src/assets/holo/` (`Bird`, `PowerLine`, `Airliner`,
  `Airfoil`, `Tbm`). Planche : composition `HoloKit`.
- Canvas : `<ThreeCanvas linear={false} flat …>` (`flat` évite le tone mapping qui ternit le néon) ; dans `Cover.tsx`,
  l'entrée porte `flat: true`.
- Nouvelle vidéo : copier la structure de `oiseau-haute-tension/` et son script audio.

## 6. Voix off et son

Skill [`voix-xtts`](.claude/skills/voix-xtts/SKILL.md).

> **Licence** : les poids XTTS v2 sont sous CPML, usage **non commercial** du modèle **et des WAV produits**.
> Une chaîne monétisée ou sponsorisée doit changer de voix ; consentement écrit de la personne dont la voix
> est clonée. Détails et modèle d'accord : [docs/legal/voix-et-licences.md](docs/legal/voix-et-licences.md).

```powershell
npm run voice:add -- ma-voix "C:\chemin\enregistrement.mp3"   # 10 s de référence propre
npm run voice:use -- ma-voix
npm run voice:marc-noix                                       # prises + ambiance → public/marc-noix/, voice.json
npm run captions -- marc-noix                                 # transcription Whisper + sous-titres synchronisés
npm run audio:levels -- marc-noix out/marc-noix/marc-noix-70s.mp4
```

- Chaque réplique est mise en cache (texte + voix + graine) ; accélération ≤ ×1,3, sinon le script **échoue** :
  raccourcir le texte ou changer de graine (`"seed"` dans `narration.json`).
- **Toujours transcrire** après génération (`npm run captions`) : XTTS saute parfois une demi-phrase ou ajoute
  des syllabes en fin de prise. Un mot mal transcrit n'est pas forcément mal dit (Whisper écrit « 800 » pour
  « huit cents », « scène » pour « Seine ») ; une phrase manquante, si.
- Les scripts des derniers épisodes corrigent le gain des prises courtes (une passe de `loudnorm` sous-estime
  les répliques de moins de 3 s).
- Cibles : écart ≤ 3 LU entre répliques, ambiance baissée d'au moins 4 dB sous la voix, mix ≈ −16 LUFS.
- GPU de 6 Go : si XTTS échoue au chargement, vérifier l'espace disque, puis `CUDA_VISIBLE_DEVICES=-1` force le CPU.
- Les références vocales (`voice-samples/`) ne sont jamais versionnées ; les pistes des vidéos (`public/<slug>/`)
  le sont, celles des anciennes bases se reconstruisent.
- Bruitages : 38 effets synthétisés en code (`npm run sfx -- --list`, feuille `{duration, cues: [{t, sfx}]}` → WAV).
  Transitions `whip`, `zoom`, `flash` avec leurs sons : [docs/transitions-et-effets-sonores.md](docs/transitions-et-effets-sonores.md),
  démo **Transitions**.

## 7. Vérifier

Skill [`verification-rendu`](.claude/skills/verification-rendu/SKILL.md).

```powershell
npm test                                                  # typage + tests ville + projet + validation
npm run stills -- MarcNoix --frames 30,240,560,960,1450   # planche dans out/stills/<Composition>/planche.png
npm run editorial -- marc-noix                            # sous-titres, CTA, plans, sources, audio → out/editorial-report.md
```

- `npm run validate` contrôle aussi l'audio : chaque WAV existe, tient dans son créneau, ne chevauche pas la suivante.
- **Relire la planche avant tout rendu complet** : objectif bouché, tête coupée, texte sur un visage, sujet hors
  du champ horizontal (étroit en 9:16), décor qui passe devant la caméra, élément du ciel caché.
- Code partagé modifié : `npm run compare:stills -- <dossier-version-précédente> Comp:frame,frame …`, écart attendu 0.
- Sans GPU (CI, portable) : `REMOTION_GL=swangle`.

## 8. Rendre

Skills [`render-pipeline`](.claude/skills/render-pipeline/SKILL.md) et
[`render-performance`](.claude/skills/render-performance/SKILL.md).

```powershell
npm run render:marc-noix                                   # une composition déclarée dans Root.tsx
npm run rendu -- BombeNucleaireVille --brouillon           # 540×960 rapide dans out/brouillon/, cache des plans 3D
npm run rendu -- BombeNucleaireVille                       # 1080×1920 final dans out/rendu/
npm run render:queue -- nature heat --dry-run              # vidéos du catalogue : plan sans rien rendre
npm run render:queue -- nature heat                        # préparation unique, rendus, contrôle FFprobe, rapport
```

- Un rendu complet prend 3 à 9 min ; le lancer en arrière-plan. Repère : ≈ 80 ms/image de socle fixe (capture).
- `npm run plans3d:check -- <Comp>:<frame>,…` prouve que le cache des plans 3D ne change aucune image.
- Réglages : `REMOTION_CONCURRENCY` (1 ou 2 avec angle ; 4 est plus lent), `REMOTION_GL` (vulkan plus rapide mais
  **pas identique au pixel** : jamais par défaut). Mesures : [docs/benchmarks/](docs/benchmarks/), `npm run benchmark`,
  `npm run benchmark:matrix`.
- La file `render:queue` ne connaît que `src/videos/catalog.json` ; les épisodes Marc, hologramme et bombe gardent
  leur `npm run render:<slug>` ou `npm run rendu`. Elle ne remplace un livrable qu'avec `--overwrite`.

## 9. Améliorer la rétention

Skill [`montage-retention`](.claude/skills/montage-retention/SKILL.md). Pilote : `MarcGeantCourt`
([mesures avant / après](docs/versions/1.11.md)) — CTA à l'écran ramenés de 94 % à 7 % du temps,
sous-titres en groupes synchronisés, écart de volume de 3,0 à 0,5 LU.

| Outil | Rôle |
| --- | --- |
| `editorial.json` d'une variante | liste de coupes dans le film d'origine, modes d'habillage, CTA, schémas |
| `src/shared/captions/CaptionTrack.tsx` | sous-titres ≤ 6 mots / 32 caractères, calés sur la voix |
| `src/shared/ui/OverlayPolicy.ts` | modes `story` / `science` / `climax` / `end` : un type d'habillage à la fois |
| `src/shared/ui/transitions.ts` | coupe franche ou fondu (`dip`) |
| `npm run editorial` | diagnostic chiffré, à comparer avant / après |

Toujours créer une variante, ne jamais modifier l'original ; une version plus courte n'est pas « meilleure » tant
qu'elle n'a pas été publiée et mesurée.

## 10. Faits et sources

Skill [`verification-faits`](.claude/skills/verification-faits/SKILL.md). Chaque réplique chiffrée porte un champ
`source` dans `narration.json` : calcul depuis la règle du scénario (`1 350 g ÷ 100 ≈ 13,5 g`), référence primaire
(`Azevedo et al., J. Comp. Neurol. 2009`), ou ordre de grandeur assumé (« survie de 1 à 6 h, tables US Coast Guard »).
Distinguer la règle fictive des conséquences ; une mise en scène est signalée comme telle. La mention
« scénario fictif » reste à l'écran.

## 11. Publier

Skills [`export-publication`](.claude/skills/export-publication/SKILL.md) et
[`publication-et-stats`](.claude/skills/publication-et-stats/SKILL.md).

```powershell
npm run export:publication -- marc-noix   # ou -- --all ; --force pour remplacer des fichiers de même nom
```

```
out/publication/marc-noix/
  Et si le cerveau de Marc tenait dans une noix.mp4
  Et si le cerveau de Marc tenait dans une noix.jpg   couverture : scène 3D du film + titre, sans sous-titres ni HUD
  publication.txt                                      titre, description, hashtags
```

- Titre public au format « Et si [sujet] ? » dans `publication.json` ; le « ? » reste sur la couverture et dans le
  texte, pas dans les noms de fichiers. Règles communes : `src/core/publication-names.mjs` (testées).
- Couverture : `coverTime` choisit l'instant, `coverHighlight` les mots en doré. Le titre est toujours posé à partir
  de 1 000 px : choisir un instant où le sujet est dans la moitié haute, ou donner à la scène une caméra de
  couverture (prop `cover` de `marc-noix/Scene3D.tsx`).
- `publication.txt` ne contient plus de mention IA : l'indiquer avec l'option de chaque plateforme (TikTok, YouTube)
  au moment de publier.
- L'export ne renomme ni ne remplace rien sans `--force`.
- Après publication, consigner les métriques **par plateforme** dans `publication.json` et noter où les spectateurs
  décrochent, pour choisir la variante suivante.

## 12. Code partagé

Skill [`refactor-sans-regression`](.claude/skills/refactor-sans-regression/SKILL.md) ; tableau complet dans
[docs/structure.md](docs/structure.md#ce-qui-est-partagé).

| Besoin | Emplacement |
| --- | --- |
| Animations, calculs, noms de publication | `src/core/` |
| Plans de caméra, projection 3D → écran, kit instancié, ciel, globe | `src/shared/three/` |
| Personnages (`Marc`, `Actor`, `ArticulatedPerson`) | `src/shared/characters/` |
| Style hologramme | `src/shared/holo/` |
| Décors réutilisables (four…) | `src/shared/sets/` |
| Sous-titres, habillage, zones sûres, bulles de dialogue | `src/shared/captions/`, `src/shared/ui/` |
| Objets génériques | `src/assets/` |

**Règle d'imports** : une vidéo n'importe pas le dossier d'une autre vidéo, sauf une version ou un épisode de la
même histoire (`marc-salaire-3` → `marc-salaire-2`, `marc-geant-court` → `marc-geant`…). Un déplacement de code
se prouve par `npm run compare:stills` (écart 0).

## 13. Bibliothèque 3D, ville de référence et éditeur

Skills [`whatif-asset-expert`](.claude/skills/whatif-asset-expert/SKILL.md) et
[`editeur-ville`](.claude/skills/editeur-ville/SKILL.md).

`src/assets/` — mètres, origine au sol, façade vers −z, faces plates, animation pilotée par le temps.
Kit : `PAL`, `Block`, `Cyl`, `Ball`, `Mat`, `seeded` ([kit.tsx](src/assets/kit.tsx)) ; immeubles haussmanniens,
maisons, véhicules, bateaux, tour Eiffel, mobilier urbain, intérieurs (`src/assets/interior/`), rue complète
`CityBase` ([collection ville](src/assets/city/README.md)). Personnages et décors : [guide](docs/characters-and-world.md).

```powershell
npm run city                                     # éditeur → http://127.0.0.1:5199
npm run stills -- CityLayoutPreview --shots      # une image par plan enregistré
```

L'éditeur génère un quartier depuis une graine, permet de déplacer et régler chaque objet, de poser des plans de
caméra (14 mouvements, vérification et recadrage automatique) et enregistre dans `public/city-layouts/<nom>.json`,
filmé à l'identique par `CityLayoutPreview`. Le registre unique ([registry.tsx](src/assets/city/registry.tsx))
garantit le même rendu dans l'éditeur et la vidéo.

![Collection Ville & extérieur 1.02](docs/previews/assets-ville-1.02.png)

**Ville de référence de la série** ([guide](docs/ville-reference.md)) : une seule ville figée pour tous les épisodes,
`public/city-layouts/ville-reference.json` (graine 286, 1 451 objets, jamais régénérée par épisode), et trois lieux
pilotes : `appartement-marc`, `rue-marc`, `place-centrale`, chacun avec sa zone, ses points de placement et
4 cadrages 9:16. Un épisode nomme un lieu, place ses personnages et garde ses variantes (nuit, pluie, dégâts…).

```powershell
npm run city:freeze -- --check                    # le JSON figé = la régénération
npm run stills -- VilleReferenceVisite --frames 105,375,675,968,1305
```

## 14. Skills du projet

Versionnés dans `.claude/skills/` (découverts automatiquement par Claude Code ; fiches `agents/openai.yaml`
pour Codex, invocation `$<nom>`).

| Skill | Pour |
| --- | --- |
| [nouvelle-video-marc](.claude/skills/nouvelle-video-marc/SKILL.md) | créer un épisode « Et si Marc… ? » du scénario au MP4 |
| [whatif-ghostwriter](.claude/skills/whatif-ghostwriter/SKILL.md) | narration française calée sur les créneaux, écrite pour la rétention |
| [camera-realisateur](.claude/skills/camera-realisateur/SKILL.md) | découper et cadrer les plans en 9:16, transitions motivées |
| [voix-xtts](.claude/skills/voix-xtts/SKILL.md) | voix off XTTS, transcription, niveaux, ambiance, licence |
| [verification-faits](.claude/skills/verification-faits/SKILL.md) | sourcer ou calculer chaque chiffre avant publication |
| [verification-rendu](.claude/skills/verification-rendu/SKILL.md) | tests, planches, non-régression pixel, rapport éditorial, contrôle du MP4 |
| [render-pipeline](.claude/skills/render-pipeline/SKILL.md) | file de rendu du catalogue, reprises, rapport de campagne |
| [render-performance](.claude/skills/render-performance/SKILL.md) | mesurer et accélérer le rendu sans régression visuelle |
| [montage-retention](.claude/skills/montage-retention/SKILL.md) | version courte, sous-titres synchronisés, habillage par mode, une seule question |
| [export-publication](.claude/skills/export-publication/SKILL.md) | dossier de publication : titre « Et si … ? », MP4 et couverture nommés d'après lui |
| [publication-et-stats](.claude/skills/publication-et-stats/SKILL.md) | préparer la publication, consigner les métriques, diagnostiquer les décrochages |
| [refactor-sans-regression](.claude/skills/refactor-sans-regression/SKILL.md) | déplacer du code partagé sans changer une image |
| [whatif-asset-expert](.claude/skills/whatif-asset-expert/SKILL.md) | assets 3D procéduraux détaillés et déterministes |
| [editeur-ville](.claude/skills/editeur-ville/SKILL.md) | ajouter un asset, faire évoluer le générateur ou l'éditeur |

## 15. Branches, CI et versions

**CI** ([ci.yml](.github/workflows/ci.yml)) à chaque push et Pull Request : `npm ci` → `validate` → `typecheck` →
`test:city` → `test:project` → `editorial` → planches de deux vidéos en WebGL logiciel, publiées en artefact.
**`main`** : suppression et force-push interdits, fusion par Pull Request avec le contrôle `checks` vert.

**Un seul dossier de travail.** Les anciens dossiers parallèles (`whatif-1.12`, `whatif-acceleration`,
`whatif-hologramme`) étaient des worktrees git ; leurs branches (`perf/render-engine`, `acceleration-rendu`,
`style-hologramme`) sont fusionnées dans `1.12` et les dossiers supprimés. Pour essayer une idée à part, préférer
une branche dans ce dossier ; un worktree se retire avec `git worktree remove` une fois fusionné.

| Branche | Contenu |
| --- | --- |
| `main` | structure initiale (`0f8cb9b`) |
| `1.01`, `1.02` | Nature V2, Gravité, objets ; réorganisation `videos/` · `assets/` · `core/` · `shared/`, catalogue, XTTS multi-profils |
| `1.03-test2` | audit, chaîne audio-first, café / bus / polaire, `CityBase`, `InternetOffV1` |
| `htmlallasset` | éditeur de ville HTML, caméra réalisateur, vérification des cadrages |
| `1.10` | série Marc, finition visuelle [2.01](docs/versions/2.01.md), `review/1.10` (MP4 et mesures) |
| `1.11` | pilote éditorial `MarcGeantCourt`, sous-titres synchronisés, habillage par mode, rapport éditorial, mix ([notes](docs/versions/1.11.md)) |
| **`1.12`** | base consolidée ([notes](docs/versions/1.12.md)), ville de référence, transitions et bruitages, style hologramme, bombe nucléaire, accélération et file de rendu, quatre nouveaux épisodes Marc |

Finition 2.01 : `npm run stills:2.01`, `npm run render:2.01` (MP4 dans `out/2.01/`, cadrages conservés).

**Prochaines étapes** ([détail](AMELIORATIONS.md)) : publier les épisodes prêts et comparer leur rétention par
plateforme ; produire la suite de [50scenariomarc.txt](50scenariomarc.txt) en vérifiant chaque fait ; choisir une voix
compatible avec la monétisation ; donner un titre public à Salaire 2 et 3 ; fusionner `1.12` dans `main` par Pull Request.
