---
name: refactor-sans-regression
description: Déplacer ou factoriser du code partagé entre vidéos (assets, personnages, décors, plans de caméra, kits) sans changer une seule image des films existants, avec preuve par comparaison pixel. Utiliser pour supprimer une dépendance entre dossiers vidéo, remonter un composant dans src/shared, renommer un module ou nettoyer du code commun.
---

# Refactoriser sans régression

## Règle d'imports (docs/structure.md)
Une vidéo n'importe pas le dossier d'une autre vidéo, sauf une version ou un épisode de la même
histoire (`cafe-cold-v2` → `cafe-cold`, `marc-salaire-3` → `marc-salaire-2`, `marc-geant-court` → `marc-geant`…).
Repérer les écarts :
```bash
grep -rn "from '\.\./[a-z0-9-]*/" src/videos --include=*.tsx --include=*.ts | grep -v "from '\.\./\.\./"
```

## Méthode
1. **Lire** le bloc et ses dépendances (constantes, helpers, imports relatifs). Un composant qui lit
   le scénario d'une vidéo (`P.layout.towerZ`) devient paramétrable, avec **les anciennes valeurs par défaut**
   (`EiffelLowPoly z = -170, height = 76`) ; un comportement propre à une vidéo devient un paramètre
   (`makeWindows(…, burstTime)` : Chaleur passe sa courbe, Paris garde le défaut).
2. **Déplacer** vers `src/assets/` (objet), `src/shared/sets/` (décor), `src/shared/characters/`,
   `src/shared/three/` (kit, plans, projection). Corriger les chemins relatifs du fichier déplacé
   (`'../../shared/three/common'` → `'./common'`), mettre à jour tous les importeurs, y compris
   `src/assets/CharactersPreview.tsx`, les scripts (`scripts/assets/*`) et la doc.
   Garder une réexportation dans l'ancien module seulement s'il reste des usages légitimes
   (`heat/kit` réexporte `instanced`).
3. Factoriser seulement le code **identique** : comparer les variantes (`md5sum` des blocs) ; les variantes
   avec tremblé, orbites ou logique propre restent locales.
4. `npx tsc --noEmit`, `npm test`.
5. **Prouver** l'absence de changement visuel : `npm run compare:stills -- <worktree-avant> Comp:f1,f2 …`
   sur toutes les compositions touchées (2 images chacune, dont une au milieu de l'action).
   Attendu : écart 0. Procédure du worktree et de la jonction `node_modules` : skill `verification-rendu`
   (supprimer la jonction **avant** le worktree).
6. Documenter le nouvel emplacement dans le tableau de `docs/structure.md`.

## Attention
- La release 2.01 (`src/releases/v2-01`) enveloppe les films d'origine et `camera-lock.json` fige leurs caméras :
  un changement de caméra apparaît dans `npm run test:city`.
- Ne pas mélanger refactorisation et changement visuel dans la même comparaison : faire la comparaison
  avant d'ajouter la nouveauté (ou exclure explicitement les images concernées).
- Les scripts de génération Python éditent des fichiers avec des chaînes : un `'` dans un texte français
  casse un littéral TypeScript ; relire et typer après chaque remplacement automatique.
