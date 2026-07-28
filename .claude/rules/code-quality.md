---
paths:
  - "**/*.{js,jsx,ts,tsx,mjs,cjs,py,go,rs,rb,java,kt,php,cs,swift,sh}"
---

# Qualité et outillage

Règle chargée uniquement quand un fichier source est lu ou écrit.
Restreindre les extensions à la stack réelle du projet au bootstrap —
garder une liste large coûte du contexte pour rien.

- Lancer le formateur/linter du projet après une modification, avant de
  conclure. Les commandes exactes sont dans la section « Commandes » de
  `CLAUDE.md`.
- Ne pas désactiver une règle de lint en ligne (`eslint-disable`,
  `# noqa`, `#[allow(...)]`) sans commentaire disant pourquoi. Sans
  justification, corriger le code plutôt que faire taire l'outil.
- Ne pas reformater du code non lié à la tâche. Un diff qui mélange
  reformatage et logique est irrelisable en revue.
- Suivre le style du fichier courant même si tu ferais autrement.
  L'incohérence coûte plus cher que le style « optimal ».
- Ne pas laisser de code mort, d'import inutilisé ou de `console.log` /
  `print` de debug introduits par tes propres changements. Le code mort
  préexistant se signale, ne se supprime pas d'office.
- Une erreur ne se rattrape que si on sait quoi en faire. Pas de
  `catch` vide ni d'exception avalée pour « faire passer ».
