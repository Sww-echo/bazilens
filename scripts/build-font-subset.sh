#!/usr/bin/env bash
# Build a glyph-subset of Source Han Serif SC (or any TTF/OTF) covering only
# the characters actually used by the app — typically reduces a 20MB CJK font
# to 200-500KB.
#
# Usage:
#   scripts/build-font-subset.sh <source-font> [out-dir]
#
# Example:
#   scripts/build-font-subset.sh fonts/SourceHanSerifSC-Regular.otf public/fonts
#
# Requires:
#   python3 + fontTools (pip install fonttools brotli zopfli)
#
# What it does:
#   1. Scrapes a corpus from src/**/*.{ts,tsx,css}, supabase/**/*.{ts,sql},
#      docs/**/*.md, i18n locales JSON — extracts unique unicode code points.
#   2. Adds always-on glyphs: ASCII printable + curly quotes + common punctuation.
#   3. Calls pyftsubset to emit WOFF2 + WOFF (and TTF for fallback if needed).
#   4. Writes <out-dir>/manifest.json with byte sizes + glyph count.
#
# Idempotent — re-running overwrites outputs.

set -euo pipefail

SOURCE_FONT=${1:-}
OUT_DIR=${2:-public/fonts}

if [[ -z "$SOURCE_FONT" ]]; then
  echo "usage: $0 <source-font.otf> [out-dir]" >&2
  exit 1
fi

if [[ ! -f "$SOURCE_FONT" ]]; then
  echo "[skip] source font not found: $SOURCE_FONT" >&2
  echo "       to install: download from https://github.com/adobe-fonts/source-han-serif/releases" >&2
  echo "       and place at $SOURCE_FONT" >&2
  exit 0
fi

if ! python3 -c "import fontTools" 2>/dev/null; then
  echo "[error] fontTools not installed. install with: pip install fonttools brotli zopfli" >&2
  exit 2
fi

BASENAME=$(basename "$SOURCE_FONT")
NAME_NO_EXT="${BASENAME%.*}"

mkdir -p "$OUT_DIR"

echo "[1/4] scanning corpus for unique unicode code points..."
CHARSET_FILE=$(mktemp)
trap 'rm -f "$CHARSET_FILE"' EXIT

# Always-on glyphs: ASCII printable + common Latin punctuation + a few CJK puncts
printf '%s' '!"#$%&'\''()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~ ' > "$CHARSET_FILE"
printf '“”‘’–—… ' >> "$CHARSET_FILE"
printf '、。，：；！？「」『』（）' >> "$CHARSET_FILE"

# Scrape source corpus — anything that survives the project should fit the subset.
find src supabase docs index.html \
  -type f \( \
    -name '*.ts' -o -name '*.tsx' -o -name '*.css' \
    -o -name '*.sql' -o -name '*.md' -o -name '*.html' \
    -o -name '*.json' \
  \) \
  -not -path '*/node_modules/*' \
  -not -path '*/dist/*' \
  2>/dev/null | xargs cat >> "$CHARSET_FILE" || true

# Reduce to unique code points (sorted, deduped). Strip control chars.
UNIQUE_CHARS=$(python3 -c "
import sys
text = open('$CHARSET_FILE', 'rb').read().decode('utf-8', errors='replace')
cps = sorted({ord(c) for c in text if ord(c) >= 0x20 and ord(c) != 0x7f})
sys.stdout.write(''.join(chr(cp) for cp in cps))
")
GLYPH_COUNT=$(printf '%s' "$UNIQUE_CHARS" | python3 -c "import sys; print(len(sys.stdin.read()))")
echo "      → $GLYPH_COUNT unique code points"

echo "[2/4] subsetting WOFF2..."
WOFF2_OUT="$OUT_DIR/${NAME_NO_EXT}.subset.woff2"
python3 -m fontTools.subset "$SOURCE_FONT" \
  --text="$UNIQUE_CHARS" \
  --flavor=woff2 \
  --layout-features='*' \
  --no-hinting \
  --output-file="$WOFF2_OUT"

echo "[3/4] subsetting WOFF..."
WOFF_OUT="$OUT_DIR/${NAME_NO_EXT}.subset.woff"
python3 -m fontTools.subset "$SOURCE_FONT" \
  --text="$UNIQUE_CHARS" \
  --flavor=woff \
  --layout-features='*' \
  --no-hinting \
  --output-file="$WOFF_OUT"

echo "[4/4] writing manifest..."
python3 - <<PY
import json, os
out = '$OUT_DIR/manifest.json'
data = {
  'source_font': '$BASENAME',
  'glyphs': $GLYPH_COUNT,
  'files': {
    'woff2': {
      'path': '/fonts/${NAME_NO_EXT}.subset.woff2',
      'bytes': os.path.getsize('$WOFF2_OUT'),
    },
    'woff': {
      'path': '/fonts/${NAME_NO_EXT}.subset.woff',
      'bytes': os.path.getsize('$WOFF_OUT'),
    },
  },
}
with open(out, 'w') as f:
  json.dump(data, f, indent=2, ensure_ascii=False)
print('  →', out)
PY

ls -lh "$OUT_DIR/${NAME_NO_EXT}".subset.* 2>/dev/null | awk '{print "      ", $9, $5}'
echo "done."
