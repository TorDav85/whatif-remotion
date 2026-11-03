---
name: whatif-ghostwriter
description: Écrire ou retravailler en français les narrations de vidéos « Et si… ? » de ce projet Remotion, avec une voix naturelle, une progression visuelle et des répliques compatibles avec les créneaux TTS. Utiliser pour les hooks, voix off, dialogues et fins ; pas pour modifier seul les calculs ou les assets 3D.
---

# Ghostwriter des vidéos What if

Partir du dossier vidéo choisi et de son récit existant. Lire son `narration.json`,
son `timing.json` et ses plans dans `Scene3D.tsx` quand ils existent. Les anciennes
bases utilisent `scenario.json`, `nature.json` ou `timeline.json` : identifier leur
schéma avant d'écrire. Le catalogue `src/videos/catalog.json` ne contient pas
nécessairement toutes les compositions ; vérifier aussi `src/Root.tsx`.

## Écrire pour la voix et l'image

- Reprendre le ton fourni par l'utilisateur ou déduire celui du script. Français
  oral, phrases prononçables, mots concrets ; éviter le ton de bande-annonce imposé,
  les superlatifs automatiques et les « imagine un monde où » répétés.
- Ouvrir sur la règle du scénario et sa première conséquence visible. La promesse
  du hook doit être montrée ou résolue dans la vidéo.
- Chaque beat apporte une action, une conséquence ou un changement d'échelle.
  Relier la cause à son effet. Décrire ce que le spectateur peut comprendre dans
  le plan ; signaler le besoin d'un plan absent au lieu de le supposer réalisé.
- Pour un personnage récurrent, lire `src/shared/characters/` et les scènes qui
  l'utilisent avant d'inventer une nouvelle personnalité ou un nouvel aspect.
- Garder la chute dans le sujet. Ajouter un appel à commenter uniquement si le
  format ou la demande s'y prête, avec une question liée au dilemme montré.

## Respecter la durée et la physique

Conserver les ids, l'ordre, les créneaux et les références de pistes lors d'une
retouche de texte, sauf demande de remontage. Évaluer d'abord la longueur à voix
haute ; environ 2 à 2,6 mots/seconde est un repère, pas une garantie de durée TTS.
Laisser respirer les nombres et la ponctuation. Raccourcir un texte trop dense
avant de demander une accélération audio. Vérifier les règles propres au script
audio de la vidéo : toutes les bases n'ont pas la même limite de vitesse.

Ne pas modifier un fichier `voice.json`, des timings compilés ou des WAV pour
masquer une incompatibilité. Un changement de narration exige de régénérer les
pistes concernées par la commande existante et d'en contrôler la durée ; sans
génération, indiquer que l'audio reste à synchroniser.

Recalculer les valeurs depuis le modèle du projet et garder les unités explicites.
Distinguer la règle fictive d'une conséquence physique démontrée. Vérifier les
affirmations scientifiques externes avec des sources primaires si nécessaire ;
ne pas transformer un ordre de grandeur en événement certain. Conserver les
marqueurs `verify` tant que la vérification n'est pas faite.

## Livrer une retouche utilisable

Modifier le fichier source demandé, sans réécrire les autres vidéos. Pour un
nouveau concept sans destination définie, livrer le texte et ses intentions de
plans avant de choisir une architecture vidéo. Pour les anciennes bases compatibles,
`npm run video -- voice-plan <slug>` permet de contrôler les créneaux sans synthèse.
Après édition du JSON, vérifier sa lecture et lancer `npm run validate` s'il couvre
cette vidéo. Ne prétendre avoir écouté ou régénéré une voix que si cela a été fait.
