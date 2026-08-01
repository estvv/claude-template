# Metrify — Design System Reference

Résumé complet du design de **Metrify** (dashboard analytics réseaux sociaux), à réutiliser comme base pour un autre projet.

---

## 1. Stack technique

| Couche | Choix |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Styles | Tailwind CSS v4 (`@theme inline`, pas de `tailwind.config.js`) |
| Composants UI | shadcn/ui, style **"new-york"**, base color **neutral**, via Radix UI (`radix-ui` package) |
| Icônes | `lucide-react` (UI) + set custom d'icônes de marques sociales (`social-icons.tsx`, style Simple Icons `Si*`) |
| Charts | `recharts` avec wrapper shadcn `ChartContainer` |
| Cartes géo | `react-simple-maps` |
| Utilitaires | `clsx` + `tailwind-merge` via un helper `cn()` |
| Data | Fichiers JSON statiques dans `/data` (mock, pas de vrai backend) — chaque page importe son JSON directement |

C'est un **prototype front-only** : toute la donnée est mockée en JSON, aucune API/DB. Bon signal si l'autre projet doit démarrer vite en maquette avant le vrai backend.

---

## 2. Palette de couleurs

Tout est piloté par des **CSS custom properties** dans `app/globals.css` (`:root`), *pas* de tokens Tailwind par défaut — approche "design tokens maison" mappés ensuite sur les variables shadcn.

### Couleurs de base
```css
--bg-primary:   #f5f5f5   /* fond de page (gris très clair) */
--bg-card:      #ffffff   /* fond des cards / sidebar */
--bg-sidebar:   #ffffff

--text-primary:   #1a1a1a  /* quasi-noir, pas de pur noir */
--text-secondary: #6b7280  /* gris moyen */
--text-muted:     #9ca3af  /* gris clair, labels/metadata */

--border-light: #e5e7eb
--border-card:  #e5e7eb
```

### Accents sémantiques
```css
--color-green:       #10b981   /* succès / tendance positive */
--color-green-light: #d1fae5
--color-red:         #ef4444   /* erreur / tendance négative / destructif */
--color-red-light:   #fee2e2
--color-blue:        #3b82f6   /* accent info / liens */
--color-blue-light:  #dbeafe
```

### Sidebar
```css
--sidebar-width:  240px
--sidebar-hover:  #f3f4f6
--sidebar-active: #f3f4f6
```

### Couleurs de marque (par plateforme sociale), utilisées dans les charts et badges
```
Twitter/X: #1d9bf0 (ou #1DA1F2 selon fichier)
YouTube:   #ff0000
Instagram: #e1306c (ou #E4405F)
TikTok:    #000000
Twitch:    #9146ff
```

### Philosophie couleur
- **Monochrome + un seul accent fonctionnel à la fois.** Le texte/UI est en niveaux de gris (`text-primary/secondary/muted`), jamais de couleur "brand" appliquée à l'UI générique.
- La couleur n'apparaît que pour : (a) sémantique verte/rouge (trend up/down, succès/erreur), (b) identité de marque des plateformes sociales (icônes, points de graph), (c) touches ponctuelles bleues pour des éléments cliquables/liens (ex: icône lien de tracking).
- Radius généreux : `--radius: 0.75rem` (12px) comme base shadcn, avec cards souvent en `rounded-xl`.
- Shadows très discrètes (`shadow-sm`), beaucoup de cards utilisent carrément `shadow-none` + juste une bordure `border-[var(--border-light)]`.

### Dark mode
Structure prête (`@custom-variant dark`) mais **non implémentée** — pas de bloc `.dark { ... }` avec valeurs alternatives. À faire si besoin dans le nouveau projet.

---

## 3. Typographie

