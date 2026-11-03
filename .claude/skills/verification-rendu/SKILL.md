---
name: verification-rendu
description: Vérifier une vidéo Remotion avant et après rendu - tests, validateur, images clés en planche, non-régression pixel, rapport éditorial, niveaux sonores et contrôle du MP4 final. Utiliser avant tout rendu complet, après une modification de scène, de caméra, d'asset, d'audio ou de code partagé, et avant de commiter ou pousser.
---

# Vérifier avant de rendre

Un rendu complet prend 3 à 9 minutes (référence : `docs/benchmarks/`) : on vérifie d'abord sur quelques images.

## 1. Tests et validateur (rapide, toujours)
```bash
npm test
```
= `typecheck` + `test:city` (caméra, générateur, catalogue, release 2.01) + `test:project` + `validate`.
`validate` contrôle aussi l'audio : WAV présents quand la voix est active, chaque piste dans son créneau,
sans chevauchement. Un seul fichier de tests : `npm run test:city -- camera`.

## 2. Images clés en planche
```bash
npm run stills -- MarcDeuxLunes --frames 60,500,1050,1500   # images choisies
npm run stills -- InternetOffV1 --count 10                  # 10 images réparties
npm run stills -- CityLayoutPreview --shots                 # une image par plan enregistré
```
Sortie : `out/stills/<Composition>/planche.png` (temps en jaune). La lire, zoomer une image si un détail compte.

À relire sur chaque image :
- le sujet est visible, rien ne bouche l'objectif (dos, arbre, potelet, voiture garée) ;
- aucune tête coupée, sujet entre 25 % et 70 % de la hauteur ;
- textes lisibles, sans chevauchement, dans la zone sûre (`src/shared/ui/PlatformSafeArea.ts`) ;
- un seul type d'habillage à la fois (sous-titres, schéma, question) ;
- pas d'image brûlée, de brume qui délave un plan large, ni de z-fighting.

## 3. Code partagé modifié : non-régression au pixel
Après un déplacement de code (`src/shared/`, `src/assets/`), comparer avec la version précédente :
```bash
git worktree add --detach ../avant <commit>           # puis lier node_modules (jonction Windows)
npm run compare:stills -- ../avant MarcFour:300,1500 Chaleur:150,900 …
```
Attendu : écart 0 sur chaque image d'une vidéo dont l'aspect ne devait pas changer. Supprimer ensuite
**la jonction d'abord** (`cmd /c rmdir ..\avant\node_modules`), puis `git worktree remove` :
dans l'autre ordre, la suppression peut traverser la jonction et vider le vrai `node_modules`.

## 4. Rapport éditorial et son
- `npm run editorial [-- <slug>]` → `out/editorial-report.md` : sous-titres en bloc, part de CTA à l'écran,
  CTA pendant la voix, plans longs, chiffres sans source, audio manquant. Il signale ; on décide.
- `npm run audio:levels -- <slug> <mp4>` : écart entre répliques, ambiance sous la voix, LUFS et crête.
- Voix : transcription (skill `voix-xtts`).

## 5. Rendu complet puis contrôle du MP4
Lancer le rendu en arrière-plan (`npm run render:<slug>`), puis vérifier durée, flux 1080×1920 30 i/s et AAC,
niveaux, et refaire une planche. Ne déclarer « vérifié » que ce qui a été réellement contrôlé.

## CI
`.github/workflows/ci.yml` refait 1, 2 (deux vidéos) et le rapport éditorial à chaque push, en WebGL
logiciel (`REMOTION_GL=swangle`, utilisable aussi en local sans GPU). `main` exige une PR avec `checks` vert.

## Pièges connus
- PowerShell retire le `--` de `npm run x -- --opt` : les scripts lisent aussi `npm_config_<opt>`.
- Disque C: plein : webpack échoue en `ENOSPC` et XTTS/CUDA en « out of memory ». Vérifier l'espace d'abord.
- Un volet de navigateur masqué met l'animation en pause : un éditeur « bloqué » n'est pas forcément un bug.
- Comparer un still PNG et la même image du MP4 : l'écart attendu est ~1/255 (compression seule).
