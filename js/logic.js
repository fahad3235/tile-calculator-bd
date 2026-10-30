'use strict';
// Tile Calculator BD — pure logic (DOM-free, runs unchanged in Node tests).
(function (root) {
  const FT_PER = { ft: 1, m: 3.28084, inch: 1 / 12, cm: 0.0328084 };
  const TILE_UNITS = ['inch', 'ft', 'cm'];
  const ROOM_UNITS = ['ft', 'm', 'inch', 'cm'];
  const SQFT_PER_SQM = 10.7639;
  const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

  function toFeet(value, unit) {
    if (!(unit in FT_PER)) throw new Error('bad unit: ' + unit);
    return value * FT_PER[unit];
  }

  // Room area in square feet. Floor: length x width. Wall: length x height.
  function areaSqFt(len, wid, unit) {
    return toFeet(len, unit) * toFeet(wid, unit);
  }

  function netAreaSqFt(area, openingsSqFt) {
    return area - (openingsSqFt || 0);
  }

  function tileAreaSqFt(tLen, tWid, tUnit) {
    return toFeet(tLen, tUnit) * toFeet(tWid, tUnit);
  }

  // Tiles, rounded UP after wastage is added (never round down: a half tile
  // still has to be bought).
  function tilesNeeded(netArea, tileArea, wastagePct) {
    if (tileArea <= 0) throw new Error('tile area must be positive');
    return Math.ceil((netArea / tileArea) * (1 + wastagePct / 100));
  }

  function boxesNeeded(tiles, perBox) {
    if (perBox < 1) throw new Error('perBox must be >= 1');
    return Math.ceil(tiles / perBox);
  }

  // Money is integer paisa throughout (no float drift).
  function bdtToPaisa(bdt) {
    return Math.round(bdt * 100);
  }

  function roomResult(room) {
    const area = areaSqFt(room.len, room.wid, room.unit);
    const net = netAreaSqFt(area, room.openings || 0);
    const tArea = tileAreaSqFt(room.tileLen, room.tileWid, room.tileUnit);
    const tiles = tilesNeeded(net, tArea, room.wastage);
    const boxes = boxesNeeded(tiles, room.perBox);
    const pricePaisa = bdtToPaisa(room.price);
    const costPaisa = room.priceMode === 'box' ? boxes * pricePaisa : tiles * pricePaisa;
    return { areaSqFt: area, netSqFt: net, tileSqFt: tArea, tiles, boxes, costPaisa };
  }

  function totals(rooms) {
    const t = { rooms: rooms.length, areaSqFt: 0, tiles: 0, boxes: 0, costPaisa: 0 };
    rooms.forEach((r) => {
      const res = roomResult(r);
      t.areaSqFt += res.netSqFt;
      t.tiles += res.tiles;
      t.boxes += res.boxes;
      t.costPaisa += res.costPaisa;
    });
    return t;
  }

  function isPosNum(v) {
    return typeof v === 'number' && isFinite(v) && v > 0;
  }

  // Returns a list of error keys (empty = valid).
  function validateRoom(r) {
    const errs = [];
    if (!r || typeof r !== 'object') return ['errRoom'];
    if (!r.name || !String(r.name).trim()) errs.push('errName');
    if (r.surface !== 'floor' && r.surface !== 'wall') errs.push('errSurface');
    if (!isPosNum(r.len) || r.len > 1000) errs.push('errLen');
    if (!isPosNum(r.wid) || r.wid > 1000) errs.push('errWid');
    if (ROOM_UNITS.indexOf(r.unit) < 0) errs.push('errUnit');
    if (typeof r.openings !== 'number' || !isFinite(r.openings) || r.openings < 0) errs.push('errOpenings');
    if (!isPosNum(r.tileLen) || r.tileLen > 1000) errs.push('errTileLen');
    if (!isPosNum(r.tileWid) || r.tileWid > 1000) errs.push('errTileWid');
    if (TILE_UNITS.indexOf(r.tileUnit) < 0) errs.push('errTileUnit');
    if (typeof r.wastage !== 'number' || !isFinite(r.wastage) || r.wastage < 0 || r.wastage > 50) errs.push('errWastage');
    if (!Number.isInteger(r.perBox) || r.perBox < 1 || r.perBox > 10000) errs.push('errPerBox');
    if (r.priceMode !== 'tile' && r.priceMode !== 'box') errs.push('errPriceMode');
    if (typeof r.price !== 'number' || !isFinite(r.price) || r.price < 0 || r.price > 100000000) errs.push('errPrice');
    if (errs.length === 0) {
      const net = netAreaSqFt(areaSqFt(r.len, r.wid, r.unit), r.openings);
      if (net <= 0) errs.push('errOpeningsTooBig');
    }
    return errs;
  }

  // Strict import: wrong app/version, non-array, duplicate id, or any invalid
  // room rejects the whole file (existing data stays intact).
  function validateImport(data) {
    if (!data || typeof data !== 'object') return ['errImportShape'];
    if (data.app !== 'tile-calculator-bd' || data.version !== 1) return ['errImportApp'];
    if (!Array.isArray(data.rooms)) return ['errImportShape'];
    if (data.rooms.length > 200) return ['errImportShape'];
    const ids = new Set();
    for (const r of data.rooms) {
      if (!r || typeof r.id !== 'string' || !r.id) return ['errImportRow'];
      if (ids.has(r.id)) return ['errImportDup'];
      ids.add(r.id);
      if (validateRoom(r).length > 0) return ['errImportRow'];
    }
    return [];
  }

  function toBnDigits(str) {
    return String(str).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
  }

  function groupThousands(intPart) {
    return String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // n: number, decimals: fixed decimals. lang 'bn' renders Bengali digits.
  function fmtNum(n, decimals, lang) {
    const fixed = Number(n).toFixed(decimals);
    const parts = fixed.split('.');
    let out = groupThousands(parts[0]);
    if (parts.length > 1) out += '.' + parts[1];
    if (n < 0) out = '-' + out.replace('-', '');
    return lang === 'bn' ? toBnDigits(out) : out;
  }

  function fmtMoney(paisa, lang) {
    const sign = paisa < 0 ? '-' : '';
    const abs = Math.abs(paisa);
    const whole = Math.floor(abs / 100);
    const frac = String(abs % 100).padStart(2, '0');
    const out = '৳' + sign + groupThousands(whole) + '.' + frac;
    return lang === 'bn' ? toBnDigits(out) : out;
  }

  function fmtAreaSqFt(sqft, lang) {
    return fmtNum(sqft, 2, lang);
  }

  function fmtSqM(sqft, lang) {
    return fmtNum(sqft / SQFT_PER_SQM, 2, lang);
  }

  const api = {
    FT_PER, ROOM_UNITS, TILE_UNITS,
    toFeet, areaSqFt, netAreaSqFt, tileAreaSqFt,
    tilesNeeded, boxesNeeded, bdtToPaisa,
    roomResult, totals, validateRoom, validateImport,
    toBnDigits, fmtNum, fmtMoney, fmtAreaSqFt, fmtSqM
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TileCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
