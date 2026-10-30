# Tile Calculator BD — Test Results

Run #183, 2026-10-30 14:00 slot (Asia/Dhaka). All results real, from this build.

## Unit tests — 39/39 PASS

`node tests/unit.test.js` — pure logic (`js/logic.js`), zero repairs needed.

Hand-verified math:
- 10×12 ft floor, 12×12 in tile (1 sq ft), 10% wastage → 132 tiles, 14 boxes
  (132/10), cost 132 × ৳50 = ৳6,600.00 (660000 paisa).
- 12×9 ft wall − 21 sq ft openings = 87 sq ft net; 12×24 in tile = 2 sq ft;
  87/2 × 1.10 = 47.85 → ceil 48 tiles.
- 3×4 m = 12 m² = 129.17 sq ft; 2×2 ft tile = 4 sq ft; 129.17/4 × 1.10 = 35.52
  → ceil 36 tiles; sqm display 12.00.
- Per-box pricing: 14 boxes × ৳500 = ৳700,000 paisa (৳7,000.00).
- 0% wastage: 120 tiles exact; 87/2 → ceil 44 (no rounding down).
- Money: ৳0.10 → 10 paisa exactly (integer-paisa math, no float drift).

Validation (all asserted):
- Empty name, negative length, wastage 51, perBox 0, perBox 2.5, bad unit
  rejected; wastage 50 allowed; openings ≥ area rejected (net ≤ 0).

Strict import (all asserted):
- Wrong app, wrong version, duplicate ids, invalid row, non-array rooms all
  rejected whole.

Formatting (all asserted):
- ৳6,600.00 in EN; ৳৬,৬০০.০০ and ১৩২ in BN; 129.17 area rounding.

## Headless-Chrome smoke — 21/21 PASS, 0 console errors

`node tests/smoke.js` — raw CDP against /opt/meta-chromium/chrome (file:// page,
Hatch WebGL domain-policy flags, pid-unique profile).

- Title, empty-rooms state, stats start at 0.
- Empty submit → inline error shown.
- Living-room flow → 132 tiles / 14 boxes / ৳6,600.00; totals match.
- Wall flow (12×9 − 21, 12×24 preset) → 48 tiles, net 87.00 sq ft; totals 180.
- Language toggle → Bangla title + Bengali digit totals (১৮০).
- Reload persistence: 2 rooms survive.
- Typed-DELETE erase → 0 rooms, empty state returns.
- 390px viewport: scrollWidth ≤ 390 (no horizontal overflow).
- Zero console errors / page exceptions across the whole run.

## Publishing

- Repo: https://github.com/fahad3235/tile-calculator-bd (PUBLIC, per factory
  public+Pages pattern for static sites)
- Pages: https://fahad3235.github.io/tile-calculator-bd/ (main/root, HTTP 200)
- Push: single snapshot push via `github push-files` (disk adapter); remote
  files verified byte-identical to local, Bengali intact.

## Notes

- No repairs to app logic were needed: both suites passed on first run.
- No network requests: the app is fully static; the smoke run asserts no
  console errors, and the page loads only local css/js files.
