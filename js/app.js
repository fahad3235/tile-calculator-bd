'use strict';
// Tile Calculator BD — UI glue. Logic lives in js/logic.js, strings in js/i18n.js.
(function () {
  const L = window.TileCalc;
  const STR = window.TileI18n.STR;
  const LS_ROOMS = 'tilecalc_rooms_v1';
  const LS_LANG = 'tilecalc_lang';

  let lang = localStorage.getItem(LS_LANG) || 'en';
  if (lang !== 'en' && lang !== 'bn') lang = 'en';
  let rooms = loadRooms();

  function t(key) { return (STR[lang] && STR[lang][key]) || STR.en[key] || key; }
  function $(id) { return document.getElementById(id); }

  function loadRooms() {
    try {
      const raw = localStorage.getItem(LS_ROOMS);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (L.validateImport({ app: 'tile-calculator-bd', version: 1, rooms: data }).length > 0) return [];
      return data;
    } catch (e) { return []; }
  }
  function saveRooms() {
    localStorage.setItem(LS_ROOMS, JSON.stringify(rooms));
  }

  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    $('appTitle').textContent = t('title');
    $('tagline').textContent = t('tagline');
    $('langBtn').textContent = t('langBtn');
    $('roomName').placeholder = t('roomNamePh');
    // Surface option labels + unit option labels need re-render too.
    $('surfaceSel').options[0].textContent = t('floor');
    $('surfaceSel').options[1].textContent = t('wall');
    $('dimWidLabel').textContent = t($('surfaceSel').value === 'wall' ? 'height' : 'width');
    $('priceMode').options[0].textContent = t('perTile');
    $('priceMode').options[1].textContent = t('perBoxLabel');
    $('tilePreset').options[6].textContent = t('custom');
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    render();
  }

  function unitLabel(u) {
    return { ft: t('ft'), m: t('m'), inch: t('inch'), cm: t('cm') }[u] || u;
  }

  function render() {
    const tot = L.totals(rooms);
    $('statRooms').textContent = lang === 'bn' ? L.toBnDigits(tot.rooms) : String(tot.rooms);
    $('statArea').textContent = L.fmtAreaSqFt(tot.areaSqFt, lang) + ' ' + t('sqft') +
      ' (' + L.fmtSqM(tot.areaSqFt, lang) + ' ' + t('sqm') + ')';
    $('statTiles').textContent = L.fmtNum(tot.tiles, 0, lang);
    $('statBoxes').textContent = L.fmtNum(tot.boxes, 0, lang);
    $('statCost').textContent = L.fmtMoney(tot.costPaisa, lang);

    $('roomsEmpty').hidden = rooms.length > 0;
    const list = $('roomsList');
    list.innerHTML = '';
    rooms.forEach((r) => {
      const res = L.roomResult(r);
      const li = document.createElement('li');
      li.className = 'room';
      const surface = r.surface === 'wall' ? t('wall') : t('floor');
      const dims = L.fmtNum(r.len, 2, lang) + ' × ' + L.fmtNum(r.wid, 2, lang) + ' ' + unitLabel(r.unit);
      const tile = L.fmtNum(r.tileLen, 2, lang) + ' × ' + L.fmtNum(r.tileWid, 2, lang) + ' ' + unitLabel(r.tileUnit);
      li.innerHTML = '<div><h3>' + esc(r.name) + ' — ' + surface + '</h3>' +
        '<p>' + t('area') + ': ' + dims + ' = ' + L.fmtAreaSqFt(res.areaSqFt, lang) + ' ' + t('sqft') +
        (r.openings > 0 ? ' (' + t('netArea') + ': ' + L.fmtAreaSqFt(res.netSqFt, lang) + ' ' + t('sqft') + ')' : '') + '</p>' +
        '<p>' + t('tileSize') + ': ' + tile + ' · ' + t('wastage') + ' ' + L.fmtNum(r.wastage, 0, lang) + '%</p>' +
        '<p class="big">' + L.fmtNum(res.tiles, 0, lang) + ' ' + t('tiles') + ' · ' +
        L.fmtNum(res.boxes, 0, lang) + ' ' + t('boxes') + ' · ' + L.fmtMoney(res.costPaisa, lang) + '</p></div>';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'del';
      btn.textContent = t('delBtn');
      btn.addEventListener('click', () => {
        rooms = rooms.filter((x) => x.id !== r.id);
        saveRooms();
        render();
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showError(keys) {
    const el = $('errorEl');
    if (!keys || keys.length === 0) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = keys.map((k) => t(k)).join(' ');
  }

  function showMsg(text, ok) {
    const el = $('dataMsg');
    el.hidden = false;
    el.textContent = text;
    el.style.color = ok ? '#065f46' : '#b91c1c';
  }

  function readRoomFromForm() {
    const num = (id) => {
      const v = $(id).value.trim();
      return v === '' ? NaN : Number(v);
    };
    return {
      id: 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
      name: $('roomName').value.trim(),
      surface: $('surfaceSel').value,
      len: num('dimLen'),
      wid: num('dimWid'),
      unit: $('dimUnit').value,
      openings: $('openings').value.trim() === '' ? 0 : Number($('openings').value),
      tileLen: num('tileLen'),
      tileWid: num('tileWid'),
      tileUnit: $('tileUnit').value,
      wastage: num('wastage'),
      perBox: Number($('perBox').value),
      priceMode: $('priceMode').value,
      price: num('price')
    };
  }

  function applyPreset() {
    const v = $('tilePreset').value;
    if (v === 'custom') return;
    const parts = v.split('|');
    const dims = parts[0].split('x');
    $('tileLen').value = dims[0];
    $('tileWid').value = dims[1];
    $('tileUnit').value = parts[1];
  }

  $('tilePreset').addEventListener('change', applyPreset);
  $('surfaceSel').addEventListener('change', () => {
    $('dimWidLabel').textContent = t($('surfaceSel').value === 'wall' ? 'height' : 'width');
    $('openingsRow').style.display = $('surfaceSel').value === 'wall' ? '' : 'none';
  });

  $('roomForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const room = readRoomFromForm();
    const errs = L.validateRoom(room);
    if (errs.length > 0) { showError(errs); return; }
    showError([]);
    rooms.push(room);
    saveRooms();
    render();
    $('roomForm').reset();
    $('tilePreset').value = '12x12|inch';
    applyPreset();
    $('wastage').value = '10';
    $('perBox').value = '10';
    $('price').value = '50';
    $('surfaceSel').value = 'floor';
    $('dimWidLabel').textContent = t('width');
    $('openingsRow').style.display = 'none';
  });

  $('langBtn').addEventListener('click', () => {
    lang = lang === 'en' ? 'bn' : 'en';
    localStorage.setItem(LS_LANG, lang);
    applyLang();
  });

  $('exportBtn').addEventListener('click', () => {
    if (rooms.length === 0) { showMsg(t('exportNone'), false); return; }
    const blob = new Blob([JSON.stringify({ app: 'tile-calculator-bd', version: 1, rooms }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tile-calculator-bd.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showMsg(t('importOk'), true);
  });

  $('importFile').addEventListener('change', () => {
    const file = $('importFile').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const errs = L.validateImport(data);
        if (errs.length > 0) { showMsg(t('importBad'), false); return; }
        rooms = data.rooms;
        saveRooms();
        render();
        showMsg(t('importOk'), true);
      } catch (e) {
        showMsg(t('importBad'), false);
      }
      $('importFile').value = '';
    };
    reader.readAsText(file);
  });

  $('eraseBtn').addEventListener('click', () => {
    if ($('eraseInput').value !== 'DELETE') { showMsg(t('eraseWrong'), false); return; }
    rooms = [];
    saveRooms();
    $('eraseInput').value = '';
    render();
    showMsg(t('eraseDone'), true);
  });

  // Init
  $('openingsRow').style.display = 'none';
  applyLang();
})();
