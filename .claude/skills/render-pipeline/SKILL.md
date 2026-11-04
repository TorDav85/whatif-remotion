---
name: render-pipeline
description: Produire les MP4 finaux de plusieurs vidéos du catalogue avec la file de rendu (npm run render:queue) - préparation unique, rendus en parallèle, contrôle FFprobe, reprises, protection des livrables et rapport de campagne. Utiliser pour rendre une ou plusieurs vidéos de src/videos/catalog.json, relancer une campagne qui a échoué ou vérifier des sorties ; pas pour publier ni uploader.
---

# File de rendu

`scripts/project/render-queue.mjs`, pour les vidéos de `src/videos/catalog.json` (slugs : `npm run video`).
Les compositions déclarées seulement dans `src/Root.tsx` (épisodes Marc\*, BombeNucleaireVille, AsteroideParis…)
**ne sont pas dans le catalogue** : elles gardent leurs scripts `npm run render:<nom>` ou `npm run rendu`.

## Workflow
1. Vérifier avant de rendre (skill `verification-rendu`) : `npm test`, planche d'images clés.
2. Voir le plan sans rien rendre :
   ```bash
   npm run render:queue -- nature heat --dry-run
   ```
3. Lancer en arrière-plan (un rendu complet prend plusieurs minutes) :
   ```bash
   npm run render:queue -- nature heat
   RENDER_JOBS=2 REMOTION_CONCURRENCY=2 npm run render:queue -- --all
   npm run render:queue -- heat --overwrite        # remplacer un livrable existant, explicitement
   ```
4. Lire le rapport `out/queue-reports/<date>.json` : `counts`, puis pour chaque job `status`
   (`ok`, `skipped`, `failed`), `attempts` (erreur et caractère transitoire), `probe` (flux réels).
5. Relancer seulement ce qui a échoué : `npm run render:queue -- <slugs en échec>` (les `ok` sont déjà là et
   seraient ignorés de toute façon).

## Ce que fait la file
- **Préparation une seule fois** : `node scripts/project/video.mjs prepare` (validation de tous les scénarios,
  `registry.tsx`, ambiances par empreinte) avant tout rendu. Aucun job n'écrit ensuite dans le catalogue, le
  registre ou `.cache/`. Si la préparation échoue, rien n'est rendu.
- **Un bundle** pour toute la campagne (cache `.cache/render-session/`), **un navigateur par essai**.
- `RENDER_JOBS` (1 à 4, défaut 1) vidéos à la fois ; `REMOTION_CONCURRENCY` onglets par vidéo ; `REMOTION_GL`.
  Charge totale ≈ `RENDER_JOBS × REMOTION_CONCURRENCY` onglets WebGL : surveiller la mémoire.
- **Sorties** : chemin `output` du catalogue, obligatoirement sous `out/`. Rendu dans
  `out/.<nom>.partial-<pid>.mp4`, contrôlé, puis mis en place ; un partiel est toujours supprimé.
- **Contrôle** : fichier non vide, puis FFprobe (binaire fourni par Remotion, `npx remotion ffprobe`) :
  piste vidéo, 1080×1920 (taille de la composition), durée vidéo à une image près, piste audio si le
  scénario a `audio.music` ou `audio.voice`.
- **Reprise** : un seul nouvel essai, seulement pour une erreur transitoire (navigateur fermé ou déconnecté,
  délai dépassé, connexion coupée). Une erreur de contrôle ou de projet n'est pas retentée.
- **Livrables** : un fichier existant n'est jamais remplacé sans `--overwrite` (job `skipped`) ; sans l'option,
  la mise en place par lien physique échoue si un fichier est apparu entre-temps.
- **Code de sortie** : 1 si un job a échoué, 2 sans argument ; 0 si tout est `ok` ou `skipped`.

## Garde-fous
- Ne jamais publier ni uploader depuis la file ; l'export de publication reste `npm run export:publication`
  (skill `export-publication`).
- Ne pas lancer deux campagnes en même temps dans le même dossier (préparation et cache communs).
- `video.mjs prepare` réécrit `src/videos/registry.tsx` (contenu identique, fins de ligne LF) : si `git status`
  le montre modifié sans différence de contenu, `git checkout -- src/videos/registry.tsx`.
- Ne pas rendre un MP4 « vérifié » sans avoir lu le rapport : un job `skipped` n'a pas été re-rendu.

## Critères de validation
- [ ] `npm test` vert avant la campagne.
- [ ] Rapport présent, `counts.failed` = 0, code de sortie 0.
- [ ] Chaque job `ok` a une `probe` avec piste vidéo 1080×1920, durée attendue et piste AAC si le scénario a du son.
- [ ] Aucun `out/.*.partial-*.mp4` restant.
- [ ] Planche d'images clés refaite sur au moins un MP4 final (skill `verification-rendu`, étape 5).
