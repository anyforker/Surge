#!/usr/bin/env bash
set -euo pipefail

manifest="${MANIFEST:-scripts/rule-set-sources.tsv}"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
expected_targets="$tmp_dir/expected-targets.txt"

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

write_header() {
  local source="$1"
  local mode="$2"

  printf '## Synced Surge rule set\n'
  printf '## Source: %s\n' "$source"
  printf '## Mode: %s\n' "$mode"
  printf '## Synced by: scripts/sync-rule-sets.sh\n'
  printf '\n'
}

sync_mirror() {
  local source="$1"

  curl -L --fail --silent --show-error --max-time 60 "$source"
}

sync_geosite_domain_suffix() {
  local source="$1"

  {
    curl -L --fail --silent --show-error --max-time 60 "$source" \
      | awk 'NF && $0 !~ /^#/ { if ($0 ~ /^\+\./) print substr($0,3); else print $0 }'

    printf '%s\n' \
      admireme.vip \
      fansly.com \
      fanvue.com \
      justfor.fans \
      loyalfans.com \
      onlyfans.com \
      sex \
      xxx
  } \
    | sed 's/[[:space:]]//g' \
    | awk 'NF && $0 ~ /^[A-Za-z0-9._-]+$/ { print tolower($0) }' \
    | sort -u \
    | awk '{ print "DOMAIN-SUFFIX," $0 }'
}

line_no=0
while IFS=$'\t' read -r target source mode extra; do
  line_no=$((line_no + 1))

  if [ -z "${target:-}" ] || [[ "$target" == \#* ]]; then
    continue
  fi

  mode="${mode:-mirror}"
  if [ -z "${source:-}" ] || [ -n "${extra:-}" ]; then
    echo "Invalid manifest row at line $line_no" >&2
    exit 1
  fi

  printf '%s\n' "$target" >> "$expected_targets"
  mkdir -p "$(dirname "$target")"
  tmp_file="$tmp_dir/$(printf '%s' "$target" | tr '/ ' '__').tmp"

  {
    write_header "$source" "$mode"

    case "$mode" in
      mirror)
        sync_mirror "$source"
        ;;
      geosite-domain-suffix)
        printf '## Supplemental entries: adult creator platforms and adult TLDs not present in source\n'
        printf '\n'
        sync_geosite_domain_suffix "$source"
        ;;
      *)
        echo "Unsupported sync mode at line $line_no: $mode" >&2
        exit 1
        ;;
    esac
  } > "$tmp_file"

  if [ ! -s "$tmp_file" ]; then
    echo "Generated empty rule set: $target" >&2
    exit 1
  fi

  if [ -f "$target" ] && cmp -s "$tmp_file" "$target"; then
    continue
  fi

  mv "$tmp_file" "$target"
done < "$manifest"

if [ -d rule/upstream ]; then
  while IFS= read -r current_file; do
    if ! grep -Fxq -- "$current_file" "$expected_targets"; then
      rm -f "$current_file"
    fi
  done < <(find rule/upstream -type f -name '*.list' | sort)

  find rule/upstream -type d -empty -delete
fi
