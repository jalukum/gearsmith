# Gearsmith — unofficial For Honor gear-perk builder

Unofficial fan app, not affiliated with Ubisoft. Hero, perk and feat data from the For Honor Info Hub (https://forhonorinfohub.com).
Gear rules from the For Honor Wiki "Perk" page and Ubisoft's "Perks Explained". Perk icons are original. Cinzel font: SIL OFL (src/assets/Cinzel-OFL.txt).

    npm install
    npm run fetch-data   # refresh src/data/game.json from the Info Hub API (+ wiki cross-check)
    npm test             # combo-logic unit tests (vitest)
    npm run build        # static PWA in dist/ (+ generated sw.js)
    node scripts/screenshots.mjs http://127.0.0.1:8070/   # iPhone screenshots -> shots/

## Game icons (v2)

`src/lib/icons.ts` has one switch, `USE_GAME_ICONS` (default `true`). If it is off, or an icon is missing or fails to load, the app shows its original SVG glyphs and faction crests instead.

- Perk icons (21) come from `https://forhonorinfohub.com/perks/<image>.png`, resized to 128 px webp.
- Feat icons (177 unique images, covering all 468 feats) come from `https://forhonorinfohub.com/feats/<image>.png`, resized to 144 px webp.
- Hero icons (39) are official portraits from https://www.ubisoft.com/en-us/game/for-honor/heroes (staticctf.ubisoft.com), cropped to busts automatically. 7 heroes use manual crops (`CROP_OVERRIDE`). Output is 240 px webp.
- `src/data/icons.json` lists the source URL for every file. To refresh: `node scripts/fetch-data.mjs` (it fetches icons too; pass `--no-icons` to skip), or run `node scripts/fetch-icons.mjs` on its own.

**Licensing:** these images are © Ubisoft Entertainment. Info Hub says it uses them with Ubisoft's permission. Ubisoft's Terms of Use (§1.3) allow only personal, non-commercial use of its content. Its Fan Kits (https://www.ubisoft.com/en-us/games/fan-kits) don't include these icons and don't grant an app license. This copy is for personal use only. Before you publish anywhere (App Store, a public site, anything commercial), set `USE_GAME_ICONS = false` or get written permission from Ubisoft (ForHonorCommunity@ubisoft.com).

## Theme

The look is For Honor style: iron and steel plates, bone-colored text, crimson accent, and faction colors. All textures are original: CSS gradients, inline SVG dividers and one 22 KB grain tile (`src/assets/grain.webp`). Fonts are Cinzel and IM Fell English SC, both under the SIL OFL; the license files are in `src/assets/`.
