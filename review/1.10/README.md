# Review 1.10 — vidéos et vérifications

Les MP4 de `videos/` sont stockés avec Git LFS (`git lfs pull` pour les récupérer).
Les planches d'images clés sont dans `planches/` (temps en jaune sur chaque image).

## Mesures des MP4

Mesurées avec ffmpeg (`volumedetect`) sur les fichiers de `videos/`.

| Vidéo | Durée | Format | Taille | Volume moyen | Crête |
| --- | --- | --- | --- | --- | --- |
| marc-deux-lunes-84s | 1:24.0 | 1080×1920, 30 i/s | 57,7 Mo | −21,5 dB | −1,7 dB |
| marc-congel-85s | 1:25.0 | 1080×1920, 30 i/s | 50,0 Mo | −22,3 dB | −4,0 dB |
| marc-four-84s | 1:24.0 | 1080×1920, 30 i/s | 63,3 Mo | −21,7 dB | −2,9 dB |
| marc-salaire-79s | 1:19.0 | 1080×1920, 30 i/s | 38,5 Mo | −20,1 dB | −1,2 dB |
| marc-salaire-2-79s | 1:19.0 | 1080×1920, 30 i/s | 40,9 Mo | −20,8 dB | −1,4 dB |
| marc-salaire-3-79s | 1:19.0 | 1080×1920, 30 i/s | 54,1 Mo | −19,8 dB | −2,3 dB |
| marc-soif-81s | 1:21.0 | 1080×1920, 30 i/s | 44,5 Mo | −20,8 dB | −2,1 dB |
| marc-geant-2.01 | 1:23.0 | 1080×1920, 30 i/s | 52,6 Mo | −20,6 dB | −1,4 dB |
| marc-mini-2.01 | 1:25.0 | 1080×1920, 30 i/s | 42,4 Mo | −20,5 dB | −2,0 dB |
| asteroide-paris-2.01 | 0:40.0 | 1080×1920, 30 i/s | 30,9 Mo | −22,6 dB | −4,1 dB |
| audio-first-bridge-2.01 | 0:11.3 | 1080×1920, 30 i/s | 2,1 Mo | −21,0 dB | −3,4 dB |

## Nouvelle vidéo : MarcDeuxLunes

« Et si Marc voyait une deuxième lune apparaître dans le ciel ? » — composition `MarcDeuxLunes`,
sources dans `src/videos/marc-deux-lunes/`, voix et ambiance par `scripts/audio/marc-deux-lunes.py`.

```bash
npm run voice:marc-deux-lunes
npm run render:marc-deux-lunes
```

### Déroulé

| Temps | Plan | Ce qu'on montre |
| --- | --- | --- |
| 0–5 s | Rue de nuit, derrière Marc | Accroche ; la deuxième lune s'allume à 2,4 s |
| 5–15 s | Rue | Marc sort les poubelles, voit deux lunes ; Julien sceptique |
| 15–21 s | Espace | Même taille, même distance : 384 400 km (règle jaune) |
| 21–32 s | Rue | Nuit deux fois plus claire (journal) ; chiens qui hurlent |
| 32–40 s | Saint-Malo | Marée de 0 à 26 m (ligne jaune : 13 m la veille), débordement des remparts |
| 40–47 s | Rue de jour | Deux éclipses de Soleil (41,4 s et 44,2 s) |
| 47–60 s | Espace | Les lunes se rapprochent (écart en km), collision à 56,6 s |
| 60–67 s | Espace puis rue | Les débris forment des anneaux |
| 67–79 s | Rue | Julien lève les yeux ; appel à s'abonner |
| 79–84 s | Carte de fin | « Deux lunes ou des anneaux ? » |

### Vérifications faites

- **Tests** : `npm test` (typage, tests caméra/ville, tests projet, validation des scénarios) passe ;
  4 avertissements « verify » préexistants (nature, nature-v2, gravity, whatif). MarcDeuxLunes n'est
  pas couverte par `validate` (hors catalogue).
- **Cadrage** : trois passes de planches (`npm run stills`). Corrections faites après relecture :
  Marc caché par la poubelle, lune masquée par les façades, caméra sous l'eau à Saint-Malo,
  anneau du ciel de nuit dans le mauvais sens (derrière la caméra), Terre sous les sous-titres.
  Planche finale : `planches/marc-deux-lunes.png`.
- **Voix** (XTTS v2, profil `morpheus`, GPU) : les 13 répliques tiennent dans leurs créneaux
  (accélération maximale ×1,02, limite ×1,3).
- **Transcription** (faster-whisper `small`) de chaque réplique. Trois répliques douteuses ont été
  régénérées : cinq prises chacune, transcrites, la meilleure retenue (seeds dans `narration.json`) :
  - `eclipse` : « écripses » → seed 26101, transcrit « Deux éclipses le même jour » ;
  - `punch` : « trop de but » → seed 26101, transcrit « Marc n'avait pas trop bu » ;
  - `light` : « sans lampe » perdait sa fin sur toutes les prises → texte changé en
    « sans lumière », seed 26202.
- **MP4 final** : 84,0 s, H.264 1080×1920 30 i/s, AAC stéréo 48 kHz, −21,5 dB moyen, crête −1,7 dB.

### Restes connus

- Transcription automatique seulement : les prises n'ont pas été écoutées par un humain.
  Whisper comprend encore « deux lunes » comme « de l'une » dans `pull` et `cta` (liaison).
- Scénario fictif (mention à l'écran) : deux lunes sur la même orbite ne seraient pas stables ;
  la marée de 26 m double les ~13 m de vive-eau de Saint-Malo.
