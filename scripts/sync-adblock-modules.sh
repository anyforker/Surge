#!/usr/bin/env bash
set -euo pipefail

manifest="${MANIFEST:-scripts/adblock-module-sources.tsv}"
repo_raw="https://raw.githubusercontent.com/anyforker/Surge/main"
script_dir="module/script/adblock"
resource_dir="module/resource/adblock"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

module_stage="$tmp_dir/modules"
script_stage="$tmp_dir/scripts"
resource_stage="$tmp_dir/resources"
source_map="$tmp_dir/SOURCES.tsv"
expected_scripts="$tmp_dir/expected-scripts.txt"
expected_resources="$tmp_dir/expected-resources.txt"
mkdir -p "$module_stage" "$script_stage" "$resource_stage"
printf '# target\tsource\n' > "$source_map"

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
  curl -L --fail --silent --show-error \
    --retry 3 --retry-delay 2 --connect-timeout 15 --max-time 120 "$1"
}

slug_for_url() {
  local url="$1"
  local clean_url filename stem slug hash

  clean_url="${url%%\?*}"
  filename="${clean_url##*/}"
  stem="${filename%.*}"
  if [ -z "$stem" ] || [ "$stem" = "$filename" ]; then
    stem="script"
  fi
  slug="$(
    printf '%s' "$stem" \
      | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' \
      | tr '[:upper:]' '[:lower:]' \
      | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
  )"
  [ -n "$slug" ] || slug="script"
  hash="$(printf '%s' "$url" | git hash-object --stdin | cut -c1-10)"
  printf '%s-%s' "$slug" "$hash"
}

rewrite_url() {
  local file="$1"
  local source_url="$2"
  local target_url="$3"

  SOURCE_URL="$source_url" TARGET_URL="$target_url" \
    perl -0pi -e 's/\Q$ENV{SOURCE_URL}\E/$ENV{TARGET_URL}/g' "$file"
}

stage_script() {
  local url="$1"
  local slug target tmp_file

  slug="$(slug_for_url "$url")"
  target="$script_dir/$slug.js"
  tmp_file="$script_stage/$slug.js"
  if [ ! -f "$tmp_file" ]; then
    download "$url" > "$tmp_file"
    [ -s "$tmp_file" ] || { echo "Downloaded empty script: $url" >&2; exit 1; }
  fi
  printf '%s\n' "$target" >> "$expected_scripts"
  printf '%s\t%s\n' "$target" "$url" >> "$source_map"
  printf '%s' "$target"
}

stage_resource() {
  local url="$1"
  local clean_url filename extension slug target tmp_file

  clean_url="${url%%\?*}"
  filename="${clean_url##*/}"
  extension="${filename##*.}"
  case "$(printf '%s' "$extension" | tr '[:upper:]' '[:lower:]')" in
    txt|json|gif|png|jpg|jpeg|webp)
      extension="$(printf '%s' "$extension" | tr '[:upper:]' '[:lower:]')"
      ;;
    *)
      extension="dat"
      ;;
  esac
  slug="$(slug_for_url "$url")"
  target="$resource_dir/$slug.$extension"
  tmp_file="$resource_stage/$slug.$extension"
  if [ ! -f "$tmp_file" ]; then
    download "$url" > "$tmp_file"
    [ -s "$tmp_file" ] || { echo "Downloaded empty resource: $url" >&2; exit 1; }
  fi
  printf '%s\n' "$target" >> "$expected_resources"
  printf '%s\t%s\n' "$target" "$url" >> "$source_map"
  printf '%s' "$target"
}

