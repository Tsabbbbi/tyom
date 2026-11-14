// End-to-end smoke test of the full game flow with Playwright (Chromium).
// Uses Chromium's FAKE camera device (synthetic video) so the real camera -> MediaPipe pipeline starts,
// and injects MOCK hand landmarks to drive gestures. It does NOT test a real hand in front of a real webcam.
//   npm run build && npx vite preview --port 4173 &  then:  APP_URL=http://localhost:4173 node e2e/flow.mjs
import { chromium } from 'playwright';

const URL = (process.env.APP_URL ?? 'http://localhost:4173') + '/?debug=1';
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
};

const browser = await chromium.launch({
  headless: !process.env.HEADED,
  channel: process.env.PW_CHANNEL || undefined, // e.g. PW_CHANNEL=chrome for the real Chrome (hardware GL)
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader', '--use-gl=swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, permissions: ['camera'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message + ' ' + (e.stack ?? '').split('\n').slice(0, 3).join(' <- ')));
page.on('console', (m) => m.type() === 'error' && !/GL Driver|favicon/.test(m.text()) && errors.push(m.text()));

const state = () => page.evaluate(() => {
  const l = window.__DLQ__.library();
  return { x: l.player.x, y: l.player.y, facing: l.player.facing, moving: l.player.moving, collected: l.collected, state: l.state, anim: l.player.sprite.anims.currentAnim?.key };
});
const key = async (k, ms) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };

// Builds mock landmarks for a pointing hand (index along `dir`, raw camera coordinates, un-mirrored).
const mock = (kind) => page.evaluate((kind) => {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.7 }));
  const up = (dx, dy, others) => {
    lm[0] = { x: 0.5, y: 0.8 }; lm[9] = { x: 0.5, y: 0.6 }; lm[5] = { x: 0.45, y: 0.62 };
    [1, 2, 3].forEach((n) => (lm[5 + n] = { x: 0.45, y: 0.62 - 0.07 * n }));
    const fing = (pip, dip, tip, x) => {
      if (others === 'open') { lm[pip] = { x, y: 0.55 }; lm[dip] = { x, y: 0.47 }; lm[tip] = { x, y: 0.4 }; }
      else { lm[pip] = { x, y: 0.64 }; lm[dip] = { x, y: 0.7 }; lm[tip] = { x, y: 0.72 }; }
    };
    fing(10, 11, 12, 0.5); fing(14, 15, 16, 0.55); fing(18, 19, 20, 0.6);
    const a = Math.atan2(dy, dx) - Math.atan2(-1, 0), c = Math.cos(a), s = Math.sin(a), w = lm[0];
    return lm.map((p) => ({ x: w.x + (p.x - w.x) * c - (p.y - w.y) * s, y: w.y + (p.x - w.x) * s + (p.y - w.y) * c }));
  };
  const table = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  let pts = null;
  if (kind === 'none') pts = null;
  else if (kind === 'open') pts = up(0, -1, 'open');
  else pts = up(...table[kind], 'curled');
  const input = window.__DLQ__.services.input;
  // keep feeding frames at ~25fps (like the real tracker) until the next mock() call
  window.clearInterval(window.__mockTimer);
  input.ingestLandmarks(pts);
  if (pts) window.__mockTimer = window.setInterval(() => input.ingestLandmarks(pts), 40);
  else input.ingestLandmarks(null);
  input.ingestLandmarks(pts); input.ingestLandmarks(pts);
  return input.direction();
}, kind);