- Police : **Geist Sans** (`next/font/google`, variable `--font-geist-sans`), fallback Arial/Helvetica.
- Pas de police mono custom visible à part le fallback shadcn.
- Échelle observée :
  - Titre de page hero : `text-4xl font-light` avec un mot clé en `font-bold` (ex: *"Welcome back, **Name** !"*, *"**Tracking** links"*) — pattern récurrent : titre en light + emphase en bold sur le mot important.
  - Titre de page secondaire (icône + titre) : `text-xl` / `text-2xl font-bold`
  - Titres de section/card : `text-lg font-semibold`
  - Corps / labels : `text-sm`
  - Métadonnées / captions : `text-xs`, parfois `text-[10px]` ou `text-[13px]` pour du texte très secondaire
  - Valeurs chiffrées mises en avant (stat cards) : `text-2xl font-bold`
- Beaucoup de `font-bold`/`font-semibold` pour hiérarchiser sans changer de taille — le poids fait le travail plus que la taille.

---

## 4. Layout global

- **Sidebar fixe** à gauche, largeur `240px` (`--sidebar-width`), `fixed h-screen`, fond blanc, bordure droite `border-light`.
- Contenu principal : `<main className="ml-[var(--sidebar-width)] min-h-screen p-8">`.
- Chaque page centre son contenu avec `mx-auto max-w-5xl` (pages formulaire/settings) ou `max-w-7xl` (dashboards avec beaucoup de data).
- Pas de topbar / header global — la sidebar embarque tout (profil workspace en haut, nav, footer en bas).

### Sidebar — structure
1. Bloc profil workspace (logo 36×36 arrondi, nom + email, bouton `⋮`)
2. `<hr>` séparateur
3. Nav sections avec `SectionHeader` (label + bouton `+` optionnel, ex: "Your space", "Social Media") — permet d'ajouter dynamiquement (ex: pin de projets)
4. Items actifs détectés via `usePathname()`, state actif = fond `--sidebar-active` + texte foncé + `font-medium`
5. Items "indentés" (sous-niveau, ex: projets épinglés) avec icône plus petite (14px vs 18px) et padding-left supplémentaire
6. Footer séparé par `<hr>` (Settings, etc.)
7. Data-driven : toute la nav vient d'un JSON (`data/sidebar.json`), mappé vers des composants icônes via un dictionnaire `LUCIDE_ICONS` / `SOCIAL_ICONS`

---

## 5. Composants UI (shadcn customisés)

Composants shadcn standards (Button, Card, Input, Select, Table) **repeints** pour utiliser les CSS vars maison plutôt que les tokens shadcn par défaut. Bon pattern à réutiliser : garder l'API shadcn (`variant`, `size`, `data-slot`) mais rebrancher les couleurs sur ses propres design tokens.

### Button
- Variants : `default` (fond `text-primary` quasi-noir / texte blanc), `outline`, `ghost`, `destructive` (rouge), `secondary` (fond gris clair)
- Sizes : `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` (carré h-9 w-9)
- `cursor-pointer` toujours forcé, `disabled:opacity-50`

### Card
- Structure shadcn classique (`CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`)
- `CardAction` très utilisé pour caler un `Select` (filtre période) en haut à droite du header, à côté du titre
- Beaucoup de cards en usage réel passent `shadow-none border-[var(--border-light)]` — le style "carte plate à bordure" domine sur le style "carte avec ombre"

### Table
- Header de tableau souvent en `font-normal text-[var(--text-muted)]` (discret) pour les tables de type "classement/liste" (Best performance), mais en `font-semibold text-[var(--text-primary)]` + fond légèrement teinté (`bg-[var(--bg-primary)]/30`) pour les tables de gestion (Access, tracking-links)
- Lignes cliquables : `cursor-pointer` + `router.push(...)` au clic de la `TableRow`, avec actions secondaires (copier, etc.) qui font `e.stopPropagation()`
- Pattern "reveal on hover" : icônes d'action cachées (`opacity-0 group-hover:opacity-100`) qui apparaissent au survol de la ligne

### Select / Input
- Look uniforme : bordure `border-light`, fond souvent `bg-[var(--bg-primary)]/50` qui devient `bg-white` au focus (petit effet de "élévation" au focus)
- Radix-based, comportements accessibles standards

