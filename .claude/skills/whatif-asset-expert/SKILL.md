---
name: whatif-asset-expert
description: Créer, détailler et intégrer les assets 3D procéduraux React/Three.js de ce projet What if Remotion, avec matériaux cohérents, animation déterministe et réglages dans l'éditeur de ville. Utiliser pour bâtiments, véhicules, personnages et mobilier ; pas pour générer une image isolée ou modifier seulement un texte.
---

# Expert en développement d'assets What if

Inspecter l'asset et ses importeurs avant de le modifier. `src/assets/` contient
plusieurs générations de modèles : `Car.tsx` et `vehicles/CarRed.tsx`, par exemple,
ne sont pas interchangeables. Vérifier le composant réellement utilisé dans la
scène cible ; garder les props, exports et transformations attendus par ses clients.

## Conventions de la bibliothèque

- Mètres, origine au sol au centre de l'emprise, avant vers −z. Un wrapper peut
  recevoir position et rotation : préserver ce contrat existant.
- Réutiliser `PAL`, `Block`, `Mat`, `Cyl`, `Ball` et les géométries de
  `src/assets/kit.tsx` ; vérifier aussi `colors.ts` et `shared.ts` si la famille
  existante les emploie. Le style est low-poly à faces plates.
- Les assets génériques n'importent pas une vidéo. La scène fournit le temps ou
  les valeurs animées : frame Remotion/fps, jamais `Math.random()`, horloge ou
  boucle `useFrame`. Pour les variations, utiliser une graine stable avec `seeded`.
- Définir les pièces mobiles dans leur repère mécanique : roues autour de X,
  portes autour d'une charnière, assise au niveau du sol prévu. Tester les valeurs
  extrêmes exposées dans l'éditeur, pas seulement le modèle par défaut.

## Ajouter des détails qui se lisent

Travailler d'abord la silhouette et les proportions au cadrage final, puis les
structures secondaires et les matériaux. Les fenêtres ont une épaisseur et des
appuis ; les garde-corps laissent voir entre les barreaux ; les poignées, jantes et
fixations ont une échelle compatible avec l'objet. Écarter les faces superposées
qui provoquent du z-fighting. Contrôler avant, côté et trois-quarts sous la lumière
de la scène ; ne pas corriger la géométrie uniquement par la caméra.

Pour les répétitions d'une même matière, préférer `DetailBlocks` de
`src/assets/details.tsx` ou les outils d'instanciation existants. Ne pas multiplier
les géométries et matériaux pour chaque latte ou balustre. Si un niveau de détail
devient coûteux dans une ville, exposer `details` avec un mode réduit, et mesurer
sur la même frame avant d'annoncer un gain. Éviter les textures externes si les
formes et matériaux procéduraux répondent au besoin.

## Intégrer et vérifier

Pour un nouvel objet, ajouter l'export à l'index pertinent. Dans l'éditeur, le
catalogue unique est `src/assets/city/registry.tsx` : type stable, catégorie connue,
defaults dans les bornes et paramètres utiles. Un objet nocturne déclare `lit: true` ;
adapter explicitement `lit` en `lights` si le composant l'attend. Ne pas renommer
les types sérialisés des villes existantes. Si l'emprise change, examiner
`src/editor/geometry.ts`, les proxies de sélection et le générateur.

Lancer `npm run typecheck` et `npm run test:city` pour une modification de la
bibliothèque intégrée. Les changements de calculs ou d'emprise peuvent nécessiter
un test de comportement ; les retouches visuelles se vérifient par rendu.
`AssetsDetails` présente les gros plans ; `Assets`, `AssetsVille` et
`AssetsInterieur` couvrent les collections. Utiliser par exemple :

```powershell
node scripts/check/stills.mjs AssetsDetails --frames 60,180,300,420,540 --out out/assets-details
```

Ouvrir et examiner les images produites, puis rendre une frame de la vidéo cible
si son asset est modifié. Rapporter les fichiers changés, les contrôles réellement
effectués et les limites restantes. Une compilation seule ne valide pas l'apparence.
