# What if… — modèle Remotion + Three.js (vertical 1080×1920)

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
| Textes, timings, HUD, ciel, flash, caméra de la Terre, masse du trou noir | `src/timeline.json` |
| Formules (rayon de Schwarzschild, chute libre, formats français) | `src/physics.ts` |
| Parc (herbe, arbres, personnages, skyline, trou noir) | `src/scenes/Park.tsx` |
| Terre vue de l'espace / comparaison d'échelle | `src/scenes/Earth.tsx`, `Scale.tsx` |
| Style HUD, sous-titres, carte finale | `src/ui/*` |

Tout ce qui s'affiche en chiffres est **calculé** : distance, vitesse, attraction, diamètre.
La caméra du parc avance exactement comme la chute calculée.

## Son
- `npm run ambience` : drone qui monte puis « boom » au flash (généré par code, sans dépendance).
- Voix off (optionnel) : installe Piper + un modèle français, puis `PIPER_MODEL=/chemin/modele.onnx npm run voice`
  et mets `"voice": true` dans `src/timeline.json`. Chaque phrase démarre à l'instant de son beat.

## À savoir
- Fait pour être reproductible : aucune animation ne dépend de `useFrame()`, tout vient du numéro de frame et de RNG à graine fixe.
- Le « bloom » est simulé (sprites additifs + flash CSS), pas un vrai post-traitement.
- Le rayon du trou noir à l'écran est exagéré (le vrai fait 9 mm).
- La physique est newtonienne ; c'est une approximation pédagogique.

## Affirmations à vérifier avant publication
Marquées `"verify": true` dans le JSON : « 1/10 du Soleil », « ≈ 70 jours », « New York est un second soleil ».
Aussi : la phrase de la carte finale sur le poids des trous noirs connus (`src/ui/EndCard.tsx`).

---

## Deuxième vidéo : « Et si l'humanité disparaissait demain ? » (Paris, 46 s)
Composition `NatureReprend`, même style (HUD, sous-titres, carte finale).
```bash
npm run render:nature   # → out/nature.mp4 (génère aussi public/nature.wav)
npm run still:nature    # une image test (frame 600)
```
| Je veux changer… | Fichier |
| :-- | :-- |
| Textes, paliers de temps (48 h → 300 ans), ciel, caméra, avancée de la nature | `src/nature/nature.json` (`world` : lumières, herbe, lierre, arbres, effondrement, pont, rouille, tour…) |
| Ville, Seine, pont, tour, arbres, oiseaux, cerfs | `src/nature/Paris.tsx` |
| HUD (compteur d'années, humains), sous-titres, carte finale | `src/nature/NatureUi.tsx` |
| Son (rumeur de la ville, coupure, vent, oiseaux) | `scripts/make-nature-ambience.mjs` |

Le compteur « temps sans humains » et l'année sont calculés (interpolation logarithmique entre les paliers de `days`).
Affirmations à vérifier (`"verify": true`) : réseau électrique coupé en ~48 h, toits effondrés vers 50 ans, pont tombé vers 100 ans, sommet de la tour tombé vers 300 ans.

---

## Troisième vidéo : « Et si la température montait de 10 °C chaque minute ? » (75 s)
Composition `Chaleur`, low-poly façon jouet, HUD thermomètre.
```bash
npm run render:heat   # → out/chaleur.mp4 (génère aussi public/heat.wav)
npm run still:heat    # une image test (frame 1200)
```
**La température pilote tout.** `src/heat/timeline.json` → `curve` : keyframes temps vidéo → °C, lissées par une spline monotone
(la courbe ne redescend jamais et sa pente est continue). Tout le reste en découle (`src/heat/curve.ts`) :
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
| Courbe, seuils, textes, étalonnage, découpage des séquences | `src/heat/timeline.json` |
| HUD, thermomètre, sous-titres, habillage caméra de surveillance, fin | `src/heat/HeatUi.tsx` |
| Briques 3D (personnages, immeubles, fenêtres, feu, fumée, braises, lave) | `src/heat/kit.tsx` |
| Une séquence | `src/heat/scenes/*.tsx` (Plaza, Cctv, Park, Drone, Street, Metal, Aerial) |
| Son (drone, souffle, crépitements) | `scripts/make-heat-ambience.mjs` |

Voix off : `PIPER_MODEL=/chemin/modele.onnx npm run voice:heat`, puis `"voice": true` dans `src/heat/timeline.json`.
Chaque `public/voice/beat-<i>.wav` démarre à l'instant où le sous-titre de son seuil s'affiche.

À vérifier avant publication : 56,7 °C (record de Death Valley, 1913, contesté), « l'acier perd la moitié de sa résistance à 550 °C »
(ordre de grandeur pour l'acier de construction), « le plomb fond » est placé à 300 °C dans la liste mais le plomb fond à 327 °C.
