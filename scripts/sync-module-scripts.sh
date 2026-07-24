#!/usr/bin/env bash
set -euo pipefail

manifest="${MANIFEST:-scripts/module-script-sources.tsv}"
raw_base="https://raw.githubusercontent.com/anyforker/Surge/main/module/panel"
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

download() {
  curl -L --fail --silent --show-error --max-time 120 "$1"
}

sync_web_adblock_main() {
  local source="$1"

  download "$source" \
    | sed \
      -e "s|https://limbopro.com/Adguard/Adblock4limbo.js|$raw_base/web-adblock.js|g" \
      -e "s|https://limbopro.com/Adguard/Adblock4limbo.user.js|$raw_base/web-adblock-user.js|g" \
      -e "s|https://limbopro.com/Adguard/Adblock4limbo.function.js|$raw_base/web-adblock-function.js|g" \
      -e "s|https://limbopro.com/Adguard/elementBlocker.user.js|$raw_base/web-adblock-element.js|g" \
      -e "s|https://limbopro.com/Adguard/isAgent.js|$raw_base/web-adblock-agent.js|g"
}

sync_web_adblock_cnys() {
  local source="$1"

  download "$source" \
    | sed "s|https://limbopro.com/Adguard/Adblock4limbo.user.js|$raw_base/web-adblock-user.js|g"
}

changed=0
line_no=0
while IFS=$'\t' read -r target source mode extra; do
  line_no=$((line_no + 1))

  if [ -z "${target:-}" ] || [[ "$target" == \#* ]]; then
    continue
  fi

  mode="${mode:-mirror}"
  if [[ "$target" != module/panel/*.js ]] || [[ "$source" != https://* ]] || [ -n "${extra:-}" ]; then
    echo "Invalid manifest row at line $line_no" >&2
    exit 1
  fi

  tmp_file="$tmp_dir/$(basename "$target")"
  case "$mode" in
    mirror)
      download "$source" > "$tmp_file"
      ;;
    web-adblock-main)
      sync_web_adblock_main "$source" > "$tmp_file"
      ;;
    web-adblock-cnys)
      sync_web_adblock_cnys "$source" > "$tmp_file"
      ;;
    *)
      echo "Unsupported sync mode at line $line_no: $mode" >&2
      exit 1
      ;;
  esac

  if [ ! -s "$tmp_file" ]; then
    echo "Downloaded empty script: $target" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$target")"
  if [ -f "$target" ] && cmp -s "$tmp_file" "$target"; then
    continue
  fi

  mv "$tmp_file" "$target"
  printf 'Updated %s\n' "$target"
  changed=$((changed + 1))
done < "$manifest"

printf 'Updated scripts: %d\n' "$changed"
