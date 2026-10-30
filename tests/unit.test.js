'use strict';
// Tile Calculator BD — node unit tests. Run: node tests/unit.test.js
const L = require('../js/logic.js');

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('ok - ' + name); }
  else { failed++; console.log('FAIL - ' + name + (extra ? ' :: ' + extra : '')); }
}
function close(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-9); }

const base = {
  id: 'r1', name: 'Living room', surface: 'floor',
  len: 10, wid: 12, unit: 'ft', openings: 0,
  tileLen: 12, tileWid: 12, tileUnit: 'inch',
  wastage: 10, perBox: 10, priceMode: 'tile', price: 50
};

// Hand-verified case 1: 10x12 ft floor, 12x12in tile, 10% wastage, box of 10, ৳50/tile
let r = L.roomResult(base);
check('10x12 ft area = 120 sq ft', close(r.areaSqFt, 120), String(r.areaSqFt));
check('12x12in tile = 1 sq ft', close(r.tileSqFt, 1), String(r.tileSqFt));
check('120 tiles +10% -> 132', r.tiles === 132, String(r.tiles));
check('132 tiles / box 10 -> 14 boxes', r.boxes === 14, String(r.boxes));
check('132 x ৳50 = ৳6600 (660000 paisa)', r.costPaisa === 660000, String(r.costPaisa));

// Hand-verified case 2: wall 12x9 ft minus 21 sq ft openings, 12x24in tile
const wall = Object.assign({}, base, { name: 'Wall', surface: 'wall', len: 12, wid: 9, openings: 21, tileLen: 12, tileWid: 24, price: 0 });
r = L.roomResult(wall);
check('wall gross 108, net 87 sq ft', close(r.netSqFt, 87), String(r.netSqFt));
check('12x24in tile = 2 sq ft', close(r.tileSqFt, 2), String(r.tileSqFt));
check('87/2 x1.10 = 47.85 -> 48 tiles', r.tiles === 48, String(r.tiles));

// Hand-verified case 3: metric 3m x 4m, 2x2 ft tile, 10% wastage
const metric = Object.assign({}, base, { len: 3, wid: 4, unit: 'm', tileLen: 2, tileWid: 2, tileUnit: 'ft' });
r = L.roomResult(metric);
check('3x4 m = 129.17 sq ft (2dp)', close(r.areaSqFt, 129.1668, 0.001), String(r.areaSqFt));
check('metric tiles -> 36', r.tiles === 36, String(r.tiles));
check('metric sqm = 12.00', L.fmtSqM(r.areaSqFt, 'en') === '12.00', L.fmtSqM(r.areaSqFt, 'en'));

// Per-box pricing: 14 boxes x ৳500 = ৳7000
const perBox = Object.assign({}, base, { priceMode: 'box', price: 500 });
r = L.roomResult(perBox);
check('per-box cost 14 x 500 = 700000 paisa', r.costPaisa === 700000, String(r.costPaisa));

// Zero wastage: exact division stays exact
check('0% wastage 120 tiles', L.tilesNeeded(120, 1, 0) === 120);
check('0% wastage 87/2 -> ceil 44', L.tilesNeeded(87, 2, 0) === 44);
check('boxes ceil 131/10 -> 14', L.boxesNeeded(131, 10) === 14);
check('bdt 50 -> 5000 paisa', L.bdtToPaisa(50) === 5000);
check('bdt 0.1 -> 10 paisa (no float drift)', L.bdtToPaisa(0.1) === 10);

// Totals across two rooms
const t = L.totals([base, wall]);
check('totals tiles 132+48=180', t.tiles === 180, String(t.tiles));
check('totals rooms 2', t.rooms === 2);

// Validation
check('valid room passes', L.validateRoom(base).length === 0);
check('empty name rejected', L.validateRoom(Object.assign({}, base, { name: '  ' })).indexOf('errName') >= 0);
check('negative length rejected', L.validateRoom(Object.assign({}, base, { len: -3 })).indexOf('errLen') >= 0);
check('wastage 51 rejected', L.validateRoom(Object.assign({}, base, { wastage: 51 })).indexOf('errWastage') >= 0);
check('wastage 50 allowed', L.validateRoom(Object.assign({}, base, { wastage: 50 })).length === 0);
check('perBox 0 rejected', L.validateRoom(Object.assign({}, base, { perBox: 0 })).indexOf('errPerBox') >= 0);
check('perBox 2.5 rejected', L.validateRoom(Object.assign({}, base, { perBox: 2.5 })).indexOf('errPerBox') >= 0);
check('openings > area rejected', L.validateRoom(Object.assign({}, base, { openings: 121 })).indexOf('errOpeningsTooBig') >= 0);
check('openings == area rejected (net 0)', L.validateRoom(Object.assign({}, base, { openings: 120 })).indexOf('errOpeningsTooBig') >= 0);
check('bad unit rejected', L.validateRoom(Object.assign({}, base, { unit: 'yard' })).indexOf('errUnit') >= 0);

// Strict import
const good = { app: 'tile-calculator-bd', version: 1, rooms: [base] };
check('good import passes', L.validateImport(good).length === 0);
check('wrong app rejected', L.validateImport({ app: 'other', version: 1, rooms: [] }).indexOf('errImportApp') >= 0);
check('wrong version rejected', L.validateImport({ app: 'tile-calculator-bd', version: 2, rooms: [] }).indexOf('errImportApp') >= 0);
check('dup id rejected', L.validateImport({ app: 'tile-calculator-bd', version: 1, rooms: [base, base] }).indexOf('errImportDup') >= 0);
check('invalid row rejected', L.validateImport({ app: 'tile-calculator-bd', version: 1, rooms: [Object.assign({}, base, { len: -1 })] }).indexOf('errImportRow') >= 0);
check('non-array rooms rejected', L.validateImport({ app: 'tile-calculator-bd', version: 1, rooms: {} }).indexOf('errImportShape') >= 0);

// Formatting
check('fmtMoney 660000 -> ৳6,600.00', L.fmtMoney(660000, 'en') === '৳6,600.00', L.fmtMoney(660000, 'en'));
check('fmtMoney bn digits', L.fmtMoney(660000, 'bn') === '৳৬,৬০০.০০', L.fmtMoney(660000, 'bn'));
check('fmtNum bn digits', L.fmtNum(132, 0, 'bn') === '১৩২', L.fmtNum(132, 0, 'bn'));
check('fmtArea 2dp', L.fmtAreaSqFt(129.1668, 'en') === '129.17', L.fmtAreaSqFt(129.1668, 'en'));

console.log('\n' + passed + ' passed, ' + failed + ' failed.');
process.exit(failed === 0 ? 0 : 1);
