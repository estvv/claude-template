# Features — Unlocked

Spécification consolidée à partir du brainstorm (`docs/IDEAS.md`) et des
décisions prises en discussion. Sert de base au modèle de données.

## Rôles

- **Admin plateforme** (global, tous groupes confondus) : accès à un
  panel d'administration, seul habilité à créer/modifier les
  catégories d'achievement (liste fixe, pas de tags libres). Peut
  aussi modérer n'importe quel groupe (voir Modération).
- **Owner de groupe** : créateur du groupe.
- **Membre de groupe** : membre normal, peut créer des achievements,
  voter, parier, etc.

Un rôle admin plateforme est indépendant du rôle dans un groupe (un
admin plateforme n'est pas forcément owner/membre d'un groupe donné).

## Groupes

- **Création** : n'importe quel utilisateur connecté peut créer un
  groupe ; il en devient automatiquement owner.
- **Rejoindre** : par lien/code d'invitation généré par le owner
  (partageable ex: sur Discord). Pas d'annuaire public de groupes.
- Un utilisateur peut appartenir à **plusieurs groupes**.
- Chaque groupe a : ses propres achievements, son propre leaderboard,
  et pour chaque membre un **Karma** et un solde de **Tokens**
  distincts (scopés par groupe, pas globaux).

## Achievements

- Dans un groupe précis : titre, description, catégorie (liste fixe
  gérée par les admins plateforme), délai de X jours pour le
  réaliser.
- **Figé après création** : titre/description/délai ne sont plus
  modifiables une fois l'achievement créé (le vote d'estimation, s'il
  y en a un, démarre immédiatement). Le créateur peut l'annuler/
  supprimer tant qu'aucune tentative n'a été soumise.
- **Jamais récurrent** : chaque achievement est un événement ponctuel
  unique, pas de notion de challenge qui se relance automatiquement
  (ex: pas d'achievement hebdomadaire).

### Qui peut créer un achievement, et estimation des points

C'est le **rôle du créateur** qui détermine si les points sont fixés
d'office ou soumis au vote :

- **Owner du groupe ou admin plateforme** → points **fixés
  directement à la création, pas de vote**.
- **Membre normal** → la valeur en points passe par un **vote
  communautaire d'estimation** (fenêtre à durée fixe, ex: 48h, avant
  clôture automatique).

Les **templates plateforme** (bibliothèque maintenue par les admins,
réutilisable dans n'importe quel groupe) ne sont qu'un
pré-remplissage du formulaire : partir d'un template ne permet pas
d'échapper au vote si on est un membre normal, sinon n'importe qui
pourrait contourner l'estimation. Le template d'origine est conservé
sur l'achievement à titre de provenance.

### Deux modes d'achievement

- **Ouvert (compétition)** : n'importe quel membre du groupe peut
  tenter l'achievement. Points **dégressifs selon l'ordre
  d'arrivée** des réalisations validées (ex: 1er = 50, 2e = 40,
  3e = 25).
