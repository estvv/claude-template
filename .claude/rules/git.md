# Git

Règle chargée à chaque session (pas de `paths`) : elle s'applique quel que
soit le fichier touché.

- Ne jamais commiter ni pousser sans demande explicite. Terminer une tâche
  ≠ la commiter.
- Ne jamais commiter directement sur la branche par défaut : créer une
  branche d'abord.
- Pas de `push --force` ni de réécriture d'historique déjà poussé
  (`rebase`, `commit --amend`) sans validation explicite.
- Ne pas ajouter au commit des fichiers sans rapport avec la tâche.
  Vérifier `git status` avant `git add`, ne pas faire `git add -A` à
  l'aveugle.
- Un message de commit dit **pourquoi**, pas **quoi** — le diff dit déjà
  quoi.
- Ne jamais commiter de secret, `.env`, dump de base ou credential. En cas
  de doute sur un fichier, demander.
