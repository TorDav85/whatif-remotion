---
name: render-performance
description: Mesurer et accélérer le rendu Remotion/Three.js de ce projet - benchmark par composition, matrice concurrence × backend GL, frames lentes, comparaison avant/après sans régression visuelle. Utiliser quand un rendu est trop lent, avant et après toute optimisation de scène ou de réglage de rendu, ou pour choisir REMOTION_CONCURRENCY et REMOTION_GL sur une machine.
---

# Performance de rendu

Références : `docs/benchmarks/render-engine-phase1-2026-11-04.md` et `…-phase4-2026-11-04.md`
(i7-9750H, GTX 1660 Ti, Windows). Ce qu'on sait déjà :
- ≈ 80 ms/image sont un socle fixe (capture 1080×1920) ; l'encodage x264 pèse peu.
- Avec angle, concurrence 1 ≈ 2 et 4 est plus lent : le travail limitant est sérialisé dans le GPU de Chrome.
- `React.memo` sur des objets immobiles de `CityBase` : aucun gain mesuré (essai rejeté).
- vulkan : 3 à 39 % plus rapide selon la scène, **mais pas équivalent au pixel** (motif de lave de Chaleur,
  marquages au sol de MarcDeuxLunes) : jamais par défaut, seulement après comparaison des planches.

## Règles
- **Un seul changement à la fois**, mesuré avant et après, dans les mêmes conditions (même composition, mêmes
  frames, même backend, même alimentation : un portable sur batterie ou chaud fausse tout).
- **3 répétitions minimum** ; un écart plus petit que la dispersion entre répétitions n'est pas un gain.
- Ne jamais annoncer un gain non mesuré. Écrire la commande exacte et la machine avec chaque chiffre.
- Pas de `Math.random()`, `Date.now()` ni `useFrame()` dans une composition : tout dépend de la frame.
- Ne pas changer les versions de Remotion (4.0.539), React, Three.js ou R3F pour gagner du temps.

## 1. Mesurer
```bash
npm run benchmark -- MarcGeantCourt --frames 120 --repeat 3                 # 120 images au milieu
npm run benchmark -- MarcGeantCourt --frames 120 --concurrency 1,2,4 --repeat 3
npm run benchmark -- BombeNucleaireVille@8s-30s --out out/benchmark/avant.json
REMOTION_GL=vulkan npm run benchmark -- MarcGeantCourt --frames 120 --repeat 3
npm run benchmark:matrix                     # contre-mesure : remotion benchmark, 1/2/4 × 3 rendus
```
- `REMOTION_CONCURRENCY` (entier ≥ 1, défaut 2) et `REMOTION_GL` (défaut `angle`) sont validés par
  `scripts/project/render-env.mjs` ; `--concurrency` (liste) reste prioritaire dans le benchmark.
- Backends acceptés par Remotion installé : `swangle, angle, egl, swiftshader, vulkan, angle-egl`.
  Sous Windows, `egl`, `angle-egl` et `swiftshader` retombent sur un rendu logiciel (≈ 3× plus lents) ;
  `swangle` est le WebGL logiciel de la CI (sans GPU).
- Résultats : `out/benchmark/*.json` (ms/image, mémoire Node et système, backend, variables d'environnement).

## 2. Trouver ce qui coûte
```bash
npx remotion render MarcGeantCourt out/benchmark/verbose.mp4 --frames=600-779 --codec=h264 --muted --log=verbose
```
En fin de rendu : `Slowest frames` (les 10 plus lentes) et les temps internes. Faire une planche de ces frames
(`npm run stills -- MarcGeantCourt --frames …`) pour voir quelle scène est en cause, puis lire son code.

Ordre de traitement :
1. allocations répétées à chaque frame (`new THREE.*`, tableaux, matrices créés dans le rendu) → `useMemo` ;
2. géométries et matériaux non partagés entre instances identiques ;
3. mises à jour d'instances inutiles (`instanceMatrix.needsUpdate` sur des instances immobiles) ;
4. backend GL et concurrence (mesurer sur la machine qui rendra) ;
5. encodage (crf, preset) : seulement en dernier, il touche à la qualité.

## 3. Prouver l'absence de régression
- Même frames avant/après : `npm run compare:stills -- ../avant <Composition>:<frames>` (méthode et précautions
  de jonction dans le skill `verification-rendu`). Attendu : écart 0 pour une optimisation de code.
- Changement de backend GL : écart non nul attendu (anticrénelage, arrondis GPU). Comparer plusieurs frames
  de plusieurs compositions ; accepter seulement un écart moyen ≤ 2/255 et vérifier les planches à l'œil.

## Critères de validation
- [ ] Mesure avant et après, 3 répétitions chacune, mêmes conditions, JSON conservés.
- [ ] Gain supérieur à la dispersion entre répétitions.
- [ ] Mémoire système de pointe compatible avec la machine (la concurrence la multiplie).
- [ ] Stills avant/après comparés : écart 0 (code) ou ≤ 2/255 vérifié à l'œil (backend).
- [ ] `npm test` vert ; synthèse ajoutée dans `docs/benchmarks/` avec machine et commandes.
