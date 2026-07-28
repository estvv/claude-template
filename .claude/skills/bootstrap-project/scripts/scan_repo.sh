#!/usr/bin/env bash
# Collecte déterministe de signaux sur le repo, pour éviter que Claude
# explore à l'aveugle et gaspille du contexte. Sortie texte brute,
# à interpréter par le skill de bootstrap.

set -euo pipefail
ROOT="${1:-.}"
cd "$ROOT"

echo "## Arborescence (2 niveaux, hors node_modules/.git/dist/build)"
find . -maxdepth 2 \
  -not -path '*/node_modules*' -not -path '*/.git*' \
  -not -path '*/dist*' -not -path '*/build*' \
  | sort

echo -e "\n## Fichiers manifestes détectés"
for f in package.json pyproject.toml requirements.txt go.mod Cargo.toml Gemfile composer.json; do
  [ -f "$f" ] && echo "présent: $f"
done

echo -e "\n## Compteur de fichiers par extension (top 15)"
find . -type f -not -path '*/node_modules*' -not -path '*/.git*' \
  | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -15

echo -e "\n## CI / config détectés"
for f in .github/workflows .gitlab-ci.yml .circleci Dockerfile docker-compose.yml; do
  [ -e "$f" ] && echo "présent: $f"
done

echo -e "\n## Docs existantes"
for f in README.md CONTRIBUTING.md CLAUDE.md docs; do
  [ -e "$f" ] && echo "présent: $f"
done

echo -e "\n## Git log résumé (30 derniers commits)"
git log -30 --oneline 2>/dev/null || echo "pas un repo git"

echo -e "\n## Marqueurs de dette / convention non figée (TODO, FIXME, HACK)"
grep -rIn --exclude-dir={node_modules,.git,dist,build} -E "TODO|FIXME|HACK" . \
  | cut -c1-160 | head -40 || echo "aucun trouvé"