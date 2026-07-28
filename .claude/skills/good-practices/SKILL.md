---
name: good-practices
description: >
  Garde-fous comportementaux pour réduire les erreurs classiques de LLM en
  codant : sur-ingénierie, modifications collatérales, hypothèses tues,
  critères de succès flous. Utilise cette skill quand tu écris, revois ou
  refactorises du code non trivial, et en particulier avant de te lancer
  sur une tâche dont le périmètre n'est pas encore net.
license: MIT
---

# Good practices

Garde-fous sur les erreurs récurrentes des LLM qui codent.

**Compromis assumé :** ces règles privilégient la prudence sur la vitesse.
Pour une tâche triviale, garde ton jugement.

## 1. Réfléchir avant de coder

**Ne pas supposer. Ne pas masquer une confusion. Exposer les compromis.**

Avant d'implémenter :

- Énoncer explicitement ses hypothèses. En cas de doute, demander.
- Si plusieurs interprétations existent, les présenter — ne pas en choisir
  une silencieusement.
- Si une approche plus simple existe, le dire. Objecter quand c'est justifié.
- Si quelque chose n'est pas clair, s'arrêter. Nommer ce qui bloque. Demander.

## 2. La simplicité d'abord

**Le minimum de code qui résout le problème. Rien de spéculatif.**

- Aucune fonctionnalité au-delà de ce qui a été demandé.
- Aucune abstraction pour du code utilisé une seule fois.
- Aucune « flexibilité » ou « configurabilité » non demandée.
- Aucune gestion d'erreur pour des scénarios impossibles.
- Si tu écris 200 lignes et que 50 suffiraient, réécris.

Le test : « un ingénieur senior dirait-il que c'est sur-compliqué ? »
Si oui, simplifier.

## 3. Modifications chirurgicales

**Ne toucher que le nécessaire. Ne nettoyer que ses propres dégâts.**

En modifiant du code existant :

- Ne pas « améliorer » le code, les commentaires ou le formatage adjacents.
- Ne pas refactoriser ce qui n'est pas cassé.
- Suivre le style existant, même si tu ferais autrement.
- Si tu repères du code mort sans rapport, le signaler — ne pas le supprimer.

Quand tes changements créent des orphelins :

- Supprimer les imports/variables/fonctions que TES changements ont rendus
  inutilisés.
- Ne pas supprimer du code mort préexistant sans qu'on te le demande.

Le test : chaque ligne modifiée doit se rattacher directement à la demande.

## 4. Exécution pilotée par l'objectif

**Définir les critères de succès. Boucler jusqu'à vérification.**

Transformer les tâches en objectifs vérifiables :

- « Ajouter de la validation » → « Écrire des tests pour les entrées
  invalides, puis les faire passer »
- « Corriger le bug » → « Écrire un test qui le reproduit, puis le faire
  passer »
- « Refactoriser X » → « Vérifier que les tests passent avant et après »

Pour une tâche multi-étapes, énoncer un plan bref :

```
1. [Étape] → vérifier : [contrôle]
2. [Étape] → vérifier : [contrôle]
3. [Étape] → vérifier : [contrôle]
```

Des critères de succès forts permettent de boucler en autonomie. Des
critères faibles (« que ça marche ») imposent des allers-retours constants.
