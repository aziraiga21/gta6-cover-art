[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/aziraiga21/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/aziraiga21/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Sunset Cover Studio

Built for [make.fun's "Make GTA 6 Cover Art" bounty](https://make.fun/bounty/gta6-cover-art-01) ($250 in USDC). Referral code: `ww3xv51q`.

A multi-panel cover art maker: turn your own photo and a caption into a
striking, GTA-style poster cover — panels, bold outlined lettering and a
sunset or neon colour grade — exported as a PNG to share. Fully original:
no Rockstar logo, artwork, character or font. The caption font is Anton
(SIL Open Font License 1.1, vendored under `app/fonts/` with its licence).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The app is plain static
files under `app/` and works offline — no network requests, no build step.

## Use it

1. **Layout** — pick Hero + 2, Hero + 3, or a 2 × 2 grid.
2. **Photos** — click “Try a sample”, pick a photo for a panel, or drag an
   image file straight onto a panel. Click a panel to select it, drag to pan,
   scroll (or the zoom slider) to zoom. “Use this photo in all panels” fills
   every panel with one photo, each with its own crop.
3. **Caption** — type the caption (max 40 chars) and an optional sub-caption,
   choose top or bottom, and set the size.
4. **Colour grade** — Vice Sunset, Neon Nights, Palm Noir or Daylight, with
   a strength slider and an optional comic-poster (posterize) look.
5. **Export size** — 1080 × 1080, 1080 × 1350 or 1920 × 1080, then
   **Export PNG**. The live preview is always the exact cover that exports.

## Screenshots

`?shot=cover&photo=pier&caption=...&size=1920x1080&layout=...&grade=...`
renders a cover full-bleed for a deterministic screenshot;
`?shot=editor&photo=boulevard` renders the editor with a photo loaded.
The shot list lives in `shots.json`.

## Files

- `app/index.html`, `app/style.css` — page and editor styling
- `app/src/main.js` — editor wiring (controls, drag/zoom/drop, export)
- `app/src/cover.js` — layouts, panel drawing, caption lettering
- `app/src/grades.js` — colour grade presets and the posterize pass
- `app/src/shots.js` — deterministic `?shot=` scenes
- `app/fonts/Anton-Regular.ttf` (+ `OFL.txt`) — Anton, SIL OFL 1.1
- `app/samples/` — two sample photos made with an image model for make.fun
- `main.ts` — hands the entry in (copies `app/` + `screenshots/`, writes `dossier.json`)
