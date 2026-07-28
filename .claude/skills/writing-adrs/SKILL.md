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

> Origine : template.

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

## Ce que tu ne fais JAMAIS

- Créer un ADR sans confirmation explicite de l'utilisateur
- Rééditer un ADR existant au lieu d'en créer un nouveau qui le remplace
- Remplir une section par une supposition — demander plutôt que d'inventer
  le "pourquoi" d'une décision passée