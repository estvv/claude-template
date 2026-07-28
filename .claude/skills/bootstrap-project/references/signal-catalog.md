# Catalogue de signaux — candidats skills/subagents

Une skill n'a de valeur que si elle encode une connaissance que Claude ne
peut PAS déduire en lisant le code une fois. On cherche donc des signaux
de **récurrence + non-évidence**, jamais un seul des deux.

## Signaux forts (prioriser)

- **Pattern répété ≥3 fois** avec variations légères entre occurrences
  → preuve que ce n'est pas automatisé, donc source d'incohérence/bugs.
  Ex: chaque route API a un wrapper try/catch légèrement différent.
- **Lib/SDK interne ou peu connue** utilisée avec des patterns d'appel non
  standards — Claude ne la connaît pas depuis son entraînement.
- **Fixtures partagées sous-utilisées** : certains tests les réinventent
  au lieu de les réutiliser → convention existante mais non documentée.
- **Procédure manuelle multi-étapes documentée en prose** dans
  README/CONTRIBUTING/docs (release, migration, déploiement) jamais
  captée en skill exécutable.
- **Commits récurrents de type "fix: forgot to..."** sur la même
  catégorie d'erreur (via git log) → la skill peut coder la règle qui
  manque pour ne plus refaire cette erreur.
- **Étapes CI précises** (ordre de commandes, variables d'env) non
  déductibles du code applicatif seul.

## Signaux faibles à ignorer explicitement

- Usage normal d'une lib ultra-standard (ex: Express basique, React basique)
- Connaissance générale du langage/framework — Claude la possède déjà
- Un pattern vu une seule fois — pas encore une convention, juste un choix
  ponctuel

## Classer le candidat : règle, skill ou refactor

Une incohérence détectée n'est pas automatiquement un candidat-skill.
Trois issues possibles, à proposer dans des sections séparées :

- **Candidat-règle** : convention à respecter en permanence, mais
  seulement sur une zone du repo → `.claude/rules/<sujet>.md` avec
  `paths:`. C'est le défaut pour tout ce qui est de la forme « dans
  `src/api/`, toujours… ». Ne coûte du contexte que si la zone est
  touchée. Sans `paths:`, la règle est chargée à chaque session : à
  réserver à ce qui s'applique vraiment partout.
- **Candidat-skill** : procédure multi-étapes déclenchée sur demande
  (release, migration, génération) → capturer le workflow, pas la
  convention.
- **Candidat-refactor** : le pattern révèle une vraie dette/incohérence
  → le signaler comme problème à corriger, PAS comme skill à créer
  (créer une skill qui documente un mauvais pattern le fige au lieu de
  le corriger)

Test rapide : « faut-il y penser à chaque fois qu'on touche ces
fichiers ? » → règle. « Est-ce qu'on lance ça de temps en temps ? » →
skill.

## Grille de scoring pour classer les candidats

Pour chaque candidat, estimer sur 1-3 :

| Critère | 1 | 2 | 3 |
|---|---|---|---|
| Récurrence | vu 2 fois | vu 3-5 fois | vu 6+ fois / partout |
| Non-évidence | déductible en lisant 1 fichier | déductible en lisant plusieurs fichiers | invisible sans connaître l'historique/contexte |
| Coût d'un oubli | mineur (style) | correction facile mais répétée | bug/incident potentiel |

Score total ≥ 7 → proposer en priorité. Score 4-6 → mentionner mais en
second rang. Score < 4 → ne pas proposer, trop faible.

## Format de présentation à l'utilisateur

Pour chaque candidat retenu :
1. Nom proposé (gérondif, ex: `handling-payment-retries`)
2. Preuve concrète : fichiers/lignes, nombre d'occurrences
3. Score (voir grille ci-dessus)
4. Type : skill / subagent / candidat-refactor (pas une skill)
5. Une phrase de description au format "quoi + quand" (prête à devenir le
   champ `description` du futur SKILL.md)

Ne JAMAIS créer le fichier SKILL.md ou l'agent tant que l'utilisateur n'a
pas validé explicitement le candidat.