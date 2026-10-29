---
name: editeur-ville
description: Travailler sur l'éditeur de ville HTML (npm run city), le générateur, le registre des assets et le rendu des villes dans Remotion. Utiliser pour ajouter ou modifier un asset, un réglage du générateur, une fonction de l'éditeur, ou pour utiliser une ville enregistrée dans une vidéo.
---

# Éditeur de ville

## Architecture
```
src/assets/city/registry.tsx   catalogue unique : type, libellé, catégorie, réglages, rendu
        ├── src/editor/        éditeur navigateur (React + R3F), compilé par esbuild
        └── CityLayoutPreview  Remotion : même rendu, même caméra
src/assets/city/generator.ts   generateCity(options) → CityLayout (objets modifiables)
src/assets/city/camera.ts      plans du réalisateur (voir skill camera-realisateur)
src/assets/city/LayoutScene.tsx ciel, lumières, brume, sol + objets d'une ville
src/editor/geometry.ts         calculs purs testables (hauteur du sol, emprises)
scripts/project/city-editor.mjs serveur local 127.0.0.1:5199 + API /api/layouts/<nom>
public/city-layouts/<nom>.json villes enregistrées (versionnées)
```
Format : `{version: 1, name, sky: 'jour'|'nuit', items: [{id, type, x, y, z, ry, props}], camera: {shots}}`.
Unités en mètres, `ry` en radians, façades vers −z, y = 0,15 sur un trottoir.

## Ajouter un asset
1. Écrire le composant (low-poly : `Block`, `Cyl`, `Ball`, `Mat` de `src/assets/kit.tsx`), origine au sol,
   façade vers −z, props toutes optionnelles avec valeurs par défaut.
2. L'inscrire dans `registry.tsx` : `{type, label, category, defaults, params, lit?, render}`.
   `lit: true` s'il s'allume la nuit (reçoit `lit`). Les `params` génèrent le panneau de réglages.
3. Il apparaît seul dans le catalogue de l'éditeur et est rendu à l'identique dans Remotion.
4. `npm run test:city` vérifie : type unique, catégorie connue, défauts dans les bornes, rendu valide.

## Modifier le générateur
- Tout passe par `add(type, x, z, ry, props, y)` ; ids déterministes, graine `seeded(seed)`.
- Garder la ville reproductible (aucun `Math.random`) : le test « même graine → même ville » le vérifie.
- Nouvelle option : l'ajouter à `GenOptions` + `DEFAULT_GEN` + `GEN_FIELDS` (panneau) + un test.
- Les tests contrôlent aussi : aucun immeuble qui en chevauche un autre, immeubles sur trottoir,
  voitures sur la chaussée, options qui suppriment bien ce qu'elles désactivent.

## Éditeur
- `npm run city`, puis http://127.0.0.1:5199. esbuild recompile à chaque sauvegarde : recharger la page.
- Pas de `Date.now`/`performance` dans le code partagé avec Remotion ; l'éditeur seul peut animer en temps réel.
- Chaque objet a une boîte invisible (`userData.proxy`) pour le clic ; les visuels ne reçoivent pas d'événements.
- Clic qui traverse : le sol ignore les clics dont la première intersection est un objet.
- Au-delà de ~9 îlots l'éditeur ralentit (chaque immeuble reste indépendant pour être déplaçable).

## Utiliser une ville dans une vidéo
```tsx
const layout = useCityLayout('ma-ville');            // charge public/city-layouts/ma-ville.json
<LayoutScene layout={layout}>…personnages…</LayoutScene>  // + votre CameraRig ou sampleShots(layout.camera.shots, t)
```
Contrôle : `npm run stills -- CityLayoutPreview --shots`.
