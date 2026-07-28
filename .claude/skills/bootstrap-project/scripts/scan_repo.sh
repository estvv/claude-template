#!/usr/bin/env bash
# Deterministic collection of signals on the repo, to prevent Claude
# from exploring blindly and wasting context. Raw text output, to be
# interpreted by the bootstrap skill.

set -euo pipefail
ROOT="${1:-.}"
cd "$ROOT"

echo "## Tree (2 levels, excluding node_modules/.git/dist/build)"
find . -maxdepth 2 \
  -not -path '*/node_modules*' -not -path '*/.git*' \
  -not -path '*/dist*' -not -path '*/build*' \
  | sort

MANIFESTS="package.json pyproject.toml requirements.txt go.mod Cargo.toml Gemfile composer.json"

echo -e "\n## Detected manifest files (root)"
for f in $MANIFESTS; do
  [ -f "$f" ] && echo "present: $f"
done

# A manifest below the root means a sub-project. This drives whether the
# bootstrap writes one root CLAUDE.md or one per sub-project.
echo -e "\n## Sub-projects (manifests below the root)"
found_sub=0
for m in $MANIFESTS; do
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    echo "$(dirname "$f") : $m"
    found_sub=1
  done < <(find . -mindepth 2 -maxdepth 3 -name "$m" \
    -not -path '*/node_modules/*' -not -path '*/.git/*' \
    -not -path '*/dist/*' -not -path '*/build/*' \
    -not -path '*/.venv/*' -not -path '*/vendor/*' 2>/dev/null | sort)
done
[ "$found_sub" -eq 0 ] && echo "none — single-project repo"

echo -e "\n## File count by extension (top 15)"
find . -type f -not -path '*/node_modules*' -not -path '*/.git*' \
  | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -15

echo -e "\n## Detected CI / config"
for f in .github/workflows .gitlab-ci.yml .circleci Dockerfile docker-compose.yml; do
  [ -e "$f" ] && echo "present: $f"
done

echo -e "\n## Existing docs"
for f in README.md CONTRIBUTING.md CLAUDE.md docs; do
  [ -e "$f" ] && echo "present: $f"
done

# Titles only: the content of ADRs must NEVER be ingested in bulk
# (thousands of tokens for rarely relevant decisions). The title is
# enough to decide which ones warrant a targeted read.
echo -e "\n## Existing ADRs (titles only — do not read in bulk)"
if [ -d docs/adr ]; then
  for f in docs/adr/*.md; do
    [ -f "$f" ] || continue
    case "$f" in *0000-template.md) continue;; esac
    echo "$f : $(head -1 "$f" | sed 's/^#\+ *//')"
  done
else
  echo "no docs/adr folder"
fi

echo -e "\n## Git log summary (last 30 commits)"
git log -30 --oneline 2>/dev/null || echo "not a git repo"

echo -e "\n## Debt / unformed-convention markers (TODO, FIXME, HACK)"
grep -rIn --exclude-dir={node_modules,.git,dist,build} -E "TODO|FIXME|HACK" . \
  | cut -c1-160 | head -40 || echo "none found"