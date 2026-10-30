// Tile Calculator BD — headless-Chrome smoke tests via raw CDP.
// Run: node tests/smoke.js   (spawns /opt/meta-chromium/chrome, file:// page)
'use strict';
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PORT = 9341;
const PAGE = 'file://' + path.resolve(__dirname, '..', 'index.html');

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('ok - ' + name); }
  else { failed++; console.log('FAIL - ' + name + (extra ? ' :: ' + extra : '')); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      const list = await res.json();
      const page = list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('chrome debugger endpoint never came up');
}

async function main() {
  const policyPath = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
  const policySha = crypto.createHash('sha256').update(fs.readFileSync(policyPath)).digest('hex');
  const profile = '/tmp/tile-calc-smoke-profile-' + process.pid;
  const chrome = spawn('/opt/meta-chromium/chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--no-first-run',
    '--user-data-dir=' + profile,
    '--hatch-webgl-allowed-domains-file=' + policyPath,
    '--hatch-webgl-allowed-domains-sha256=' + policySha,
    PAGE
  ], { stdio: 'ignore' });
  const errors = [];
  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let seq = 0;
    const pending = new Map();
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pending.has(data.id)) {
        const { resolve } = pending.get(data.id);
        pending.delete(data.id);
        resolve(data);
      }
      if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
        errors.push('console.error: ' + JSON.stringify(data.params.args));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        errors.push('exception: ' + (data.params.exceptionDetails.exception.description || 'unknown'));
      }
    };
    function send(method, params) {
      return new Promise((resolve) => {
        const id = ++seq;
        pending.set(id, { resolve });
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });
    }
    const evaluate = async (expr) => {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      if (res.error) return { error: JSON.stringify(res.error) };
      const inner = res.result ? res.result.result : undefined;
      if (!inner) return { error: 'no result: ' + JSON.stringify(res).slice(0, 200) };
      if (inner.subtype === 'error') return { error: inner.description };
      return { value: inner.value };
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(1200);

    let r = await evaluate('document.title');
    check('page title is Tile Calculator BD', r.value === 'Tile Calculator BD', JSON.stringify(r));
    r = await evaluate('document.getElementById("roomsEmpty").hidden === false');
    check('empty rooms state shown initially', r.value === true, JSON.stringify(r));
    r = await evaluate('document.getElementById("statRooms").textContent');
    check('stats start at 0 rooms', r.value === '0', JSON.stringify(r));

    // Empty submit -> inline error
    await evaluate('document.getElementById("addBtn").click()');
    await sleep(200);
    r = await evaluate('document.getElementById("errorEl").hidden === false && document.getElementById("errorEl").textContent.length > 0');
    check('empty submit shows inline error', r.value === true, JSON.stringify(r));

    // Room 1: Living room floor 10x12 ft, 12x12in tile, 10% wastage, box 10, ৳50/tile
    await evaluate('document.getElementById("roomName").value = "Living room"; document.getElementById("dimLen").value = "10"; document.getElementById("dimWid").value = "12"; document.getElementById("tileLen").value = "12"; document.getElementById("tileWid").value = "12"; document.getElementById("wastage").value = "10"; document.getElementById("perBox").value = "10"; document.getElementById("price").value = "50"; document.getElementById("addBtn").click()');
    await sleep(300);
    r = await evaluate('document.querySelectorAll("#roomsList li").length');
    check('room added to list', r.value === 1, JSON.stringify(r));
    r = await evaluate('document.querySelector("#roomsList li").textContent');
    check('room shows 132 tiles', (r.value || '').indexOf('132') >= 0, JSON.stringify(r));
    check('room shows 14 boxes', (r.value || '').indexOf('14') >= 0, JSON.stringify(r));
    check('room shows cost ৳6,600.00', (r.value || '').indexOf('6,600.00') >= 0, JSON.stringify(r));
    r = await evaluate('document.getElementById("statTiles").textContent');
    check('totals tiles = 132', r.value === '132', JSON.stringify(r));
    r = await evaluate('document.getElementById("statCost").textContent');
    check('totals cost = ৳6,600.00', (r.value || '').indexOf('6,600.00') >= 0, JSON.stringify(r));

    // Room 2: wall 12x9 ft minus 21 openings, 12x24in tile -> 48 tiles
    await evaluate('document.getElementById("roomName").value = "Bedroom wall"; document.getElementById("surfaceSel").value = "wall"; document.getElementById("surfaceSel").dispatchEvent(new Event("change")); document.getElementById("dimLen").value = "12"; document.getElementById("dimWid").value = "9"; document.getElementById("openings").value = "21"; document.getElementById("tilePreset").value = "12x24|inch"; document.getElementById("tilePreset").dispatchEvent(new Event("change")); document.getElementById("wastage").value = "10"; document.getElementById("perBox").value = "10"; document.getElementById("price").value = "0"; document.getElementById("addBtn").click()');
    await sleep(300);
    r = await evaluate('document.querySelectorAll("#roomsList li").length');
    check('second room added', r.value === 2, JSON.stringify(r));
    r = await evaluate('document.querySelectorAll("#roomsList li")[1].textContent');
    check('wall room shows 48 tiles', (r.value || '').indexOf('48') >= 0, JSON.stringify(r));
    check('wall room shows net 87.00 sq ft', (r.value || '').indexOf('87.00') >= 0, JSON.stringify(r));
    r = await evaluate('document.getElementById("statTiles").textContent');
    check('totals tiles = 180', r.value === '180', JSON.stringify(r));

    // Language toggle -> Bangla title + Bengali digits
    await evaluate('document.getElementById("langBtn").click()');
    await sleep(300);
    r = await evaluate('document.querySelector("h1").textContent');
    check('lang toggle switches title to Bangla', /[\u0985-\u09b9]/.test(r.value || ''), JSON.stringify(r));
    r = await evaluate('document.getElementById("statTiles").textContent');
    check('Bengali digits in totals (১৮০)', r.value === '১৮০', JSON.stringify(r));

    // Reload persistence
    await send('Page.reload');
    await sleep(1200);
    r = await evaluate('document.querySelectorAll("#roomsList li").length');
    check('rooms survive reload', r.value === 2, JSON.stringify(r));

    // Typed-DELETE erase
    await evaluate('document.getElementById("eraseInput").value = "DELETE"; document.getElementById("eraseBtn").click()');
    await sleep(300);
    r = await evaluate('document.querySelectorAll("#roomsList li").length');
    check('typed-DELETE erases all rooms', r.value === 0, JSON.stringify(r));
    r = await evaluate('document.getElementById("roomsEmpty").hidden === false');
    check('empty state returns after erase', r.value === true, JSON.stringify(r));

    // 390px mobile: no horizontal overflow
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(400);
    r = await evaluate('document.documentElement.scrollWidth');
    check('390px viewport has no horizontal overflow', r.value <= 390, 'scrollWidth=' + r.value);

    check('zero console errors / page exceptions during smoke run', errors.length === 0, errors.join(' | '));
    ws.close();
  } finally {
    try { chrome.kill('SIGKILL'); } catch (e) {}
    try { execSync('rm -rf ' + profile); } catch (e) {}
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error('SMOKE HARNESS ERROR: ' + e.message); process.exit(2); });
