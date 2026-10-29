# Gearsmith — unofficial For Honor gear-perk builder

Unofficial fan app, not affiliated with Ubisoft. Hero, perk and feat data from the For Honor Info Hub (https://forhonorinfohub.com).
Gear rules from the For Honor Wiki "Perk" page and Ubisoft's "Perks Explained". Perk icons are original. Cinzel font: SIL OFL (src/assets/Cinzel-OFL.txt).

    npm install
    npm run fetch-data   # refresh src/data/game.json from the Info Hub API (+ wiki cross-check)
    npm run fetch-patches # refresh src/data/patches.json from Ubisoft's patch notes
    npm test             # combo-logic and patch-note parser tests (vitest)
    npm run build        # static PWA in dist/ (+ generated sw.js)
    node scripts/screenshots.mjs http://127.0.0.1:8070/   # iPhone screenshots -> shots/

## Game icons (v2)

`src/lib/icons.ts` has one switch, `USE_GAME_ICONS` (default `true`). If it is off, or an icon is missing or fails to load, the app shows its original SVG glyphs and faction crests instead.

- Perk icons (21) come from `https://forhonorinfohub.com/perks/<image>.png`, resized to 128 px webp.
- Feat icons (177 unique images, covering all 468 feats) come from `https://forhonorinfohub.com/feats/<image>.png`, resized to 144 px webp.
- Hero icons (39) are official portraits from https://www.ubisoft.com/en-us/game/for-honor/heroes (staticctf.ubisoft.com), cropped to busts automatically. 7 heroes use manual crops (`CROP_OVERRIDE`). Output is 240 px webp.
- `src/data/icons.json` lists the source URL for every file. To refresh: `node scripts/fetch-data.mjs` (it fetches icons too; pass `--no-icons` to skip), or run `node scripts/fetch-icons.mjs` on its own.

**Licensing:** these images are © Ubisoft Entertainment. Info Hub says it uses them with Ubisoft's permission. Ubisoft's Terms of Use (§1.3) allow only personal, non-commercial use of its content. Its Fan Kits (https://www.ubisoft.com/en-us/games/fan-kits) don't include these icons and don't grant an app license. This copy is for personal use only. Before you publish anywhere (App Store, a public site, anything commercial), set `USE_GAME_ICONS = false` or get written permission from Ubisoft (ForHonorCommunity@ubisoft.com).

## Patch notes

The Patch Notes tab shows Ubisoft's official For Honor patch notes (title, date, and the notes themselves), plus a few earlier patches you can open. Each note links to its page on [Ubisoft's For Honor news](https://www.ubisoft.com/en-us/game/for-honor/news-updates).

**Source.** [scripts/fetch-patches.mjs](scripts/fetch-patches.mjs) calls Ubisoft's public Nimbus updates API — the same feed the news site uses — filtered to the For Honor `patch-notes` category (`en-us`). The content key is published in that page; the script reads it on every run (with the last seen key as a fallback). Steam news for app 304390 was not used. Ubisoft stopped posting every patch there, so Steam still ends at 2.67.0 while the site is already on a later version.

**Refresh.** [.github/workflows/patch-notes.yml](.github/workflows/patch-notes.yml) runs daily at 13:17 UTC, and whenever someone starts it by hand (`workflow_dispatch`). It fetches the notes, runs the tests, and — only if `src/data/patches.json` changed — builds, commits to `main`, and deploys GitHub Pages. A failed fetch leaves the previous file in place, so the tab keeps showing the last good copy.

The phone does not call Ubisoft. Nimbus is not open to browser requests from GitHub Pages. The app bundles the JSON and also requests `./patches.json`. The service worker fetches that file from the network first and falls back to the precached copy offline, and a new service worker reloads the open tab once so the new notes actually show up.

**What you need to enable.** The workflow pushes to `main` with the default `GITHUB_TOKEN` and then deploys Pages itself (a token push does not trigger the other deploy workflow). In the repo: Settings → Actions → General → Workflow permissions → **Read and write permissions**. `main` also has to allow that token to push (no rule that blocks Actions from the default branch). No extra secret is required.

## Theme

The look is For Honor style: iron and steel plates, bone-colored text, crimson accent, and faction colors. All textures are original: CSS gradients, inline SVG dividers and one 22 KB grain tile (`src/assets/grain.webp`). Fonts are Cinzel and IM Fell English SC, both under the SIL OFL; the license files are in `src/assets/`.
