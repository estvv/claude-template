---
paths:
  - "**/*.{test,spec}.{js,jsx,ts,tsx,mjs,cjs}"
  - "**/test_*.py"
  - "**/*_test.{py,go,rb}"
  - "**/{test,tests,spec,__tests__}/**"
---

# Tests

Règle chargée uniquement quand un fichier de test est lu ou écrit.
Les globs ci-dessus sont larges à dessein — les restreindre au vrai
layout du projet au moment du bootstrap.

- Ne jamais modifier le code de production pour faire passer un test.
  Si le test échoue, soit le test a tort, soit le code a un bug : trancher
  explicitement, ne pas contourner.
- Un test qui passe quoi qu'il arrive est pire que pas de test :
  assertion vide, mock qui simule le comportement testé, `try/catch` qui
  avale l'échec.
- Chercher les fixtures/helpers existants avant d'en créer. Une fixture
  dupliquée diverge tôt ou tard de l'originale.
- Fixer le temps et l'aléatoire (dates, UUID, seed) — sinon le test
  devient flaky et sera désactivé par quelqu'un dans six mois.
- Un test de non-régression doit d'abord échouer sur le code buggé.
  Écrire le test, le voir rouge, puis corriger.
- Exécuter les tests avant de conclure. Ne jamais annoncer qu'ils passent
  sans les avoir lancés ; s'ils échouent, le dire avec la sortie.