- **Personnel (assigné à une personne nommée)** : l'achievement cible
  UN membre précis du groupe (ex: "Paul va courir un marathon avant
  le 31/12"). Résultat binaire : réalisé ou non avant le délai. Si
  réalisé et validé, la personne ciblée gagne du Karma comme pour un
  achievement classique.

### Soumission et validation d'une réalisation

Mécanisme commun aux deux modes (pour le mode Personnel, seule la
personne ciblée peut soumettre) :

- **Soumission ("Je l'ai fait")** : action dédiée, distincte des
  messages du fil, avec preuve obligatoire — photo, vidéo, **audio**
  ou capture d'écran. C'est cette soumission qui déclenche le vote de
  validation communautaire — pas un simple message avec image posté
  dans le fil.
- **Validation** : vote communautaire (fenêtre à durée fixe
  également), majorité calculée sur les votants (pas sur l'effectif
  total du groupe). Trois issues possibles :
  - **Validé** : possibilité de voter un nombre de points différent
    de l'estimation de base. Si plus de la moitié des votants mettent
    0 → validé mais accordant 0 point (reste "fait" mais gratuit).
  - **Rejeté** : la communauté peut voter un rejet complet (preuve
    invalide/fraude), distinct du cas "0 point" — ça ne compte pas
    comme une tentative faite, l'auteur peut retenter avant le délai.
  - *(mode Personnel uniquement)* si le délai passe sans soumission
    validée → résultat "Non" par défaut.

Une preuve soumise juste avant le délai garde sa fenêtre de vote
complète : l'achievement passe en terminé à l'échéance, mais le pari
associé reste ouvert tant que cette preuve est en cours de
dépouillement (sinon le pari paierait un échec sur un défi sur le
point d'être validé).
- Note personnelle ajoutable par l'auteur de la réalisation.

- **Fil de discussion par achievement** : messages texte, avec
  possibilité d'y attacher des images. Sert aux commentaires libres
  des membres (peuvent illustrer un message d'une image sans que ça
  déclenche quoi que ce soit — la preuve officielle passe uniquement
  par la soumission dédiée ci-dessus).
- **Calendrier de groupe** : tous les achievements du groupe visibles
  avec leurs dates (création / délai).

## Karma & Tokens (monnaies)

- **Karma** : score gagné via les achievements validés, par groupe.
- **Tokens** : monnaie des paris, également par groupe. Solde de
  départ fixe attribué à l'entrée dans un groupe (ex: 100), qui
  évolue ensuite uniquement via les paris gagnés/perdus. Un membre ne
  peut jamais parier plus que son solde actuel (jamais négatif).

## Paris (Gambling)

Un pari est **toujours lié à un achievement** (jamais de pari libre
sans achievement derrière) ; son type découle directement du mode de
l'achievement, et sa résolution est **toujours automatique**, déduite
de la validation de l'achievement :

- **Achievement Personnel → pari Oui/Non** : les membres parient sur
  le résultat binaire (la personne ciblée va-t-elle réussir ?).
  Résolu automatiquement quand l'achievement est validé "vrai" ou
  passe en "non" (délai dépassé sans validation).
- **Achievement Ouvert → pari "Qui"** : les membres parient sur quel
  candidat terminera l'achievement en premier. Résolu automatiquement
  dès qu'une réalisation est validée comme "première". Coexiste avec
  les points au classement (les deux mécaniques tournent en
  parallèle sur le même achievement).

Système **pari mutuel** dans les deux cas (comme au PMU) : les mises
de tous les parieurs, toutes issues confondues, forment un pot commun.
À la résolution, les gagnants se partagent tout le pot au prorata de
leur mise :

```
gain_du_parieur = (mise_du_parieur / total_misé_sur_l'issue_gagnante) × pot_total
```

Aucune commission prélevée (ni plateforme, ni groupe) : tout le pot
est redistribué. Si personne n'a misé sur l'issue gagnante, tout le
monde est simplement remboursé de sa mise (pas de gain ni perte).

N'importe quel membre, y compris le créateur de l'achievement ciblé
(mode Personnel) ou un participant lui-même (mode Ouvert), peut
parier des Tokens.

## Leaderboard

- Par groupe, triable par catégorie d'achievement (cumulatif depuis
  toujours, pas de reset périodique/saison).
- **+ un leaderboard global** qui agrège le Karma d'un utilisateur à
  travers tous ses groupes.

## Intégration Discord

- Vraie intégration dès le départ (pas juste in-app), mais sous forme
  d'un **log d'activité générique** posté dans un channel Discord par
  groupe (une ligne par événement notable : achievement créé, validé,
  pari résolu, etc.) plutôt que des messages riches formatés par type
  d'événement. Configuration du webhook par groupe à définir (qui le
  configure, où il est stocké).

## Modération

- Dans un groupe : un achievement ou un message peut être supprimé par
  son auteur ou par le owner du groupe.
- Les pages d'un groupe restent **strictement réservées à ses
  membres** — un admin plateforme n'y accède pas plus qu'un autre.
  Sa modération globale passe donc par un **écran dédié**
  (`/admin/moderation`) qui liste les contenus récents de tous les
  groupes, y compris ceux dont il n'est pas membre.

## Panel Administrateur (plateforme)

- Gestion des catégories fixes d'achievements (créer, renommer,
  supprimer si inutilisée). Le slug n'est jamais régénéré : c'est lui
  qui sert aux URLs de filtre du classement.
- Gestion des modèles d'achievement (créer, modifier, supprimer). Les
  achievements déjà créés depuis un modèle gardent leurs valeurs.
- Modération globale (voir ci-dessus).
- Autres capacités à définir plus tard (gestion users/groupes...).

## Notifications

- Rappel d'inactivité : un membre sans achievement validé depuis 30
  jours est signalé dans le fil d'activité du groupe (et donc dans le
  log Discord). Ne se répète pas plus d'une fois par période.
- Autres notifications à définir (nouvel achievement créé, pari
  résolu, validation en attente...).
- Canaux hors app (email/push) : non tranché, in-app + log Discord
  suffisent pour le MVP.

## Mobile (iOS/Android)

Pas de distribution App Store/Play Store nécessaire ("appli entre
potes") → **PWA** plutôt qu'une app native empaquetée (Capacitor/React
Native) : un seul codebase (le site Next.js), installable sur l'écran
d'accueil sur Android (bouton natif Chrome) et iOS (Safari → Partager
→ "Sur l'écran d'accueil"), notifications push supportées sur les deux
(iOS depuis 16.4+). Scaffold déjà en place : `src/app/manifest.ts`,
meta tags iOS dans `layout.tsx`, service worker minimal
(`public/sw.js`, juste de quoi satisfaire les critères
d'installabilité — pas encore de vraie stratégie de cache offline ni
de push notifications, à faire plus tard).

## Écrans / Routes (à détailler)

Repris tel quel du brainstorm initial, pas encore développé :
- Achievements
- Images

## Données de test — fixtures vs seed

Deux mécanismes distincts, à ne pas confondre :

- **Seed** (prod) : données essentielles au fonctionnement de l'app,
  idempotent, joué à chaque déploiement. Ex: catégories fixes
  d'achievement, compte admin de bootstrap.
- **Fixtures** (dev uniquement) : données fictives pour tester en
  local — users, groupes, achievements à différents états (en vote,
  validé, rejeté), paris, messages... Jamais joué en prod.

## Hors scope pour l'instant

- Design/UI : voir `docs/DESIGN.md` séparément.
