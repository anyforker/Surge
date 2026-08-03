#!/usr/bin/env bash
set -euo pipefail

manifest="${MANIFEST:-scripts/config-sources.tsv}"
normalizer="scripts/normalize-mtproto-dc-config.js"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

if [ ! -f "$manifest" ]; then
  printf 'Manifest not found: %s\n' "$manifest" >&2
  exit 1
fi

target=""
source_url=""
mode=""
entry_count=0
line_no=0
while IFS=$'\t' read -r entry_target entry_source entry_mode extra; do
  line_no=$((line_no + 1))
  if [ -z "${entry_target:-}" ] || [[ "$entry_target" == \#* ]]; then
    continue
  fi

  if [[ ! "$entry_target" =~ ^config/[a-z0-9]+(-[a-z0-9]+)*\.json$ ]] \
    || [[ "$entry_source" != https://* ]] \
    || [ "$entry_mode" != "expand-ipv6" ] \
    || [ -n "${extra:-}" ]; then
    printf 'Invalid manifest row at line %d\n' "$line_no" >&2
    exit 1
  fi

  entry_count=$((entry_count + 1))
  target="$entry_target"
  source_url="$entry_source"
  mode="$entry_mode"
done < "$manifest"

if [ "$entry_count" -ne 1 ]; then
  printf 'Expected exactly one MTProto config source, found %d\n' "$entry_count" >&2
  exit 1
fi

raw_file="$tmp_dir/mtproto-dc-config.upstream.json"
normalized_file="$tmp_dir/mtproto-dc-config.json"

printf 'Syncing %s <- %s\n' "$target" "$source_url"
if ! curl \
  -L \
  --fail \
  --silent \
  --show-error \
  --connect-timeout 20 \
  --max-time 120 \
  --retry 3 \
  --retry-all-errors \
  --retry-delay 3 \
  --retry-max-time 30 \
  --output "$raw_file" \
  "$source_url"; then
  if [ -s "$target" ]; then
    printf 'Warning: failed to download upstream config; preserving %s\n' "$target" >&2
    if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
      printf '::warning file=%s::Failed to download %s after retries; preserving the existing config\n' \
        "$target" "$source_url"
    fi
    exit 0
  fi

  printf 'Download failed and no existing config can be preserved: %s\n' "$target" >&2
  exit 1
fi

case "$mode" in
  expand-ipv6)
    node "$normalizer" < "$raw_file" > "$normalized_file"
    ;;
esac

if [ -f "$target" ] && cmp -s "$normalized_file" "$target"; then
  printf 'No MTProto DC config changes.\n'
  exit 0
fi

mkdir -p "$(dirname "$target")"
mv "$normalized_file" "$target"
printf 'Updated %s\n' "$target"
