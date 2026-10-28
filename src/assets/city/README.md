# Ville & extérieur — collection 1.02

![Les cinq familles d'objets](../../../docs/previews/assets-ville-1.02.png)

24 composants 3D procéduraux, sans modèle ou texture externe. Import :

```tsx
import {Bench, Bicycle, Tree, TrafficLight} from '../../assets/city';

const Decor = ({t}: {t: number}) => (
  <group>
    <Bench width={2.2} color="#986743" />
    <group position={[3, 0, 0]}><Bicycle color="#b85f42" wheelSpin={t * 3} /></group>
    <group position={[-3, 0, 0]}><Tree height={5} foliage="#bc8c48" seed={12} /></group>
    <group position={[5, 0, 0]}><TrafficLight state="green" /></group>
  </group>
);
```

Placer `Decor` dans un `ThreeCanvas`. Les objets sont en mètres, avec l'origine au sol
et la face avant vers −z ; placer et orienter chaque objet avec un `<group>`.
Les primitives et matériaux existants sont réutilisés depuis `src/assets/kit.tsx`.
Le temps d'animation doit venir de la frame Remotion, jamais d'une horloge.

## Catalogue

| Module | Composant | Réglages |
| --- | --- | --- |
| `Street.tsx` | `Bench` | `color`, `width`, `backrest` |
| | `StreetLamp` | `color`, `height`, `lit` (0–1) |
| | `Bollard` | `color`, `height` |
| | `TrashBin` | `color` |
| | `BusShelter` | `color` |
| | `BicycleRack` | `color`, `spaces` (1–12) |
| `Park.tsx` | `Tree` | `height`, `foliage`, `trunk`, `seed` |
| | `PineTree` | `height`, `foliage`, `trunk` |
| | `Hedge` | `color`, `width`, `height` |
| | `Planter` | `color`, `flowers` |
| | `Fountain` | `color`, `flow` (0–1,5 ; 0 coupe l'eau) |
| | `PicnicTable` | `color` |
| `Mobility.tsx` | `Bicycle` | `color`, `wheelSpin` (radians), `basket` |
| | `Scooter` | `color`, `wheelSpin` (radians) |
| | `TrafficLight` | `state` (`red`, `amber`, `green`), `height` |
| | `TrafficSign` | `kind` (`parking`, `crossing`, `no-entry`) |
| | `Crosswalk` | `width`, `stripes` (2–20) |
| | `RoadBarrier` | `color` |
| `CityLife.tsx` | `CafeTerrace` | `color`, `umbrella` |
| | `MarketStall` | `color`, `produce` |
| | `Kiosk` | `color`, `lit` (0–1) |
| | `ConstructionCrane` | `color`, `height`, `angle` (radians), `hookDrop` |
| | `TrafficCone` | `color` |
| | `FireHydrant` | `color` |

Les dimensions sont des valeurs positives. Les groupes et géométries restent manipulables
séparément pour ajouter des mouvements ou des effets dans une scène.
Les exports sont regroupés dans `index.ts` et aussi accessibles depuis `src/assets/index.ts`.
La bibliothèque ne dépend d'aucun scénario de vidéo.

## Prévisualiser

Dans le Studio : **Bibliotheque → AssetsVille**. Cinq planches animées de quatre secondes
présentent la rue, le square, la mobilité, les commerces et le chantier.
La grue de la planche est réglée à huit mètres ; son défaut réutilisable est douze mètres.

```powershell
npm run still:city     # out/assets-ville.png
npm run render:city    # out/assets-ville-1.02.mp4, 20 s, 1080 × 1920
```
