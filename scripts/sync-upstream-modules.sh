#!/usr/bin/env bash
set -euo pipefail

manifest="${MANIFEST:-scripts/upstream-module-sources.tsv}"
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
  local source="$1"
  local curl_args=(
    -L
    --fail
    --silent
    --show-error
    --max-time 120
  )

  if [[ "$source" == https://yfamilys.com/* ]]; then
    curl_args+=(
      --user-agent "Mozilla/5.0"
      --referer "https://yfamilys.com/surge"
    )
  fi

  curl "${curl_args[@]}" "$source"
}

validate_module() {
  local target="$1"
  local file="$2"
  local mode="$3"
  local required_sections=()

  if [ ! -s "$file" ]; then
    echo "Downloaded empty module: $target" >&2
    exit 1
  fi

  if grep -Eiq '<!doctype html|<html[[:space:]>]' "$file"; then
    echo "Downloaded HTML instead of a Surge module: $target" >&2
    exit 1
  fi

  grep -Eq '^#!name[[:space:]]*=' "$file"
  grep -q '^#!category=AdBlock$' "$file"
  case "$mode" in
    yfamilys-adblock)
      grep -Fqx '#!name=应用广告过滤' "$file"
      grep -q '^#!homepage=https://yfamilys.com$' "$file"
      required_sections=("URL Rewrite" "Script" "MITM" "Map Local")
      ;;
    biliuniverse-adblock)
      grep -Fqx '#!name=哔哩哔哩广告过滤' "$file"
      grep -Eqi '^#!homepage[[:space:]]*=[[:space:]]*https://ADBlock\.BiliUniverse\.io$' "$file"
      required_sections=("URL Rewrite" "Script" "MITM" "Map Local")
      ;;
    youtube-enhance-adblock)
      grep -Fqx '#!name=YouTube 广告过滤' "$file"
      grep -Fqx '#!desc=适用于 Youtube & Youtube Music' "$file"
      required_sections=("Script" "MITM")
      ;;
  esac
  for section in "${required_sections[@]}"; do
    grep -q "^\\[$section\\]$" "$file"
  done
}

sync_adblock() {
  local source="$1"
  local display_name="$2"

  download "$source" \
    | awk -v display_name="$display_name" '
        /^#!name[[:space:]]*=/ {
          print "#!name=" display_name
          next
        }
        /^#!category[[:space:]]*=/ { next }
        { print }
        /^#!desc[[:space:]]*=/ { print "#!category=AdBlock" }
      '
}

changed=0
line_no=0
while IFS=$'\t' read -r target source mode extra; do
  line_no=$((line_no + 1))

  if [ -z "${target:-}" ] || [[ "$target" == \#* ]]; then
    continue
  fi

  if [ -n "${SYNC_TARGET:-}" ] && [ "$target" != "$SYNC_TARGET" ]; then
    continue
  fi

  mode="${mode:-mirror}"
  if [[ ! "$target" =~ ^module/[a-z0-9]+(-[a-z0-9]+)*\.sgmodule$ ]] \
    || [[ "$source" != https://* ]] \
    || [ -n "${extra:-}" ]; then
    echo "Invalid manifest row at line $line_no" >&2
    exit 1
  fi

  tmp_file="$tmp_dir/$(basename "$target")"
  case "$mode" in
    mirror)
      download "$source" > "$tmp_file"
      ;;
    yfamilys-adblock)
      sync_adblock "$source" "应用广告过滤" > "$tmp_file"
      ;;
    biliuniverse-adblock)
      sync_adblock "$source" "哔哩哔哩广告过滤" > "$tmp_file"
      ;;
    youtube-enhance-adblock)
      sync_adblock "$source" "YouTube 广告过滤" > "$tmp_file"
      ;;
    *)
      echo "Unsupported sync mode at line $line_no: $mode" >&2
      exit 1
      ;;
  esac
  validate_module "$target" "$tmp_file" "$mode"

  if [ -f "$target" ] && cmp -s "$tmp_file" "$target"; then
    continue
  fi

  mkdir -p "$(dirname "$target")"
  mv "$tmp_file" "$target"
  printf 'Updated %s\n' "$target"
  changed=$((changed + 1))
done < "$manifest"

printf 'Updated modules: %d\n' "$changed"