try {
  await page.goto(URL);
  await page.waitForSelector('.screen--menu:not([hidden])', { timeout: 15000 });
  check('main menu loads with PLAY / HOW TO PLAY / SETTINGS', (await page.locator('.screen--menu .btn').allTextContents()).join('|') === 'PLAY|HOW TO PLAY|SETTINGS');

  await page.click('[data-action=howto]');
  check('how-to-play screen opens', await page.locator('.screen--howto:not([hidden])').count() === 1);
  await page.click('.screen--howto [data-action=to-menu]');

  await page.click('[data-action=play]');
  check('character select shows both heroes', (await page.locator('.card').count()) === 2);
  const names = await page.locator('.card__name').allTextContents();
  check('hero names are BLUE DEVIL / BLUE DEER', names.join('|') === 'BLUE DEVIL|BLUE DEER');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/select.png' });
  await page.click('.card[data-char=deer]');
  check('selecting the deer works', await page.evaluate(() => window.__DLQ__.services.session.character) === 'deer');
  await page.click('.card[data-char=devil]');
  check('selecting the devil works', await page.evaluate(() => window.__DLQ__.services.session.character) === 'devil');

  await page.click('[data-action=start-adventure]');
  await page.waitForFunction(() => window.__DLQ__.services.tracker.status === 'ready', null, { timeout: 30000 });
  check('camera + MediaPipe hand tracker initialise (fake camera)', true, `delegate=${await page.evaluate(() => window.__DLQ__.services.tracker.delegate)}`);
  check('BEGIN is enabled once tracking is ready', await page.locator('#btn-begin').isEnabled());
  await page.screenshot({ path: 'test-results/setup.png' });
  await page.click('[data-action=begin]');
  await page.waitForTimeout(1200);
  check('library scene running, HUD visible', (await page.locator('.hud:not([hidden])').count()) === 1 && (await state()).state === 'playing');
  check('audio context unlocked after user interaction and library music scheduled', await page.evaluate(() => window.__DLQ__.audio.isRunning && window.__DLQ__.audio.musicTrack === 'library'));
  check('HUD reads BOOKS COLLECTED: 0 / 5', (await page.locator('.hud__bookline').innerText()).replace(/\s+/g, ' ').trim() === 'BOOKS COLLECTED: 0 / 5');

  // ---- gesture control (mock landmarks) ----
  // The fake camera never shows a hand, so the live tracker would (correctly) keep reporting "no hand".
  // Release it here and drive the real classifier/input pipeline with injected landmarks instead.
  await page.evaluate(() => window.__DLQ__.services.tracker.stop());
  const start = await state();
  for (const [dir, axis, sign] of [['up', 'y', -1], ['left', 'x', -1], ['down', 'y', 1], ['right', 'x', 1]]) {
    await page.evaluate(() => window.__DLQ__.library().teleportToTile(24, 15));
    await page.waitForTimeout(150);
    const before = await state();
    // mirrored camera: raw-left finger == player's right; the mock supplies RAW coordinates, so invert for L/R.
    const raw = dir === 'left' ? 'right' : dir === 'right' ? 'left' : dir;
    const d = await mock(raw);
    await page.waitForTimeout(500);
    const mid = await state();
    await page.waitForTimeout(500);
    const after = await state();
    check(`gesture "${dir}" -> input=${d}`, d === dir);
        check(`holding "${dir}" moves continuously`, (mid[axis] - before[axis]) * sign > 20 && (after[axis] - mid[axis]) * sign > 20 && after.facing === dir && after.anim?.includes('walk'));
    await mock('none');
    await page.waitForTimeout(120);
    const s1 = await state(); await page.waitForTimeout(300); const s2 = await state();
    check(`hand removed after "${dir}" -> stops immediately`, Math.abs(s2.x - s1.x) < 0.5 && Math.abs(s2.y - s1.y) < 0.5 && !s2.moving);
  }
  await mock('open'); await page.waitForTimeout(150);
  check('open palm is not a directional gesture', (await page.evaluate(() => window.__DLQ__.services.input.direction())) === null);
  await mock('up'); await page.waitForTimeout(100);
  // stale gesture watchdog: stop feeding frames (tracker stalled), movement must stop after the TTL
  await page.evaluate(() => window.clearInterval(window.__mockTimer));
  await page.waitForTimeout(450);
  check('stale gesture expires when tracking stalls', (await page.evaluate(() => window.__DLQ__.services.input.direction())) === null);
  await mock('none');

  // ---- keyboard fallback + keyboard priority ----
  const k0 = await state(); await key('KeyD', 500); const k1 = await state();
  check('keyboard D moves right', k1.x - k0.x > 30);
  await mock('up');
  const p0 = await state(); await key('ArrowLeft', 400); const p1 = await state();
  check('keyboard overrides gesture (deterministic priority)', p1.x < p0.x - 20 && Math.abs(p1.y - p0.y) < 15);
  await mock('none');

  // ---- collision ----
  await page.evaluate(() => window.__DLQ__.library().teleportToTile(4, 4));
  await page.waitForTimeout(200);
  await key('ArrowUp', 1500);
  const shelf = await state();
  check('bookshelves block movement', shelf.y >= 3 * 40 + 11 && shelf.y < 3 * 40 + 16, `y=${Math.round(shelf.y)} (shelf bottom edge at 120 + 12 hitbox)`);
  await page.evaluate(() => window.__DLQ__.library().teleportToTile(23, 4));
  await key('ArrowUp', 1500);
  const wall = await state();
  check('walls block movement', wall.y >= 91 && wall.y < 96, `y=${Math.round(wall.y)}`);
  await page.evaluate(() => window.__DLQ__.library().teleportToTile(20, 10));
  await key('ArrowDown', 1500);
  const tbl = await state();
  check('tables block movement', tbl.y > 470 && tbl.y <= 481, `y=${Math.round(tbl.y)} (table top edge at 480)`);
  // corner assist: still able to slide along a shelf end into the aisle
  await page.evaluate(() => window.__DLQ__.library().teleportToTile(24, 10));
  await key('ArrowDown', 1500);
  const gap = await state();
  check('open passage between tables is walkable', gap.y > 560, `y=${Math.round(gap.y)}`);

  // ---- camera follows ----
  await page.evaluate(() => window.__DLQ__.library().teleportToTile(40, 28));
  await page.waitForTimeout(900);
  const cam = await page.evaluate(() => { const l = window.__DLQ__.library(); const c = l.cameras.main; return [c.scrollX, c.scrollY, c.width, c.height, l.player.x, l.player.y]; });
  check('camera follows player across the large map', cam[4] >= cam[0] && cam[4] <= cam[0] + cam[2] && cam[5] >= cam[1] && cam[5] <= cam[1] + cam[3] && cam[0] > 600);

  // ---- pause / resume ----
  await page.click('[data-action=pause]');
  check('pause menu shows RESUME / RESTART / SETTINGS / MAIN MENU', (await page.locator('.screen--pause .btn').allTextContents()).join('|') === 'RESUME|RESTART|SETTINGS|MAIN MENU');
  const q0 = await state(); await key('ArrowRight', 400); const q1 = await state();
  check('no movement while paused', Math.abs(q1.x - q0.x) < 0.5);
  await page.click('[data-action=settings-pause]');
  check('settings open from pause', await page.locator('.screen--settings:not([hidden])').count() === 1);
  await page.click('[data-toggle=muted]');
  check('mute toggle persists to localStorage', JSON.parse(await page.evaluate(() => localStorage.getItem('dlq.settings.v1'))).muted === true);
  await page.click('[data-toggle=muted]');
  await page.fill('input[data-set=music]', '20');
  check('music volume saved', JSON.parse(await page.evaluate(() => localStorage.getItem('dlq.settings.v1'))).music === 0.2);
  await page.click('[data-action=settings-back]');
  await page.click('[data-action=resume]');
  const r0 = await state(); await key('ArrowLeft', 400); const r1 = await state();
  check('resume restores movement', r1.x < r0.x - 20);
  await page.keyboard.press('Escape');
  check('Escape pauses', await page.locator('.screen--pause:not([hidden])').count() === 1);
  await page.keyboard.press('Escape');

  // ---- books ----
  const bookTiles = await page.evaluate(() => window.__DLQ__.library().books.map((b) => [b.spot.tx, b.spot.ty]));
  check('exactly five books are placed', bookTiles.length === 5);
  for (let i = 0; i < 4; i++) {
    await page.evaluate(([tx, ty]) => window.__DLQ__.library().teleportToTile(tx, ty), bookTiles[i]);
    await page.waitForTimeout(250);
    const s = await state();
    check(`book ${i + 1} collected -> counter ${i + 1}`, s.collected === i + 1 && s.state === 'playing');
    if (i === 0) {
      await page.screenshot({ path: 'test-results/collect.png' });
      check('HUD counter updates', (await page.locator('#hud-count').innerText()) === '1 / 5');
    }
  }
  // collecting the same book twice is impossible
  await page.evaluate(([tx, ty]) => window.__DLQ__.library().teleportToTile(tx, ty), bookTiles[0]);
  await page.waitForTimeout(300);
  check('a collected book cannot be collected again', (await state()).collected === 4);

  // restart resets
  await page.click('[data-action=pause]');
  await page.click('[data-action=restart]');
  await page.waitForTimeout(900);
  const rs = await state();
  check('restart resets books and state', rs.collected === 0 && rs.state === 'playing' && (await page.locator('#hud-count').innerText()) === '0 / 5');

  // victory only after the fifth
  for (let i = 0; i < 5; i++) {
    await page.evaluate(([tx, ty]) => window.__DLQ__.library().teleportToTile(tx, ty), bookTiles[i]);
    await page.waitForTimeout(250);
    if (i < 4) check(`no victory after ${i + 1} books`, (await state()).state === 'playing');
  }
  await page.waitForSelector('.screen--victory:not([hidden])', { timeout: 8000 });
  const vt = (await page.locator('.victory').innerText()).replace(/\s+/g, ' ');
  check('victory screen text', /LIBRARY QUEST COMPLETE!/.test(vt) && /5 \/ 5 BOOKS COLLECTED/.test(vt) && /TIME \d\d:\d\d/.test(vt), vt);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/victory.png' });
  await page.click('[data-action=play-again]');
  await page.waitForTimeout(900);
  check('PLAY AGAIN restarts the game', (await state()).collected === 0);
  await page.click('[data-action=pause]');
  await page.click('.screen--pause [data-action=to-menu]');
  check('MAIN MENU returns to title', await page.locator('.screen--menu:not([hidden])').count() === 1);
  check('camera released on the main menu', await page.evaluate(() => window.__DLQ__.services.tracker.status) === 'idle');

  // ---- deer character plays ----
  await page.click('[data-action=play]');
  await page.click('.card[data-char=deer]');
  await page.click('[data-action=start-adventure]');
  await page.waitForFunction(() => window.__DLQ__.services.tracker.status !== 'requesting-camera' && window.__DLQ__.services.tracker.status !== 'loading-model', null, { timeout: 30000 });
  await page.click('[data-action=keyboard-play]');
  await page.waitForTimeout(900);
  const dd = await state();
  await key('ArrowUp', 500);
  const d2 = await state();
  check('deer is playable with walk animation', d2.y < dd.y - 20 && (await page.evaluate(() => window.__DLQ__.library().player.id)) === 'deer');
  await page.screenshot({ path: 'test-results/deer.png' });
} catch (e) {
  check('unexpected exception', false, String(e));
}

check('no runtime page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