bump_patch_version() {
  local version="$1"

  if [[ "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    printf '%d.%d.%d' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "$((BASH_REMATCH[3] + 1))"
  else
    printf '1.0.0'
  fi
}

finalize_module() {
  local candidate="$1"
  local target="$2"
  local final_file="$3"
  local current_date old_date old_version next_version compare_file

  current_date="$(date +%F)"
  if [ ! -f "$target" ]; then
    sed -e "s/__SYNC_DATE__/$current_date/" -e 's/__SYNC_VERSION__/1.0.0/' \
      "$candidate" > "$final_file"
    return
  fi

  old_date="$(sed -n 's/^#!date=//p' "$target" | head -1)"
  old_version="$(sed -n 's/^#!version=//p' "$target" | head -1)"
  [ -n "$old_date" ] || old_date="$current_date"
  [ -n "$old_version" ] || old_version="0.0.0"
  compare_file="$tmp_dir/compare-$(basename "$target")"
  sed -e "s/__SYNC_DATE__/$old_date/" -e "s/__SYNC_VERSION__/$old_version/" \
    "$candidate" > "$compare_file"

  if cmp -s "$compare_file" "$target"; then
    cp "$compare_file" "$final_file"
    return
  fi

  next_version="$(bump_patch_version "$old_version")"
  sed -e "s/__SYNC_DATE__/$current_date/" -e "s/__SYNC_VERSION__/$next_version/" \
    "$candidate" > "$final_file"
}

line_no=0
while IFS=$'\t' read -r target source module_name description author homepage extra; do
  line_no=$((line_no + 1))
  if [ -z "${target:-}" ] || [[ "$target" == \#* ]]; then
    continue
  fi
  if [[ "$target" != module/*.sgmodule ]] || [[ "$source" != https://* ]] \
    || [ -z "${module_name:-}" ] || [ -z "${description:-}" ] \
    || [ -z "${author:-}" ] || [[ "$homepage" != https://* ]] || [ -n "${extra:-}" ]; then
    echo "Invalid manifest row at line $line_no" >&2
    exit 1
  fi

  raw_file="$tmp_dir/raw-$(basename "$target")"
  body_file="$tmp_dir/body-$(basename "$target")"
  candidate="$tmp_dir/candidate-$(basename "$target")"
  final_file="$module_stage/$(basename "$target")"
  download "$source" \
    | perl -0pe 's/^\xEF\xBB\xBF//; s/\r\n?/\n/g' > "$raw_file"
  [ -s "$raw_file" ] || { echo "Downloaded empty module: $source" >&2; exit 1; }

  perl -ne 'print unless /^#!\s*(name|desc|category|author|homepage|date|version)\s*=/i' \
    "$raw_file" \
    | awk 'BEGIN { leading=1 } leading && /^$/ { next } { leading=0; print }' \
    > "$body_file"

  {
    printf '#!name=%s\n' "$module_name"
    printf '#!desc=%s\n' "$description"
    printf '#!category=AdBlock\n'
    printf '#!author=%s\n' "$author"
    printf '#!homepage=%s\n' "$homepage"
    printf '#!date=__SYNC_DATE__\n'
    printf '#!version=__SYNC_VERSION__\n'
    if [ "$(basename "$target")" = "youtube-adblock.sgmodule" ]; then
      printf '#!arguments=脚本执行引擎:auto,歌词翻译语言:off,字幕翻译语言:off,屏蔽上传按钮:true,屏蔽选段按钮:true,启用调试模式:false\n'
      printf '#!arguments-desc=脚本执行引擎: auto、jsc 或 webview\\n歌词/字幕翻译语言: Google Translate 语言代码，off 为关闭\\n屏蔽按钮与调试模式: true 或 false\n'
    fi
    printf '\n'
    cat "$body_file"
  } > "$candidate"

  if [ "$(basename "$target")" = "weibo-lite-adblock.sgmodule" ]; then
    perl -0pi -e 's/\^ttps\?:/\^https?:/g' "$candidate"
  fi

  while IFS= read -r url; do
    [ -n "$url" ] || continue
    local_target="$(stage_script "$url")"
    rewrite_url "$candidate" "$url" "$repo_raw/$local_target"
  done < <(rg -o --pcre2 'script-path\s*=\s*\Khttps?://[^,[:space:]]+' "$candidate" | sort -u)

  while IFS= read -r url; do
    [ -n "$url" ] || continue
    local_target="$(stage_resource "$url")"
    rewrite_url "$candidate" "$url" "$repo_raw/$local_target"
  done < <(rg -o --pcre2 'data\s*=\s*"\Khttps?://[^"]+' "$candidate" | sort -u)

  finalize_module "$candidate" "$target" "$final_file"
done < "$manifest"

sort -u -o "$expected_scripts" "$expected_scripts"
sort -u -o "$expected_resources" "$expected_resources"
{
  head -1 "$source_map"
  tail -n +2 "$source_map" | sort -u
} > "$tmp_dir/SOURCES.sorted.tsv"

mkdir -p "$script_dir" "$resource_dir"
for staged in "$script_stage"/*.js; do
  [ -e "$staged" ] || continue
  target="$script_dir/$(basename "$staged")"
  if [ ! -f "$target" ] || ! cmp -s "$staged" "$target"; then
    cp "$staged" "$target"
  fi
done
for staged in "$resource_stage"/*; do
  [ -e "$staged" ] || continue
  target="$resource_dir/$(basename "$staged")"
  if [ ! -f "$target" ] || ! cmp -s "$staged" "$target"; then
    cp "$staged" "$target"
  fi
done
for staged in "$module_stage"/*.sgmodule; do
  target="module/$(basename "$staged")"
  if [ ! -f "$target" ] || ! cmp -s "$staged" "$target"; then
    cp "$staged" "$target"
  fi
done

while IFS= read -r current_file; do
  if ! grep -Fxq -- "$current_file" "$expected_scripts"; then
    rm -f "$current_file"
  fi
done < <(find "$script_dir" -maxdepth 1 -type f -name '*.js' | sort)
while IFS= read -r current_file; do
  if ! grep -Fxq -- "$current_file" "$expected_resources"; then
    rm -f "$current_file"
  fi
done < <(find "$resource_dir" -maxdepth 1 -type f ! -name 'SOURCES.tsv' | sort)

cp "$tmp_dir/SOURCES.sorted.tsv" "$script_dir/SOURCES.tsv"
printf 'Managed modules: %s\n' "$(find "$module_stage" -type f -name '*.sgmodule' | wc -l | tr -d ' ')"
printf 'Mirrored scripts: %s\n' "$(wc -l < "$expected_scripts" | tr -d ' ')"
printf 'Mirrored resources: %s\n' "$(wc -l < "$expected_resources" | tr -d ' ')"
