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

## Deuxième vidéo, version 2 : « Et si l'humanité disparaissait demain ? » (même plan, plus riche)
Composition `NatureReprendV2`, dans `src/nature2/`. La v1 (`NatureReprend`, `src/nature/`) reste intacte.
```bash
npm run render:nature2   # → out/nature2.mp4 (génère aussi public/nature2.wav)
npm run still:nature2    # une image test (frame 600)
```
Déroulé (50 s) : **plein jour** en plan aérien, la ville vit (piétons, voitures, bateau-mouche) → **crépuscule** façon carte postale (tour, cathédrale et arc illuminés) → à `vanish` (8,6 s) tous les piétons s'évaporent en moins d'une seconde, les voitures freinent et s'arrêtent de travers, le bateau dérive → la ville reste **allumée mais vide** → les lumières s'éteignent → la suite comme avant.
Réglages de l'ouverture dans le JSON : `vanish`, `traffic` (nombre de piétons et de voitures, vitesses, freinage), `sunElev` (hauteur du soleil), `sky`, `camera`.

Nouveautés par rapport à la v1 :
- **Façades** : rez-de-chaussée, balcons filants en fer forgé, corniches, cheminées, stores de cafés qui se déchirent avec la rouille, rideaux de lierre qui montent depuis la rue.
- **Quais** : parapet et boîtes de bouquinistes (certaines tombent), péniches amarrées qui prennent l'eau puis coulent, des arbres finissent par pousser sur leur pont.
- **Lumière** : soleil bas dans l'axe de la Seine avec son reflet scintillant, lumière d'appoint froide, reflets des réverbères sur l'eau la nuit, brume sur la Seine le premier matin.
- **Météo et saisons** : averse avec éclairs pendant « les toits cèdent » (`rain`, `thunder`) ; saisons en time-lapse (`seasons`) : feuillage d'automne, neige l'hiver ; la cadence est plafonnée à `maxRate` an/s pour ne pas clignoter.
- **Animaux** (`fauna`, fenêtres de temps en s) : renards la première année, laie et marcassins sur la berge, canards sur la Seine, cerfs sur l'îlot.
- **Caméra** : spline qui passe par toutes les clés de `camera` (plonge vers l'eau puis remonte), sans s'arrêter sur chaque clé.
- **Son** : pluie et tonnerre ajoutés (`node scripts/make-nature-ambience.mjs <json> <wav>`), les oiseaux se taisent sous la pluie.

| Je veux changer… | Fichier |
| :-- | :-- |
| Textes, paliers, ciel, pluie, éclairs, saisons, animaux, caméra | `src/nature2/nature.json` |
| Scène 3D | `src/nature2/Paris.tsx` |
| Timing (spline caméra, pluie, saisons) | `src/nature2/time.ts` |

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

---

## Quatrième vidéo : « Et si la gravité s'arrêtait à Paris pendant 60 secondes ? » (55 s)
Composition `Gravite`. Mélange des quais de Seine (vidéo « humanité ») et du Champ-de-Mars + recul jusqu'à la Terre (vidéo « trou noir V3 »).
```bash
npm run render:gravity   # → out/gravite.mp4 (génère aussi public/gravity.wav)
npm run still:gravity    # une image test (frame 900)
```
Plans : quais vus du ciel (vivants) → coupure à 14 h → Champ-de-Mars (pique-niqueurs, nappes, ballons qui s'envolent) → la Seine décolle d'un bloc avec péniches et poissons → montée verticale au-dessus de Paris → la Terre et le geyser d'air → la gravité revient : chute, inondation de la rive gauche. Frise du bas : QUAIS · CHAMP-DE-MARS · CIEL · TERRE.

**Tout est calculé** (`src/gravity/time.ts`) à partir de la rotation de la Terre : sans gravité, chaque objet part en ligne droite pendant que le sol continue de tourner.
- vitesse de Paris ω·R·cos(lat) ≈ 1 100 km/h ;
- écart vertical ½·ω²R·cos²(lat)·τ² → **26 m** en 60 s ; dérive vers le sud ½·ω²R·cos·sin(lat)·τ² → **30 m** ;
- retour de la gravité : chute de 26 m en 2,3 s, impact à **82 km/h** ;
- colonne d'air : accélérée à g puis plafonnée à la vitesse du son → ≈ 14 km (`verify`, ordre de grandeur) ;
- piétons et objets légers : un supplément d'accélération pour l'air qui monte (`physics.people`, `physics.light`, choix de mise en scène).

| Je veux changer… | Fichier |
| :-- | :-- |
| Textes, plans, caméras, correspondance temps vidéo → temps réel (`tau`), constantes physiques | `src/gravity/gravity.json` |
| Ville, Champ-de-Mars, Seine, objets qui flottent, inondation | `src/gravity/City.tsx` |
| Globe et geyser | `src/gravity/Globe.tsx` (globe partagé `src/scenes/Earth.tsx`, maintenant centrable sur n'importe quelle ville) |
| HUD (heure, gravité, valeurs calculées), frise, carte finale | `src/gravity/GravityUi.tsx` |
| Son | `scripts/make-gravity-ambience.mjs` |

---

## Bibliothèque d'assets 3D (`src/assets/`)
Des modèles low-poly réutilisables dans toutes les vidéos, indépendants de tout scénario.
**Conventions** : unités en mètres, origine au sol au centre de l'objet, avant / façade tournés vers **-z**, faces plates, palette commune (`PAL` dans `kit.tsx`). Aucun asset n'anime quoi que ce soit tout seul : on passe le temps en props (`phase`, `wheelSpin`, `lit`…), donc le rendu reste reproductible.
```bash
npm run render:assets   # → out/assets.mp4 : la planche de présentation (24 s, une famille toutes les 4 s)
npm run still:assets    # une image test
```
| Asset | Fichier | Réglages principaux |
| :-- | :-- | :-- |
| `Person` + `PEOPLE_PRESETS` | `Person.tsx` | vêtements, peau, cheveux (`court`, `long`, `chignon`, `chauve`), pose (`debout`, `marche` + `phase`, `assis`, `bras-leves`), taille (enfant ≈ 0,6), sac |
| `Car`, `Bus` | `Car.tsx` | variante (`berline`, `citadine`, `taxi`, `utilitaire`), couleur, phares `lights`, rotation des roues `wheelSpin` |
| `Barge` (péniche), `TourBoat` (bateau-mouche) | `Boat.tsx` | couleurs, longueur, plantes sur le pont, verrière éclairée — origine au niveau de l'eau |
| `House` | `House.tsx` | largeur, profondeur, 1 ou 2 niveaux, murs, toit, volets, porte, jardin, fenêtres allumées |
| `Building` (haussmannien) | `Building.tsx` | largeur, étages, pierre, zinc, store du rez-de-chaussée, part de fenêtres allumées, `seed` ; `buildingHeight()` pour aligner une rue |
| `EiffelTower` | `EiffelTower.tsx` | hauteur, couleur, illumination `lit`, balise `beacon` (treillis instancié : un seul appel de dessin) |

Utilisation dans une scène :
```tsx
import {Building, Car, EiffelTower, Person, PEOPLE_PRESETS} from '../assets';

<group position={[27, 4, -40]} rotation={[0, -Math.PI / 2, 0]}><Building width={14} seed={7} lit={0.3} /></group>
<group position={[16, 4, -20]}><Car variant="taxi" lights={1} /></group>
<group position={[20, 4, -18]} rotation={[0, Math.PI, 0]}><Person {...PEOPLE_PRESETS[2]} pose="marche" phase={t * 7} /></group>
<group position={[-42, 4, -150]}><EiffelTower height={110} lit={0.4} /></group>
```
Pour des foules (centaines de personnages), garder les boîtes instanciées des scènes ; ces assets sont faits pour les plans rapprochés et moyens.

### Assets d'intérieur (`src/assets/interior/`, 42 objets)
Mêmes conventions (mètres, origine au sol, face avant vers -z). Les objets muraux ont leur origine au point d'accroche et se plaquent contre un mur situé côté +z.
```bash
npm run render:interior   # → out/assets-interieur.mp4 : une pièce toutes les 4 s (24 s)
npm run still:interior
```
| Pièce | Fichier | Assets |
| :-- | :-- | :-- |
| Salon (10) | `Living.tsx` | `Sofa`, `Armchair`, `CoffeeTable`, `TvStand`, `Television` (écran allumable), `Bookshelf`, `FloorLamp` (allumable), `Rug`, `Fireplace` (feu), `PottedPlant` |
| Cuisine (9) | `Kitchen.tsx` | `KitchenCounter`, `Sink`, `Stove` (feu allumé), `Fridge`, `UpperCabinet` (à ~1,45 m), `DiningTable`, `DiningChair`, `Microwave`, `Kettle` |
| Chambre (7) | `Bedroom.tsx` | `Bed`, `SingleBed`, `Nightstand`, `BedsideLamp`, `Wardrobe`, `Dresser`, `StandingMirror` |
| Salle de bain (6) | `Bathroom.tsx` | `Bathtub` (eau, canard), `Shower`, `Toilet`, `Washbasin` (miroir éclairé), `WashingMachine`, `TowelRail` |
| Bureau (4) | `Office.tsx` | `Desk`, `OfficeChair` (pivote), `Computer` (écran allumable), `WallShelf` |
| Décor (6) | `Decor.tsx` | `WallClock` (heure réglable), `PictureFrame`, `PendantLamp` (origine au plafond), `Radiator`, `Door` (ouverture réglable), `InteriorWindow` (rideaux, lumière du jour) |

```tsx
import {Sofa, FloorLamp, Television} from '../assets/interior';
<group position={[0, 0, 2]}><Sofa color="#3f6b4a" /></group>
<group position={[1.3, 0, 2.1]}><FloorLamp lit={1} /></group>
```
