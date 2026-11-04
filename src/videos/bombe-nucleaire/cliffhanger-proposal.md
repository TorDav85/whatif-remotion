# Fin de partie 1 — contrat retenu

Périmètre retenu par root : fin porte/Julien. Conserver les dix prises jusqu'à la radio, ne synthétiser que `freeze` et `julien`. Le script sonore reprend le même rythme que le décor et les gestes. Les variantes ci-dessous restent un historique de proposition ; seul le contrat de ce premier tableau s'applique.

## Contrat précis validé après coordination

Le réalisateur et root ont fixé les coups à **50,5 / 51,2 / 52 s**, le retournement de Marc entre **52 et 55 s**, le mouvement de poignée entre **55,4 et 57,2 s** et la coupe noire à **58,5 s**. Pour ce rythme, la version A ci-dessous se resserre ainsi :

| Créneau vocal | Texte | Action et son associés |
| --- | --- | --- |
| 46,25–49,8 s | « Marc reste à l'abri et écoute les consignes à la radio. » | Prise existante conservée, 3,32 s ; fermeture de porte et radio visibles. |
| 49,8–52,3 s | Silence vocal. | Trois coups distincts, le dernier à 52 s ; Marc réagit au premier. |
| 52,3–54,8 s | « Marc se fige. » | Retournement et regard vers le hublot ; laisser respirer la réaction. |
| 55,3–58,2 s | Voix étouffée : « Marc... c'est Julien. Ouvre-moi. » | Ombre et fragment de chemise bleue. La poignée descend ; Marc suspend sa main avant contact. |
| 58,5–60 s | Aucun texte prononcé. | Noir avant ouverture. Carton unique : **À suivre — Partie 2**. |

**18 mots au total, dont 11 déjà générés.** Deux nouvelles prises séparées. La prise de Julien reçoit un passe-haut 150 Hz, un passe-bas 2 200 Hz et un écho court très léger ; durée et empreinte sont recalculées après traitement. Le bruit des coups ne concurrence pas la voix. L'identité de Julien est donnée par sa réplique ; le carton ne demande donc pas qui est derrière la porte. L'action demeure suspendue pour la partie 2. Aucune règle scientifique sur une interdiction d'ouvrir n'est inventée.

### Audio du contrat réalisé

Les dix WAV jusqu'à la radio ont été conservés avec empreinte et date de modification identiques. `freeze` utilise la seed 74103 : 0,9855 s à partir de 52,3 s. `julien` utilise la seed 75011 : 2,8689 s après filtre de porte, à partir de 55,3 s. Aucune accélération des douze prises.

Transcriptions des WAV finaux : « Marc se fige. » et « Marc, c'est Julien. Ouvre-moi. ». Le journal Whisper conserve les apostrophes et traits d'union séparés ; aucun mot n'est omis. Vérification par transcription, sans prétendre à une écoute. Écart entre répliques : 0,6 LU ; atténuation d'ambiance mesurée : 13,7 dB. Validation ciblée : aucun avertissement. L'ambiance est silencieuse après 58,31 s ; la dernière voix se termine à 58,1689 s.

Journaux locaux : `.cache/bombe-nucleaire/cliffhanger-final-transcriptions.txt` et `cliffhanger-audit.json`. L'aperçu visuel et le mix du MP4 restent à contrôler par root avant livraison.

## Historique A — Julien derrière la porte, première proposition plus bavarde

**Texte, 25 mots :**

> Marc referme la porte. La radio grésille. Trois coups. « Marc... ouvre-moi. » C'est Julien. Marc tend la main. De l'autre côté, la poignée commence à tourner.

La voix « Marc... ouvre-moi. » est une réplique de personnage, plus étouffée que le narrateur. Morpheus peut fournir les deux prises séparées ; aucune nouvelle voix n'est requise. Julien garde son apparence connue : chemise bleue `#3a6fb0`, pantalon sombre, cheveux foncés. L'identité familière rend la fin humaine : le suspense porte sur le geste de Marc et ce qui va entrer, pas sur une question artificielle au public.