### Charts (`ChartContainer` shadcn + Recharts)
- `AreaChart` avec dégradés SVG (`linearGradient`, opacité 15%→2%) sous la courbe — signature visuelle du produit
- Grille uniquement horizontale (`CartesianGrid vertical={false}`), axes sans ligne ni tick marks (`axisLine={false} tickLine={false}`)
- Une couleur par plateforme sociale (voir palette), cohérente entre légende, tooltip et courbes
- Sélecteur de période intégré dans `CardAction` (1 mois / 3 mois / 6 mois / 1 an)

---

## 6. Patterns de page récurrents

### Header de page (2 variantes)
1. **Dashboard hero** : `text-4xl font-light` + mot-clé bold + emoji parfois (`👋`)
2. **Page de gestion** (Access, Social, Settings...) : icône dans un carré arrondi à bordure (`h-10/12 w-10/12 rounded-xl border shadow-sm`) + titre `font-bold` + sous-titre `text-muted` en dessous — pattern "icon badge + title + description" très systématique

### Stats cards
Grille de 4 cards (`grid grid-cols-4 gap-4`) : label (icône + texte) en haut, badge de tendance (vert ↑ / rouge ↓ avec `TrendingUp`/`TrendingDown`) en haut à droite, grosse valeur en bas.

### Sections de gestion (Access, Social accounts)
- Card "ajout" en haut (form inline : input + select + bouton)
- Puis liste/tableau des éléments existants avec action de suppression au hover
- Barre de couleur latérale (`w-1 h-full` avec la couleur de marque) sur les cards de type "plateforme" — détail distinctif
- Badges pills pour tags/pages (`rounded-sm text-[10px] font-bold border shadow-sm`)
- Bouton "+" en pointillés (`border-dashed`) pour ajouter un item à une liste inline

### États vides
Bloc centré, bordure en pointillés, fond légèrement teinté, texte `text-muted` — pattern cohérent partout où une liste peut être vide.

---

## 7. Ce qui fait "l'identité visuelle" Metrify (à retenir pour le nouveau projet)

1. **Neutre + accent fonctionnel** : UI en gris/noir/blanc, la couleur est réservée au sens (vert/rouge = trend, couleurs de marque = identité data).
2. **Bordures plutôt qu'ombres** : `shadow-none` + `border-light` est le look par défaut des cards, pas les ombres portées.
3. **Radius généreux (12px)** partout — sensation "soft/friendly" plutôt que anguleuse.
4. **Titre light + emphase bold** sur le mot clé, en hero de page.
5. **Icon badge carré arrondi** en intro de chaque page de gestion (constant sur Access/Social/etc.).
6. **CSS custom properties maison** (`--bg-primary`, `--text-secondary`, etc.) plutôt que classes Tailwind brutes ou tokens shadcn par défaut — permet de reskin tout le produit en changeant `globals.css` uniquement.
7. **Data mockée en JSON** découplée des composants — permet de prototyper l'UI avant le backend.
8. **Micro-interactions discrètes** : reveal-on-hover pour actions secondaires, focus qui "éclaircit" les inputs (gris → blanc), transitions `colors`/`opacity` systématiques.

---

## 8. Pour démarrer un nouveau projet dans le même esprit

- Copier `app/globals.css` (bloc `:root` + `@theme inline`) comme point de départ, changer uniquement les valeurs hex si palette différente — garder les *noms* de variables.
- Réutiliser `components.json` (style "new-york", baseColor "neutral") pour repartir sur la même base shadcn.
- Garder le pattern sidebar fixe + `main` avec `margin-left` = largeur sidebar, plutôt qu'un layout flex classique.
- Réutiliser le pattern "icon badge + title + description" pour toute nouvelle page de gestion.
- Réutiliser `ChartContainer`/`chart.tsx` de shadcn tel quel — c'est un wrapper générique, pas spécifique à Metrify.
