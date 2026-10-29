#!/usr/bin/env bash
# Validate site/ before publishing. Prints every problem and exits 1 if there is any.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
site="$root/site"
errors=0
fail() { echo "ERROR: $*" >&2; errors=$((errors + 1)); }
warn() { echo "WARNING: $*" >&2; }

max_bytes=300000

shopt -s nullglob

# Files in the site root would be public at a guessable URL.
for f in "$site"/*; do
  [[ -d "$f" ]] || fail "site/$(basename "$f"): no files allowed in the site root, only page folders"
done

# The shared template every page loads.
for f in recs.js recs.css; do
  [[ -f "$site/_shared/$f" ]] || fail "site/_shared/$f is missing"
done

names=()
for dir in "$site"/*/; do
  name="$(basename "$dir")"
  [[ "$name" == "_shared" ]] || names+=("$name")
done

validate=0
command -v node >/dev/null && validate=1 || echo "WARNING: node not found, page data is not validated" >&2

for name in ${names[@]+"${names[@]}"}; do
  [[ "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*-[0-9a-f]{6}$ ]] \
    || fail "site/$name: folder name must be <course-slug>-<6 hex chars>; create folders with scripts/new-recs.sh"

  page="$site/$name/index.html"
  at="site/$name/index.html"
  if [[ ! -f "$page" ]]; then
    fail "site/$name: index.html is missing"
    continue
  fi

  for f in "$site/$name"/*; do
    [[ "$(basename "$f")" == "index.html" ]] || fail "site/$name/$(basename "$f"): only index.html is allowed in a page folder"
  done

  grep -ioE '<meta[^>]*robots[^>]*>' "$page" | grep -qi noindex \
    || fail "$at: <head> must contain <meta name=\"robots\" content=\"noindex, nofollow\">"

  for f in recs.js recs.css; do
    grep -qF "../_shared/$f" "$page" || fail "$at: must load ../_shared/$f"
  done

  # Design and behavior belong in site/_shared/, the page holds only data.
  # The data itself may mention any of these words (e.g. a JS course), so check only the markup around it.
  markup="$(sed '/<script>/,/<\/script>/d' "$page")"
  grep -qi '<style' <<<"$markup" && fail "$at: no <style> allowed; design belongs in site/_shared/recs.css"
  grep -q 'localStorage' <<<"$markup" && fail "$at: no localStorage allowed; storage belongs in site/_shared/recs.js"
  grep -qiE ' on[a-z]+=' <<<"$markup" && fail "$at: no inline event handlers (onclick=...) allowed"

  inline=0
  while IFS= read -r tag; do
    if [[ "$tag" =~ src= ]]; then
      [[ "$tag" == *'src="../_shared/recs.js"'* ]] || fail "$at: external script not allowed: $tag"
    else
      inline=$((inline + 1))
    fi
  done < <(grep -oiE '<script[^>]*>' "$page")
  ((inline == 1)) || fail "$at: must have exactly one inline <script> (const RECS = {...}), found $inline"

  while IFS= read -r tag; do
    [[ "$tag" == *'href="../_shared/recs.css"'* || "$tag" == *'href="https://fonts.googleapis.com/'* ]] \
      || fail "$at: stylesheet not allowed: $tag"
  done < <(grep -oiE '<link[^>]*stylesheet[^>]*>' "$page")

  size=$(wc -c <"$page" | tr -d ' ')
  ((size <= max_bytes)) || warn "$at: $size bytes, more than $max_bytes; check that the page holds only data"

  if ((validate)); then
    node "$root/scripts/validate-recs.js" "$page" || errors=$((errors + 1))
  fi

  for other in "${names[@]}"; do
    [[ "$other" == "$name" ]] && continue
    grep -qF "$other" "$page" && fail "$at: links to another page ($other)"
  done
done

if ((errors > 0)); then
  echo "Check failed. Fix every ERROR above." >&2
  exit 1
fi
echo "OK: ${#names[@]} page(s) checked."
