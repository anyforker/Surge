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
  local output="$2"
  local curl_args=(
    -L
    --fail
    --silent
    --show-error
    --connect-timeout 20
    --max-time 120
    --retry 3
    --retry-all-errors
    --retry-delay 3
    --retry-max-time 30
  )

  if [[ "$source" == https://yfamilys.com/* ]]; then
    curl_args+=(
      --user-agent "Mozilla/5.0"
      --referer "https://yfamilys.com/surge"
    )
  fi

  curl "${curl_args[@]}" --output "$output" "$source"
}

validate_module() {
  local target="$1"
  local file="$2"
  local mode="$3"
  local expected_category=""
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
  case "$mode" in
    yfamilys-adblock)
      grep -Fqx '#!name=应用广告过滤' "$file"
      grep -q '^#!homepage=https://yfamilys.com$' "$file"
      expected_category="AdBlock"
      required_sections=("URL Rewrite" "Script" "MITM" "Map Local")
      ;;
    biliuniverse-adblock)
      grep -Fqx '#!name=哔哩哔哩广告过滤' "$file"
      grep -Eqi '^#!homepage[[:space:]]*=[[:space:]]*https://ADBlock\.BiliUniverse\.io$' "$file"
      expected_category="AdBlock"
      required_sections=("URL Rewrite" "Script" "MITM" "Map Local")
      ;;
    spotify-enhancement)
      grep -Fqx '#!name=Spotify 功能增强' "$file"
      grep -Fqx '#!desc=2025.06.27 部分解锁premium,音质不能设置为超高(建议登录后再打开脚本,重启app等待脚本生效)' "$file"
      expected_category="Enhancement"
      required_sections=("Header Rewrite" "Script" "MITM")
      ;;
    youtube-enhance-adblock)
      grep -Fqx '#!name=YouTube 广告过滤' "$file"
      grep -Fqx '#!desc=适用于 Youtube & Youtube Music' "$file"
      expected_category="AdBlock"
      required_sections=("Script" "MITM")
      ;;
  esac
  grep -Fqx "#!category=$expected_category" "$file"
  for section in "${required_sections[@]}"; do
    grep -q "^\\[$section\\]$" "$file"
  done
}

sync_module_metadata() {
  local source_file="$1"
  local display_name="$2"
  local category="$3"

  awk -v display_name="$display_name" -v category="$category" '
      /^#!name[[:space:]]*=/ {
        print "#!name=" display_name
        next
      }
      /^#!category[[:space:]]*=/ { next }
      { print }
      /^#!desc[[:space:]]*=/ { print "#!category=" category }
    ' "$source_file"
}

changed=0
preserved=0
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

  printf 'Syncing %s <- %s\n' "$target" "$source"
  raw_file="$tmp_dir/$(basename "$target").upstream"
  tmp_file="$tmp_dir/$(basename "$target")"
  if ! download "$source" "$raw_file"; then
    if [ -s "$target" ]; then
      printf 'Warning: failed to download %s; preserving %s\n' "$source" "$target" >&2
      if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
        printf '::warning file=%s,line=%d::Failed to download %s after retries; preserving the existing %s\n' \
          "$manifest" "$line_no" "$source" "$target"
      fi
      preserved=$((preserved + 1))
      continue
    fi

    printf 'Download failed and no existing module can be preserved: %s\n' "$target" >&2
    exit 1
  fi

  case "$mode" in
    mirror)
      cp "$raw_file" "$tmp_file"
      ;;
    yfamilys-adblock)
      sync_module_metadata "$raw_file" "应用广告过滤" "AdBlock" > "$tmp_file"
      ;;
    biliuniverse-adblock)
      sync_module_metadata "$raw_file" "哔哩哔哩广告过滤" "AdBlock" > "$tmp_file"
      ;;
    spotify-enhancement)
      sync_module_metadata "$raw_file" "Spotify 功能增强" "Enhancement" > "$tmp_file"
      ;;
    youtube-enhance-adblock)
      sync_module_metadata "$raw_file" "YouTube 广告过滤" "AdBlock" > "$tmp_file"
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
printf 'Preserved modules after download failures: %d\n' "$preserved"
