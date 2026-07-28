---
name: bootstrap-project
description: >
  Adapte ce template générique à un projet réel : scanne la codebase,
  complète CLAUDE.md avec les faits détectés, puis propose des candidats
  skills/subagents spécifiques au projet basés sur des signaux concrets
  (jamais inventés). Utilise ce skill dès que l'utilisateur vient de copier
  ce template sur un nouveau projet, demande "adapte le template à ce
  repo", "onboarde-moi sur ce projet", ou "quelles skills créer pour ce
  repo", même sans mentionner "bootstrap" explicitement.
---

# Bootstrap Project

> Origine : template.

Deux phases, strictement séparées. La phase 1 est fiable et peut tourner
seule. La phase 2 ne fait QUE des propositions — rien n'est créé sans
validation explicite de l'utilisateur.

## Phase 1 — Génération de CLAUDE.md (fiable, automatisable)

1. Lancer `bash .claude/skills/bootstrap-project/scripts/scan_repo.sh` pour
   collecter les signaux sans explorer à l'aveugle (stack, structure, CI,
   docs existantes, historique git)
2. Si un `CLAUDE.md` existe déjà : le lire d'abord et **l'enrichir**, ne
   jamais écraser des instructions déjà présentes. Marquer clairement ce
   qui a été ajouté.
3. Remplir les sections stack/commandes/architecture/conventions à partir
   des faits détectés — pas d'invention. Si un fait n'est pas déductible
   du scan (ex: "pourquoi Postgres"), laisser un placeholder plutôt que
   de deviner.
4. Garder le fichier sous 200 lignes (voir règle dans CLAUDE.md lui-même)
5. Si le projet a déjà des ADR : le scan n'en liste que les **titres**.
   N'ouvrir que ceux dont le titre touche une zone active du travail en
   cours — jamais tous. Et ne pas les résumer dans `CLAUDE.md` : la
   décision qui contraint du code futur devient une **règle path-scopée**
   qui cite l'ADR (voir la skill `writing-adrs`), pas un paragraphe payé à
   chaque session.

Erreurs à éviter (fréquentes) :
- Lister toutes les dépendances au lieu des seules qui influencent la
  façon d'écrire du code
- Décrire des noms de dossiers évidents (`src/` n'a pas besoin d'explication)
- Copier le README au lieu d'ajouter une vraie valeur structurelle

## Phase 2 — Proposition de candidats skills/subagents (jamais automatique)

1. Lire `references/signal-catalog.md` pour la grille de détection et de
   scoring complète — ne pas improviser les critères
2. Analyser les signaux collectés en phase 1 (et au besoin creuser avec
   grep/read ciblés) à la recherche de patterns récurrents et non évidents
3. Classer chaque candidat avec le format défini dans signal-catalog.md
   (nom, preuve, score, type, description)
4. Choisir la bonne destination pour chaque candidat retenu :
   - convention qui ne concerne qu'une zone du repo (`src/api/`, le
     front, les migrations…) → **règle path-scopée** dans
     `.claude/rules/<sujet>.md` avec un frontmatter `paths:`, pas une
     skill. C'est le seul mécanisme qui ne coûte du contexte que si la
     zone est touchée.
   - procédure multi-étapes déclenchée sur demande → skill
   - travail délégable en contexte isolé → subagent
   Ne pas gonfler `CLAUDE.md` avec ce qui rentre dans les deux premiers.
5. Resserrer les `paths:` des règles génériques livrées par le template
   (`tests.md`, `code-quality.md`) sur le vrai layout et la vraie stack —
   leurs globs sont volontairement larges au départ.
6. Présenter la liste triée par score à l'utilisateur — candidats
   skill, candidats règle, candidats subagent, et candidats-refactor (pas
   des skills) dans des sections séparées
7. Pour chaque candidat validé par l'utilisateur : créer le fichier dans
   `.claude/skills/<nom>/SKILL.md`, `.claude/rules/<sujet>.md` ou
   `.claude/agents/<nom>.md` selon le type. **Un seul niveau de dossier
   sous `skills/`** — Claude Code ne découvre que
   `.claude/skills/<nom>/SKILL.md`, une skill imbriquée plus profond est
   silencieusement ignorée.
8. Ajouter la ligne `> Origine : projet.` juste sous le titre du SKILL.md
   créé, pour la distinguer des skills fournies par le template
   (`> Origine : template.`), qui ne doivent jamais être écrasées
9. Ne rien créer pour les candidats non validés

## Ce que ce skill ne fait jamais

- Créer un fichier de skill/agent sans validation explicite
- Modifier une skill marquée `> Origine : template.` — cette zone est un
  contrat commun à tous les projets. Pour la spécialiser, créer une
  nouvelle skill projet à côté.
- Écraser des instructions déjà présentes dans CLAUDE.md
- Proposer une skill sur un pattern vu une seule fois (voir signaux
  faibles dans signal-catalog.md)

## Fichiers de référence

- `references/signal-catalog.md` — grille complète de détection et de
  scoring des candidats, à lire avant la phase 2
- `scripts/scan_repo.sh` — collecte déterministe, à exécuter en phase 1
