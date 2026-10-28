# Améliorations à effectuer — feuille de route

Audit du dépôt `whatif-remotion` réalisé le 28/10/2026 (revue statique, sans exécution
locale). Ce document compare toutes les versions et liste les améliorations restantes,
par ordre de priorité, avec pour chacune un critère de vérification.

## 1. État des versions

| Branche | Commit | Contenu | Verdict |
| --- | --- | --- | --- |
| `main` | `0f8cb9b` | Structure initiale : 3 vidéos (trou noir, nature, chaleur), scripts Piper | Référence historique, structure dépassée |
| `1.01` | `063acae` | Ajoute Nature V2, Gravité, bibliothèque d'objets extérieurs + 42 objets d'intérieur | Réservoir de fonctionnalités, absorbé par 1.02 |
| `1.02` | `9b47c25` | Réorganisation `src/videos/`, catalogue, copie de bases, XTTS multi-profils, 24 objets ville | Meilleure base — sert de fondation à 1.03-test2 |
| `1.03-test1` | `0f8cb9b` | Identique à `main` (même commit) | Branche trompeuse : ne contient aucune évolution |
| `1.03-test2` | `1.02` + correctifs | 1.02 consolidée par l'audit + ce document | Version à faire vivre et à valider en local |

Décision retenue : repartir de `1.02` plutôt que de `main`/`1.03-test1`, car elle seule
apporte le catalogue, la séparation `videos/` / `assets/` / `core/` / `shared/` et la
chaîne vocale par profils. `main` ne doit être mis à jour qu'après validation locale.

## 2. Déjà corrigé dans 1.03-test2

- Validation des scénarios avant rendu (`npm run validate`, automatique avant `still`/`render`/`prepare`).
- Cache d'ambiance par empreinte SHA-1 : un scénario modifié régénère son WAV.
- Échec explicite sur scène inconnue dans `WhatIf.tsx` (plus de filtrage silencieux).
- `sampleNum` générique : suppression du `as any`.

## 3. P0 — À faire en premier (validation locale)

1. Cloner la branche `1.03-test2` dans un dossier neuf, puis :
   `npm ci`, `npm run validate`, `npm run typecheck`, `npm run test:project`.
   Vérification : les quatre commandes passent sans fichiers locaux préexistants.
2. `npm run video -- still whatif` puis `npm run video -- still heat`.
   Vérification : images conformes aux rendus précédents (aucun changement visuel attendu).
3. Décider du sort de `1.03-test1` (suppression ou renommage) : elle pointe sur `main`
   alors que son nom suggère la version la plus récente.
   Vérification : `git branch -a` ne laisse aucune ambiguïté sur la branche de travail.

## 4. P1 — Robustesse du code

4. Extraire les dépendances croisées entre vidéos : kit de `heat`, tour Eiffel de
   `paris-v2`, contours géographiques de `paris-v3` → vers `src/assets/` ou `src/shared/`.
   Vérification : `npm run video -- copy <slug> test-x` suivi d'un `still` réussi,
   sans import pointant vers le dossier d'une autre vidéo.
5. Unifier les commandes historiques (`render:v3`, `still:nature2`…) en alias de
   `scripts/project/video.mjs`, afin qu'elles profitent du cache par empreinte.
   Vérification : modifier un scénario puis lancer une ancienne commande régénère l'ambiance.
6. Étendre le validateur : présence des WAV vocaux quand `audio.voice` est actif,
   et durée de chaque piste par rapport à son créneau.
   Vérification : activer la voix sans pistes générées produit une erreur claire.
7. Test de reproductibilité : rendre deux fois la même frame de chaque composition et
   comparer les images.
   Vérification : images identiques à l'octet près dans le même environnement.

## 5. P2 — Contenu et voix

8. Vérifier avec sources les affirmations `"verify": true` avant publication :
   plomb à 300 °C dans un beat alors que sa fusion est à 327 °C ; record de 56,7 °C
   (Death Valley, contesté) ; acier à 550 °C ; « 1/10 du Soleil » ; « ≈ 70 jours » ;
   « New York est un second soleil » ; colonne d'air ≈ 14 km ; réseau électrique ≈ 48 h ;
   toits ≈ 50 ans ; pont ≈ 100 ans ; sommet de la tour ≈ 300 ans.
   Vérification : chaque affirmation porte une source ou est reformulée en ordre de grandeur.
9. Tester la narration sur les dix bases : `npm run video -- voice-plan <slug>` pour
   chacune, puis écoute des phrases accélérées (limite 2×).
   Vérification : aucune phrase ne dépasse son créneau ; les reformulations privilégient
   le raccourcissement à l'accélération.
10. Licence XTTS : confirmer les conditions (CPML, usage non commercial ou licence
    commerciale) avant toute publication monétisée, et documenter le consentement des
    voix clonées (profils conservés hors Git).

## 6. P3 — Performance et design

11. Mesurer avant d'optimiser : temps de rendu d'un extrait fixe, mémoire maximale,
    par composition, et consigner les résultats.
    Vérification : tableau avant/après pour chaque optimisation ; aucune optimisation sans mesure.
12. Revue visuelle sur captures à taille mobile : lisibilité des sous-titres, concurrence
    HUD/sujet, continuité des caméras, intensité des flashs.
    Vérification : captures relues vidéo par vidéo ; corriger une vidéo pilote puis généraliser.

## 7. P4 — Automatisation

13. Intégration continue (GitHub Actions) : `npm ci` → `validate` → `typecheck` →
    `test:project` → stills des compositions, sur chaque poussée.
    Vérification : une modification invalide est bloquée avant fusion.
14. Protéger `main` : fusion uniquement par pull request après passage des contrôles,
    puis publier `1.03-test2` (ou sa successeure) comme nouvelle `main` quand P0 est validé.

## 8. Ordre recommandé

P0 (validation locale) → P1.4 (dépendances) → P1.6 (voix) → P2.8 (contenu) → P3/P4.
Ne pas créer de nouvelle variante graphique avant la fin du P0 : chaque nouvelle base
copie l'état du code, défauts compris.
