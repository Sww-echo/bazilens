# Bundled assets for report-generate

Drop these files in this folder; they're loaded via `new URL('./assets/...', import.meta.url)` from `pdf-render.tsx` so they end up in the bundled Edge Function.

| File | Source | Build step |
|------|--------|-----------|
| `NotoSansSC-Subset.ttf` | Google Fonts Noto Sans SC subset to ~3000 common Chinese chars + ASCII | Run `scripts/build-font-subset.sh` (CI) |
| `logo.png` *(optional)* | BaziLens logo for cover page | Drop in once design lands |

## Why subset

Full Noto Sans SC is ~17 MB; the Edge Function bundle has tight size limits. A subset of the most-common 3,000 hanzi plus ASCII keeps the file around 800 KB while still rendering all chart-related characters faithfully. If a glyph is missing, react-pdf falls back to a placeholder square — visible bug. Add new chars to `scripts/common-chinese-3000.txt` and rebuild.
