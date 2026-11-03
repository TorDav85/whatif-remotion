# What if… — modèle Remotion + Three.js (vertical 1080×1920)

## Voix clonée locale : XTTS v2

Python 3.12 est compatible avec le paquet maintenu `coqui-tts` (ne pas installer
l'ancien paquet `TTS` dans le même environnement). Sous Windows, depuis la racine :

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124
.\.venv\Scripts\python.exe -m pip install -r scripts/audio/xtts/requirements.txt
npm run voice:prepare -- "C:\chemin\enregistrement.mp3"
npm run render:with-voice
```

La variante CUDA 12.4 est adaptée à la GTX 1660 Ti ; sur une machine sans NVIDIA,
remplacer l'index PyTorch par `https://download.pytorch.org/whl/cpu`.
Les scripts npm utilisent directement `.venv`, sans activation PowerShell.
FFmpeg est fourni par `imageio-ffmpeg`, sans installation système.

`scripts/audio/xtts/prepare.py` extrait 10 secondes, enlève le silence initial et produit
`public/reference.wav` en mono 44,1 kHz, normalisé à −20 LUFS.
Pour choisir un autre passage :

```powershell
node scripts/audio/python.mjs scripts/audio/xtts/prepare.py "C:\chemin\enregistrement.mp3" --start 5 --seconds 10
```

Le modèle XTTS demande d'accepter sa licence au premier téléchargement
([CPML](https://tts-hub.github.io/cpml), usage non commercial, ou licence commerciale).
Le programme ne l'accepte pas automatiquement. Les poids sont conservés dans `.cache/`.
Après avoir lu et accepté la CPML, l'option `--accept-license` de `scripts/audio/xtts/generate.py`
permet de mémoriser cet accord dans `.cache/xtts-cpml-accepted.json`.
L'enregistrement et la synthèse sont traités localement ; le premier lancement télécharge
les dépendances et les poids du modèle.

`npm run voice:xtts` lit `src/videos/whatif/timeline.json` et génère `public/voice-xtts/beat-N.wav`.
Le champ `voice` est prioritaire ; une chaîne vide impose le silence.
Chaque piste est normalisée et, si nécessaire, accélérée sans changer sa hauteur
(limite 2×). Une phrase trop longue fait échouer la commande pour permettre sa correction.
Les durées et vitesses figurent dans `public/voice-xtts/timing.json`.
Le cache vérifie le texte, la référence, les timings et l'intégrité des WAV.
La voix n'est activée dans le scénario qu'après validation de toutes les pistes.

`npm run render:with-voice` génère l'ambiance, la voix puis
`out/whatif-xtts.mp4` (composition `WhatIf`, 46 secondes).
`npm run voice:check` contrôle les WAV, leurs durées et empreintes, les métadonnées
du MP4 et son décodage complet, puis écrit `out/xtts-validation.json`.
Pour d'autres scénarios, choisir un dossier distinct et lancer leur rendu habituel :

```powershell
node scripts/audio/python.mjs scripts/audio/xtts/generate.py src/videos/paris-tiktok/scenario.json --output-dir voice-tiktok-xtts --activate
npm run render:tiktok
```

`--dry-run` permet de vérifier les textes et créneaux sans charger XTTS.
`--force` régénère les pistes. Avec un seul enregistrement, cette procédure utilise
le clonage par référence ; elle n'effectue pas de fine-tuning.

## Montage TikTok : 70 secondes en français

Composition **`WhatIfParisTikTok`**, 1080 × 1920, 30 images/s, **2 100 frames**.
Scénario unique : `src/videos/paris-tiktok/scenario.json`. Base visuelle de la V6 hivernale.

- accroche « Cette voiture a 6 secondes », compte à rebours, disparition à 5,8 s ;
- relances courtes, sous-titres remontés pour le mobile, voix française Windows Hortense ;
- Paris 0–28 s, France 27–37 s, Terre 36–46 s, système solaire 45–58 s, galaxie 57–70 s ;
- retour en fondu au premier plan à 68,5 s, dernière image identique à la première ;
- retournement : un trou noir n'est pas un aspirateur cosmique. Source : [NASA](https://science.nasa.gov/universe/black-holes/).

La masse terrestre du trou noir est une hypothèse du scénario ; temps, absorption et tailles sont stylisés.
La version ne promet aucune performance de diffusion. Les exports précédents restent disponibles.

```bash
npm run voice:tiktok  # narration française locale, durées contrôlées par phrase
npm run assets:tiktok # scénario lisible, sous-titres SRT, texte et hashtags dans out/
npm run render:tiktok # out/whatif-paris-tiktok-70s.mp4, voix et ambiance synchronisées
```

`public/voice-paris-tiktok70/timing.json` indique les durées et vitesses réellement synthétisées.
Le script arrête la génération si une phrase dépasse son créneau. Les scripts PowerShell utilisent
la voix française déjà installée, sans service de synthèse externe.

## Version 6 : Paris dans l'hiver de Whiteout

Composition **`WhatIfParisV6`** : **76 secondes**, 1080 × 1920, 30 images/s.
Référence visuelle : [Whiteout, par Philipp Burckhardt](https://whiteout.plgb.chatgpt.site/).
La V6 conserve la base de la V4 enrichie : voiture rouge au Champ-de-Mars, trou noir surélevé,
absorption, recul Paris → France → Terre et Lune → huit planètes → Voie lactée.

Nouvelle direction : façades bleu-gris, neige sur les surfaces orientées vers le ciel, flocons animés
qui tournent avec l'aspiration, routes humides avec traces de pneus et de glace, lampadaires chauds,
rebords de fenêtres et corniches, brume froide, titrage sans empattement et repères fins.
Les shaders, la géométrie et l'ambiance sonore sont créés dans ce projet ; les fichiers du jeu Whiteout
ne sont pas exécutés ou incorporés dans la vidéo. Les textures planétaires de `planet_simulation` restent utilisées.

```bash
npm run still:v6  # out/paris-v6.png
npm run render:v6 # out/whatif-paris-v6.mp4, son stéréo et vent hivernal
```

Tous les réglages du scénario sont dans **`src/videos/paris-v6/scenario.json`**. `Winter.tsx` contient les matériaux
et les flocons déterministes. `City.tsx` contient le décor et `WhatIfParisV6.tsx` l'habillage.
La V6 est indépendante des versions précédentes, conservées avec leurs compositions et exports.

## Version 4 : Paris dans un univers cartoon d'aventure

Composition **`WhatIfParisV4`** : **76 secondes**, 1080 × 1920, 30 images/s.
Référence visuelle : [Wind Waker JS, par Robin Payot](https://wind-waker-threejs.com/).
Le rendu reprend les aplats de lumière, la palette vive, les nuages blancs, les traits de vent,
l'eau bleue avec écume et l'habillage de parchemin observés dans cette démo.
Matériaux, eau, vent, nuages, boussole et panneaux sont créés procéduralement dans ce projet,
avec une adaptation au rendu vidéo Remotion/WebGL.

Le scénario de la V3 retravaillée est conservé : voiture rouge à suivre, trou noir surélevé,
absorption, recul de Paris vers la France, la Terre, le système solaire puis une galaxie spirale.
La V4 est indépendante : ses sources sont dans `src/paris-v4/`, son scénario dans `scenario.json`.

```bash
npm run dev        # sélectionner WhatIfParisV4 (première composition)
npm run still:v4   # → out/paris-v4.png
npm run render:v4  # → out/whatif-paris-v4.mp4, avec ambiance originale stéréo
npm run render:v4:solar # → out/whatif-paris-v4-systeme-solaire.mp4
```

`Style.tsx` contient le cel-shading à quatre niveaux, les contours de silhouette,
le shader d'eau et d'écume animé, les nuages et les lignes de vent.
La Seine et la carte marine utilisent le même shader et les contours Natural Earth de la V3.
Les animations restent déterministes et les versions précédentes restent disponibles.

### Système solaire et planètes texturées

Référence et textures : [planet_simulation, par Daehli Nadeau-Otis](https://github.com/daehli/planet_simulation),
commit `7f5fe2348ec534b38d4399542fe09318361d64d6`.
La séquence reprend le principe des groupes orbitaux et des corps texturés éclairés par le Soleil,
avec une réimplémentation pour Three.js actuel et une animation calculée depuis la frame Remotion.

- 42–52 s : Terre texturée, atmosphère, nuages, balise sur Paris et Lune ;
- 51–64 s : recul dans le système solaire avec huit planètes, rotation propre, orbites et traînées,
  anneaux de Saturne et d'Uranus, ceinture d'astéroïdes et étiquettes espacées pour le format portrait ;
- 63–76 s : recul vers la galaxie et conclusion.

`SolarSystem.tsx` contient la nouvelle scène. `PlanetTextures.ts` attend le chargement des images
et redessine la frame avant de libérer le rendu. Les paramètres orbitaux et les rayons visuels sont dans
`src/videos/paris-v4/scenario.json` → `solar`. Tailles, distances et vitesses sont adaptées à la mise en scène.
Les textures sont conservées dans `public/planet-simulation/` ; `SOURCE.json` indique leur provenance,
leur taille et leur SHA Git. `npm run assets:planets` permet de les récupérer et de vérifier leur intégrité.
L'export V4 précédent de 64 secondes reste dans `out/whatif-paris-v4.mp4` tant qu'il n'est pas réécrit.

## Version 3 : Paris, puis le recul jusqu'à la galaxie

Composition **`WhatIfParisV3`** : **64 secondes**, 1080 × 1920, 30 images/s.
Le début conserve le Champ-de-Mars et la tour Eiffel de la V2, vus de plus haut :
avenues avec marquages et passages piétons, 140 voitures animées, 44 passants,
arbres, bancs, immeubles et quartier de gratte-ciel stylisé.
Le trou noir apparaît dès 0,7 seconde, à 12 mètres au-dessus du parc. Les objets suivent des spirales,
se soulèvent, rétrécissent et disparaissent dans son centre.

Le recul enchaîne quatre échelles avec fondus :

- 0–34 s : voiture rouge, parc, absorption, puis vue aérienne de la ville et de la Seine ;
- 33–43 s : carte de France avec Paris comme point d'origine ;
- 42–52 s : globe terrestre, avec la même balise sur Paris ;
- 51–64 s : recul sur une galaxie spirale, avec un repère schématique du système solaire.

```bash
npm run dev        # sélectionner WhatIfParisV3 (première composition)
npm run still:v3   # → out/paris-v3.png
npm run render:v3  # → out/whatif-paris-v3.mp4, avec ambiance sonore
npm run render:v3:rework # → out/whatif-paris-v3-retravaillee.mp4
```

Le scénario, les timings, les positions de caméra, la densité de circulation, les textes et les chemins audio
sont regroupés dans **`src/videos/paris-v3/scenario.json`**. Décor : `City.tsx` ; cartes et espace : `Cosmos.tsx`.
Les voitures et passants sont animés à partir de la frame et d'une graine fixe, ce qui permet un rendu reproductible.
L'ambiance est synthétisée localement : circulation au début, aspiration, puis nappes spatiales.
Voix off optionnelle : `npm run voice:v3` avec un modèle Piper, puis activer `audio.voice` dans le scénario.

Les continents et frontières proviennent de [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), domaine public.
Les contours simplifiés sont conservés dans `src/videos/paris-v3/land.json` ; le fichier source est `public/geo/countries.geojson`.
`node scripts/assets/prepare-geography.mjs` permet de régénérer les données compactes.
Le montage retravaillé remplace l'attente initiale par une accroche dès la première image :
« Cette voiture va disparaître. » Un repère suit la voiture rouge jusqu'à sa disparition à 7,6 secondes.
Un silence bref puis un impact ponctuent ce moment. Les textes sont plus courts, avec des mots-clés colorés,
et relancent l'attention avant la tour Eiffel et chaque changement d'échelle.
La caméra conserve sa vitesse entre les paliers ; les toits, fenêtres et roues restent solidaires de leurs objets.
Réverbères, feux, anneaux mobiles autour du trou noir, nuages et atmosphère terrestre complètent les détails.
L'ancien export de 84 secondes est conservé ; le nouvel export utilise le suffixe `-retravaillee`.
La ville, l'absorption, la galaxie et les passages entre échelles restent une mise en scène stylisée.
Les versions précédentes restent disponibles.

## Version 2 : le trou noir à Paris

Composition **`WhatIfParisV2`** : 46 secondes au **Champ-de-Mars**, dans un unique plan continu face à la tour Eiffel.
Le même décor reste visible de l'apparition du trou noir au flash final ; la conclusion se superpose au parc.

```bash
npm run dev        # sélectionner WhatIfParisV2 (première composition)
npm run still:v2   # → out/paris-v2.png
npm run render:v2  # → out/whatif-paris-v2.mp4, avec ambiance sonore
```

**Un seul fichier pour modifier le scénario : `src/videos/paris-v2/scenario.json`.**
Il contient les textes et timings, le lieu, la masse et le ralenti, les paramètres de caméra et du décor,
la progression des effets, le ciel, le flash, la conclusion et les chemins audio.
Le décor 3D se trouve dans `src/videos/paris-v2/ParisBlackHole.tsx`.
Les chiffres du HUD et le déplacement de caméra utilisent le même modèle de chute et la même configuration.
La déformation des objets et la lumière sont une mise en scène amplifiée, pas une simulation relativiste.

Voix off facultative : définir `PIPER_MODEL`, lancer `npm run voice:v2`, puis activer `audio.voice` dans le scénario.
La première version et les compositions `NatureReprend` et `Chaleur` restent disponibles.

Scénario de départ : « Et si un trou noir de la taille d'une pièce apparaissait à côté de toi ? » (46 s).

## Lancer
```bash
npm install
npm run dev        # prévisualisation (Remotion Studio) — génère aussi public/ambience.wav
npm run render     # → out/whatif.mp4
npm run still      # une image test (frame 300)
```
Si le rendu est noir ou plante : dans `remotion.config.ts`, remplace `'angle'` par `'swangle'` (CPU) ou `'egl'`.

## Où modifier quoi
| Je veux changer… | Fichier |
| :-- | :-- |
| Textes, timings, HUD, ciel, flash, caméra de la Terre, masse du trou noir | `src/videos/whatif/timeline.json` |
| Formules (rayon de Schwarzschild, chute libre, formats français) | `src/core/physics.ts` |
| Parc (herbe, arbres, personnages, skyline, trou noir) | `src/videos/whatif/scenes/Park.tsx` |
| Terre vue de l'espace / comparaison d'échelle | `src/videos/whatif/scenes/Earth.tsx`, `Scale.tsx` |
| Style HUD, sous-titres, carte finale | `src/ui/*` |

Tout ce qui s'affiche en chiffres est **calculé** : distance, vitesse, attraction, diamètre.
La caméra du parc avance exactement comme la chute calculée.

## Son
- `npm run ambience` : drone qui monte puis « boom » au flash (généré par code, sans dépendance).
- Voix off (optionnel) : installe Piper + un modèle français, puis `PIPER_MODEL=/chemin/modele.onnx npm run voice`
  et mets `"voice": true` dans `src/videos/whatif/timeline.json`. Chaque phrase démarre à l'instant de son beat.

## À savoir
- Fait pour être reproductible : aucune animation ne dépend de `useFrame()`, tout vient du numéro de frame et de RNG à graine fixe.
- Le « bloom » est simulé (sprites additifs + flash CSS), pas un vrai post-traitement.
- Le rayon du trou noir à l'écran est exagéré (le vrai fait 9 mm).
- La physique est newtonienne ; c'est une approximation pédagogique.

## Affirmations à vérifier avant publication
Marquées `"verify": true` dans le JSON : « 1/10 du Soleil », « ≈ 70 jours », « New York est un second soleil ».
Aussi : la phrase de la carte finale sur le poids des trous noirs connus (`src/videos/whatif/ui/EndCard.tsx`).

---

## Deuxième vidéo : « Et si l'humanité disparaissait demain ? » (Paris, 46 s)
Composition `NatureReprend`, même style (HUD, sous-titres, carte finale).
```bash
npm run render:nature   # → out/nature.mp4 (génère aussi public/nature.wav)
npm run still:nature    # une image test (frame 600)
```
| Je veux changer… | Fichier |
| :-- | :-- |
| Textes, paliers de temps (48 h → 300 ans), ciel, caméra, avancée de la nature | `src/videos/nature/nature.json` (`world` : lumières, herbe, lierre, arbres, effondrement, pont, rouille, tour…) |
| Ville, Seine, pont, tour, arbres, oiseaux, cerfs | `src/videos/nature/Paris.tsx` |
| HUD (compteur d'années, humains), sous-titres, carte finale | `src/videos/nature/NatureUi.tsx` |
| Son (rumeur de la ville, coupure, vent, oiseaux) | `scripts/audio/ambience-nature.mjs` |

Le compteur « temps sans humains » et l'année sont calculés (interpolation logarithmique entre les paliers de `days`).
Affirmations à vérifier (`"verify": true`) : réseau électrique coupé en ~48 h, toits effondrés vers 50 ans, pont tombé vers 100 ans, sommet de la tour tombé vers 300 ans.

---

## Troisième vidéo : « Et si la température montait de 10 °C chaque minute ? » (75 s)
Composition `Chaleur`, low-poly façon jouet, HUD thermomètre.
```bash
npm run render:heat   # → out/chaleur.mp4 (génère aussi public/heat.wav)
npm run still:heat    # une image test (frame 1200)
```
**La température pilote tout.** `src/videos/heat/timeline.json` → `curve` : keyframes temps vidéo → °C, lissées par une spline monotone
(la courbe ne redescend jamais et sa pente est continue). Tout le reste en découle (`src/videos/heat/curve.ts`) :
- temps écoulé = (T − 22) / 10 min ; time-lapse = pente × 6 ; horodatage de la caméra de surveillance ;
- chaque beat a un seuil `atC` : l'état du HUD change quand la courbe le franchit, le sous-titre s'affiche à cet instant
  (avec au minimum `captionMinSec` d'écran pour le précédent) ;
- l'étalonnage (`grade` : ciel, brume, soleil, voile de couleur) est indexé sur la température, pas sur le temps ;
- dans les scènes, chaque effet a son seuil : jets de la fontaine (60–120 °C), ébullition (≈ 100 °C), bassins à sec (172 °C),
  herbe en paille puis carbonisée, papiers (≈ 230 °C), toits en feu (290–450 °C), vitres (442–530 °C), lampadaires (660 °C),
  métal en fusion, lave (instant où la courbe franchit 1 000 °C).

Si tu changes la courbe, tout se recale tout seul. Mot-clé turquoise : entre accolades `{…}` dans le JSON.

| Je veux changer… | Fichier |
| :-- | :-- |
| Courbe, seuils, textes, étalonnage, découpage des séquences | `src/videos/heat/timeline.json` |
| HUD, thermomètre, sous-titres, habillage caméra de surveillance, fin | `src/videos/heat/HeatUi.tsx` |
| Briques 3D (personnages, immeubles, fenêtres, feu, fumée, braises, lave) | `src/videos/heat/kit.tsx` |
| Une séquence | `src/heat/scenes/*.tsx` (Plaza, Cctv, Park, Drone, Street, Metal, Aerial) |
| Son (drone, souffle, crépitements) | `scripts/audio/ambience-heat.mjs` |

Voix off : `PIPER_MODEL=/chemin/modele.onnx npm run voice:heat`, puis `"voice": true` dans `src/videos/heat/timeline.json`.
Chaque `public/voice/beat-<i>.wav` démarre à l'instant où le sous-titre de son seuil s'affiche.

À vérifier avant publication : 56,7 °C (record de Death Valley, 1913, contesté), « l'acier perd la moitié de sa résistance à 550 °C »
(ordre de grandeur pour l'acier de construction), « le plomb fond » est placé à 300 °C dans la liste mais le plomb fond à 327 °C.
