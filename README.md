# Sunset Cover Studio

[![Make GTA 6 Cover Art competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Live entry rank](https://make.fun/badge/gta6-cover-art-01/aziraiga21/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Live entry reward](https://make.fun/badge/gta6-cover-art-01/aziraiga21/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photos into a neon-sunset poster. Pick a layout, crop each panel independently, set the color grade, and add outlined lettering. Export a landscape, portrait, or square PNG.

Run `node serve.ts` with Node 22 and open `http://localhost:8080`. The editor uses local static assets and system fonts. Photos you upload stay in the browser.

The queries in `shots.json` open reproducible editor and full-bleed cover scenes. To package the files and dossier locally, run:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
