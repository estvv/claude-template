# <Nom du projet>

<Une à deux phrases : ce que fait ce projet et pour qui. Remplacé au
bootstrap — voir la skill `bootstrap-project`.>

## Stack

<Uniquement les technos qui changent la façon d'écrire du code ici. Pas la
liste des dépendances.>

## Commandes

| Quoi | Commande |
|---|---|
| Installer | `<...>` |
| Lancer en dev | `<...>` |
| Tester | `<...>` |
| Tester un seul fichier | `<...>` |
| Linter / formater | `<...>` |
| Build | `<...>` |

## Architecture

<Le découpage non évident : ce qu'un nouveau venu ne devinerait pas en
listant les dossiers. Ne pas décrire `src/`.>

## Conventions

<Les règles réellement appliquées dans ce repo, pas les bonnes pratiques
génériques. Ex : « toute route API renvoie via `wrapResponse()` ».>

## Zones sensibles

<Fichiers/dossiers à ne pas modifier sans validation explicite, et
pourquoi. Laisser vide si aucune.>

---

# Règles de travail (fournies par le template)

Ces règles s'appliquent à tous les projets issus de ce template. Les
sections au-dessus sont, elles, spécifiques à ce projet.

## Budget de ce fichier

Garder `CLAUDE.md` **sous 200 lignes**. Ce fichier est lu en entier à
chaque session : tout ce qui n'est pas systématiquement utile coûte du
contexte à chaque tour. Trois destinations selon le cas :

| Le contenu… | va dans |
|---|---|
| s'applique à chaque session | `CLAUDE.md` |
| ne concerne que certains fichiers | `.claude/rules/` avec `paths:` |
| ne sert que sur demande / procédure | `.claude/skills/<nom>/SKILL.md` |

Les imports `@fichier.md` **ne réduisent pas** le contexte : le fichier
importé est chargé au lancement comme le reste. Seul `paths:` dans
`.claude/rules/` évite réellement le coût.

## Règles path-scopées

`.claude/rules/*.md` porte les règles qui ne concernent qu'une partie du
repo. Le frontmatter `paths:` les charge uniquement quand Claude lit un
fichier correspondant :

```markdown
---
paths: ["src/api/**/*.ts"]
---
```

Une règle **sans** `paths:` est chargée à chaque session — même coût que
`CLAUDE.md`, donc à réserver à ce qui s'applique partout (voir `git.md`).
Tous les `.md` du dossier sont découverts récursivement : ne pas y déposer
de fichier de documentation, il serait chargé comme une règle.

## Décisions d'architecture : archive et contrainte

Une décision engageante produit **deux choses distinctes**, jamais une
seule :

| | Contenu | Où | Chargement |
|---|---|---|---|
| Archive | pourquoi, alternatives écartées, conséquences | `docs/adr/000N-*.md` | jamais automatique |
| Contrainte | ce qu'il faut faire, 1-2 lignes | `.claude/rules/<zone>.md` | si la zone est touchée |

La contrainte référence l'ADR (« …, cf. ADR-0007 ») sans en recopier le
contenu. Dupliquer les fait diverger et fait payer l'archive à chaque
session.

**Ne jamais lire les ADR en masse.** Ils ne sont pas chargés
automatiquement, et c'est voulu : sur un projet mûr ils pèsent des
milliers de tokens pour des décisions rarement pertinentes. Pour répondre
à un « pourquoi c'est fait comme ça », faire `ls docs/adr/` — les noms de
fichiers sont descriptifs — et n'ouvrir que celui qui répond à la
question. Y regarder **avant** de relire du code pour reconstituer une
intention.

Un ADR s'écrit une fois et ne se réédite pas : s'il devient obsolète, un
nouvel ADR le remplace. Voir la skill `writing-adrs`.

## Skills et sous-agents

- Les skills vivent dans `.claude/skills/<nom>/SKILL.md`, **un seul niveau
  de dossier**. Une skill imbriquée plus profond est silencieusement
  ignorée par Claude Code.
- Une skill marquée `> Origine : template.` est un contrat commun à tous
  les projets : ne pas la modifier. Pour la spécialiser, créer une skill
  projet à côté, marquée `> Origine : projet.`
- Ne pas créer de skill sur un pattern vu une seule fois. Les critères sont
  dans `.claude/skills/bootstrap-project/references/signal-catalog.md`.

## Délégation

- `explorer` — pour toute question qui exigerait de lire beaucoup de
  fichiers pour une réponse courte. Préserve le contexte principal.
- `code-reviewer` — après toute modification non triviale, avant commit.
- `test-writer` — pour tester du code déjà stable, pas en cours de design.
