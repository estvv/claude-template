---
name: writing-adrs
description: >
  Rédige un ADR (Architecture Decision Record) dans docs/adr/ à partir du
  template docs/adr/0000-template.md, quand une décision d'architecture
  structurante vient d'être prise ou discutée (choix de techno, changement
  de découpage de services, abandon d'une option). Utilise cette skill
  PROACTIVEMENT dès qu'une conversation aboutit à un choix technique
  engageant, même si l'utilisateur ne demande pas explicitement un ADR —
  ne propose jamais de créer l'ADR sans confirmer d'abord avec lui.
---

# Writing ADRs

## Quand déclencher

- Une discussion vient d'aboutir à un choix technique engageant (techno,
  librairie majeure, découpage de service, abandon d'une alternative)
- L'utilisateur dit explicitement "note cette décision" / "fais un ADR"
- Un `CLAUDE.md` ou une conversation mentionne une contrainte non triviale
  ("on a décidé de ne jamais...") sans qu'elle soit tracée quelque part

## Ce qu'un ADR n'est PAS

- Pas un compte-rendu de réunion
- Pas une doc d'architecture générale (voir la discussion : ARCHITECTURE.md
  a été volontairement écarté de ce template, trop périssable)
- Pas réédité après coup — s'il devient obsolète, un nouvel ADR le
  remplace, on ne réécrit pas l'historique

## Workflow

1. Vérifier le numéro suivant dans `docs/adr/` (`000N-`)
2. Copier `docs/adr/0000-template.md` vers `docs/adr/000N-titre-court.md`
3. Remplir uniquement Contexte / Décision / Alternatives / Conséquences —
   ne pas laisser de section vide, marquer "non applicable" si besoin
4. Statut initial : "Proposé" si la décision n'est pas encore actée,
   "Accepté" si elle l'est
5. **Confirmer avec l'utilisateur avant de créer le fichier** — un ADR mal
   formulé qui traîne dans le repo est pire qu'un ADR absent
6. Une fois l'ADR créé, appliquer l'étape ci-dessous : un ADR seul est une
   archive que personne ne relira au bon moment.

## Produire la contrainte, pas seulement l'archive

Un ADR répond à « pourquoi ». Il n'est jamais chargé automatiquement — donc
un agent qui écrira du code dans six mois ne le verra pas. Si la décision
**contraint du code futur sur une zone identifiable du repo**, elle doit
aussi produire une ligne active :

1. Identifier la zone concernée (`src/api/`, les migrations, le front…).
   Si la décision ne contraint aucune zone précise (choix d'outillage,
   décision organisationnelle), s'arrêter là : l'ADR suffit.
2. Créer ou compléter `.claude/rules/<zone>.md` avec un `paths:` ciblé.
3. Y écrire **une ou deux lignes impératives** qui référencent l'ADR :

```markdown
---
paths: ["src/api/**/*.ts"]
---
- Toute réponse d'endpoint passe par `wrapResponse()`, cf. ADR-0007.
```

La règle porte le *quoi faire*, l'ADR porte le *pourquoi*. Un agent qui
touche `src/api/` reçoit la contrainte sans ouvrir un seul ADR ; il n'ouvre
le 0007 que s'il doit la contester.

## Ce que tu ne fais JAMAIS

- Créer un ADR sans confirmation explicite de l'utilisateur
- Rééditer un ADR existant au lieu d'en créer un nouveau qui le remplace
- Remplir une section par une supposition — demander plutôt que d'inventer
  le "pourquoi" d'une décision passée
- **Recopier le contenu de l'ADR dans la règle.** Les deux divergeraient, et
  ça ferait payer l'archive à chaque session — exactement ce que la
  séparation évite. La règle cite l'ADR, elle ne le résume pas.
- Ajouter un index des ADR dans `CLAUDE.md` : le coût chargé à chaque
  session doit rester constant quel que soit le nombre d'ADR. `ls docs/adr/`
  suffit quand la question se pose.