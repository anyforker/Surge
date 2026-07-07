#!/usr/bin/env bash
set -euo pipefail

manifest="${MANIFEST:-scripts/rule-set-sources.tsv}"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

if [ ! -f "$manifest" ]; then
  echo "Manifest not found: $manifest" >&2
  exit 1
fi

duplicate_targets="$(
  awk -F '\t' 'NF && $1 !~ /^#/ { count[$1]++ } END { for (target in count) if (count[target] > 1) print target }' "$manifest"
)"
if [ -n "$duplicate_targets" ]; then
  echo "Duplicate targets in $manifest:" >&2
  echo "$duplicate_targets" >&2
  exit 1
fi

line_no=0
while IFS=$'\t' read -r target source extra; do
  line_no=$((line_no + 1))

  if [ -z "${target:-}" ] || [[ "$target" == \#* ]]; then
    continue
  fi

  if [ -z "${source:-}" ] || [ -n "${extra:-}" ]; then
    echo "Invalid manifest row at line $line_no" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$target")"
  tmp_file="$tmp_dir/$(printf '%s' "$target" | tr '/ ' '__').tmp"

  {
    printf '## Mirrored Surge rule set\n'
    printf '## Source: %s\n' "$source"
    printf '## Synced by: scripts/sync-rule-sets.sh\n'
    printf '\n'
    curl -L --fail --silent --show-error --max-time 60 "$source"
  } > "$tmp_file"

  if [ ! -s "$tmp_file" ]; then
    echo "Downloaded empty rule set: $source" >&2
    exit 1
  fi

  if [ -f "$target" ] && cmp -s "$tmp_file" "$target"; then
    continue
  fi

  mv "$tmp_file" "$target"
done < "$manifest"
