---
name: verification-faits
description: Vérifier et sourcer les affirmations chiffrées ou scientifiques d'une vidéo « Et si… ? » (tailles, températures, durées, énergies, conséquences physiques) - calcul depuis le modèle du projet, source primaire ou ordre de grandeur assumé, champ source dans le scénario. Utiliser avant publication, quand npm run validate signale « verify », quand npm run editorial liste des chiffres sans source, ou quand l'utilisateur doute d'un chiffre.
---

# Vérification des faits

## Où sont les affirmations
- Scénarios Marc : `src/videos/<slug>/narration.json` (champ `source` par réplique).
- Anciennes bases : `scenario.json`, `nature.json`, `timeline.json`, `gravity.json`
  (`"verify": true` = à contrôler ; `npm run validate` les compte).
- `npm run editorial` liste les répliques chiffrées sans `source`.

## Trois façons de justifier, par ordre de préférence
1. **Calcul depuis la règle du scénario** (le plus solide, car c'est la fiction qui fixe la règle) :
   écrire le calcul avec unités. Ex. `1,80 m × 2⁵ = 57,6 m` ; tempêtes, marées, énergies : poser la formule.
2. **Physique ou chiffre de référence**, avec la source primaire ou un manuel :
   ex. luminosité d'Eddington `L = 1,26×10³¹ W × (M/M☉)` → Terre `3,8×10²⁵ W ≈ 0,1 L☉` ;
   énergie de liaison de la Terre `2,24×10³² J` → `÷ L ≈ 68 jours`.
3. **Ordre de grandeur** quand les sources divergent : le dire dans la source
   (« d'après Weisman, *The World Without Us*, 2007 ; durées réelles très variables ») et éviter une
   précision trompeuse à l'écran.

Recherche : WebSearch puis lecture de la page d'origine (WebFetch) ; se méfier des pages générées
ou des blogs qui citent sans référence. Ne jamais inventer une source ni un chiffre.

## Écrire le résultat
- Remplacer `"verify": true` par `"source": "…"` (calcul ou référence), ou reformuler le texte s'il
  n'est pas défendable (« quelques mois » plutôt que « 70 jours »).
- Changer un texte **dit par la voix** impose de régénérer la réplique (skill `voix-xtts`) ; changer
  seulement `source` ne touche pas l'audio.
- Garder la mention « Scénario fictif » à l'écran quand la prémisse est impossible, et distinguer
  la règle inventée de ses conséquences calculées.
- Contrôle : `npm run validate` (0 avertissement « verify »), `npm run editorial`.