| Temps proposé | Action filmable | Son / texte |
| --- | --- | --- |
| 46–49,5 s | Plan rapproché : Marc tire la porte métallique jusqu'au déclic, puis regarde sa radio. | « Marc referme la porte. La radio grésille. » Déclic, bref grésillement localisé. |
| 49,5–52,2 s | La caméra reste dans l'abri. Marc s'immobilise au premier coup. | « Trois coups. » Coups à 50,5 / 51,2 / 52 s ; aucun tapis musical sur ces attaques. |
| 52,2–55,2 s | Marc tourne la tête. Au hublot, un fragment bleu et une ombre humaine ; aucune révélation extérieure complète. | Prise étouffée : « Marc... ouvre-moi. » Puis narrateur : « C'est Julien. Marc tend la main. » |
| 55,2–58,3 s | Insert poignée. La main de Marc s'arrête avant de la saisir ; la poignée commence à descendre depuis l'extérieur. | « De l'autre côté, la poignée commence à tourner. » Léger grincement, respiration, silence. |
| 58,3–60 s | Coupe noire avant ouverture. | Carton unique : **À SUIVRE · PARTIE 2**. Aucun questionnaire ni appel supplémentaire. |

Ce rythme suit la proposition du réalisateur : coups 50,5 / 51,2 / 52 s, noir vers 58,5 s. Le premier contrat de root plaçait les coups vers 52,6 s et le noir à 57 s : dans cette version plus serrée, retirer les deux phrases finales de narration et laisser uniquement la main/poignée raconter l'hésitation. **Ne pas synthétiser les 25 mots dans un créneau trop court.** Root doit figer une des deux durées avec le réalisateur avant génération.

Ne pas ajouter de règle inventée selon laquelle ouvrir condamnerait automatiquement les occupants. La scène montre un choix sous pression ; elle ne donne pas une consigne de refus d'abri. Ne pas placer Julien au point zéro : c'est un témoin de la périphérie, comme Marc.

## Historique B — L'abri commence à céder, variante non retenue

**Texte, 25 mots :**

> Marc éteint la radio. Une poussière tombe du plafond. Il lève les yeux. Au-dessus de lui, le béton se fissure. Puis toutes les lumières s'éteignent.

| Temps proposé | Action filmable | Son / texte |
| --- | --- | --- |
| 46–50 s | Marc baisse le bouton de la radio. Un premier grain de poussière atteint son épaule. | « Marc éteint la radio. Une poussière tombe du plafond. » Fin du grésillement ; petit impact distinct. |
| 50–53 s | Gros plan du visage, regard vers le haut ; montée de caméra suivant son regard. | « Il lève les yeux. » Un craquement sec au-dessus, pas une nouvelle explosion. |
| 53–57,5 s | Insert d'une fissure qui progresse dans un joint de plafond ; une lampe oscille, puis s'éteint. | « Au-dessus de lui, le béton se fissure. Puis toutes les lumières s'éteignent. » Craquement, tintement bref, coupure sonore. |
| 57,5–60 s | Noir avant de montrer ce qui tombe. | **À SUIVRE · PARTIE 2**. Une respiration persiste un instant. |

Variante autonome, sans deuxième personnage. Elle fait basculer l'abri rassurant vers une menace concrète et lance la partie 2 : Marc doit trouver une autre issue. La fissure est un événement de fiction, sans prédiction de tenue du béton ni nouvelle affirmation sur les retombées. La poussière reste grise, sans effet de rayonnement visible.

## Ce qui a rendu la première fin trop générique

Le découpage initial énumérait des effets physiques, puis concluait par une maxime et « Quel détail t'a surpris ? ». Marc traversait l'explication sans objectif personnel à résoudre. « Intérieur sobre, Marc et radio » ne prescrivait ni geste, ni obstacle, ni son révélateur ; des agents pouvaient donc livrer chacun un élément correct sans construire une scène dramatique commune. Les tests validaient le montage et le son, pas la promesse de récit.

Pour le nouveau brief, chaque plan doit imposer un **geste visible, un obstacle et un événement sonore**. Exemple : « À 52 s, Marc lâche le bouton radio au troisième coup ; à 55 s sa main s'arrête à quelques centimètres de la poignée qui descend ; coupe avant ouverture. » Le détail de ville doit également être vérifiable dans le cadre : enseigne et vitrine de boulangerie, balcon et volets distincts, bus coincé au carrefour, débris venant de la façade effectivement montrée. Une simple mention « ville détaillée » ne suffit pas à guider les assets.

Accord commun à obtenir entre root et réalisateur avant synthèse : option A ou B, secondes exactes des coups/craquements, instant du dernier geste, contenu du carton, prise de voix isolée. Ensuite, produire un aperçu du passage final et une planche de la ville détaillée ; vérifier l'action et la lisibilité avant le nouveau rendu complet. Le texte 0–46 s peut rester intact : l'amélioration prioritaire est ce que le spectateur voit et ce que Marc tente de faire.
