# Tile Calculator BD 🧱

Offline bilingual (English / বাংলা) floor & wall tile estimator for Bangladeshi homes.
Add rooms, and it computes area, tiles needed (with wastage), boxes needed, and cost —
before you buy a single tile.

**Factory run #182 — MUSE Project Factory Ω, 2026-10-30 14:00 slot (Asia/Dhaka).**
Live: https://fahad3235.github.io/tile-calculator-bd/

## Problem

Buying tiles in Bangladesh is guesswork: shopkeepers quote per box, rooms are in
feet, tiles are sold in inches, and nobody accounts for cutting waste — so people
buy too few tiles (and the batch shade differs on the second trip) or too many.

## Features

1. **Room estimator** — floor or wall rooms with length × width/height in feet,
   metres, inches, or cm.
2. **Openings deduction** — subtract doors + windows area on wall rooms.
3. **Tile presets + custom sizes** — 12×12, 16×16, 24×24, 12×24 inch, 2×1 ft,
   60×60 cm, or any custom size.
4. **Wastage allowance** — 0–50% (10% default) for cuts and breakage; tiles are
   always rounded UP, never down.
5. **Boxes + cost** — tiles per box and price per tile *or* per box, in integer
   paisa (no float drift).
6. **Project totals** — rooms, total area (sq ft + m²), tiles, boxes, cost.
7. **Data portability** — JSON export, strict import validation (a bad file is
   rejected whole, your rooms stay intact), typed-DELETE erase-all.
8. **Bilingual UI** — EN / বাংলা toggle, persisted, with Bengali digits.
9. **Offline + mobile** — zero network requests, localStorage only, 390px layout
   with no horizontal overflow.

## Math (all in `js/logic.js`, unit-tested)

- Lengths convert to feet: ft ×1, m ×3.28084, inch ×1/12, cm ×0.0328084.
- Area (sq ft) = length(ft) × width(ft); wall net area subtracts openings.
- Tiles = ceil(net area / tile area × (1 + wastage/100)).
- Boxes = ceil(tiles / tiles-per-box).
- Cost = tiles × price (per-tile mode) or boxes × price (per-box mode), in paisa.

Hand-verified cases (see `TEST_RESULTS.md`):

| Case | Result |
|---|---|
| 10×12 ft floor, 12×12 in tile, 10% wastage, box of 10, ৳50/tile | 132 tiles, 14 boxes, ৳6,600.00 |
| 12×9 ft wall − 21 sq ft openings, 12×24 in tile, 10% wastage | 48 tiles (net 87 sq ft) |
| 3×4 m room, 2×2 ft tile, 10% wastage | 36 tiles (129.17 sq ft / 12.00 m²) |

## Stack

Vanilla HTML + CSS + JavaScript. No build step, no dependencies, no backend.
Pure logic in `js/logic.js` runs unchanged in Node tests and in the browser.

## Run locally

```bash
# just open it
open index.html
# or serve it
python3 -m http.server 8000
```

## Tests

```bash
node tests/unit.test.js   # 39 checks: math, validation, import, formatting
node tests/smoke.js       # 21 headless-Chrome checks via raw CDP
```

## Limitations

- Estimates only: measure twice before ordering. Tile coverage assumes
  rectangular rooms and rectangular tiles; L-shaped rooms should be split into
  two rectangles.
- Prices are your own inputs, not market rates — there is no official tile
  price list in Bangladesh, so no prices are shipped.
- Skirting tiles, adhesive, and labour are not estimated.

## Status

MVP complete. Personal offline tool — not affiliated with any tile brand or shop.
