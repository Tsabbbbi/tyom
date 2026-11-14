import { CHARACTERS, FRAME_H, FRAME_W, DIR_ROWS, buildSheet, type CharacterId } from '../game/assets/sprites';
import { audio } from '../game/systems/AudioManager';
import { settings } from '../game/systems/Settings';
import { flow, session, tracker } from '../services';
import { camera } from './camera';
import { hud } from './hud';

export type ScreenName = 'menu' | 'select' | 'setup' | 'howto' | 'settings' | 'pause' | 'victory';

const root = document.getElementById('ui')!;
const screens = new Map<ScreenName, HTMLElement>();
let current: ScreenName | null = null;
let settingsFrom: 'menu' | 'pause' = 'menu';
let selectTimer = 0;

const BEST_KEY = 'dlq.best.v1';

function make(name: ScreenName, html: string, cls = ''): HTMLElement {
  const el = document.createElement('section');
  el.className = `screen screen--${name} ${cls}`;
  el.dataset.screen = name;
  el.hidden = true;
  el.innerHTML = html;
  root.appendChild(el);
  screens.set(name, el);
  return el;
}

const controlsList = () => `
  <ul class="controls">
    <li><i class="key">▲</i><span>POINT UP</span><em>→</em><b>MOVE UP</b></li>
    <li><i class="key">▼</i><span>POINT DOWN</span><em>→</em><b>MOVE DOWN</b></li>
    <li><i class="key">◀</i><span>POINT LEFT</span><em>→</em><b>MOVE LEFT</b></li>
    <li><i class="key">▶</i><span>POINT RIGHT</span><em>→</em><b>MOVE RIGHT</b></li>
    <li><i class="key key--stop">■</i><span>NO HAND</span><em>→</em><b>STOP</b></li>
  </ul>`;

const tip = `<p class="tip">Extend your <b>index finger</b>, curl the other fingers, and hold the pose to keep walking.
Open palms and fists do nothing. Keyboard: <b>WASD</b> or <b>ARROW KEYS</b> always work.</p>`;

export function buildScreens(): void {
  make(
    'menu',
    `
    <div class="title">
      <div class="title__crest" aria-hidden="true"><span>D</span></div>
      <h1 class="title__main">DUKE</h1>
      <h2 class="title__sub">LIBRARY QUEST</h2>
      <p class="title__tag">POINT YOUR FINGER • FIND THE BOOKS</p>
    </div>
    <nav class="stack">
      <button class="btn btn--big" data-action="play">PLAY</button>
      <button class="btn" data-action="howto">HOW TO PLAY</button>
      <button class="btn" data-action="settings-menu">SETTINGS</button>
    </nav>
    <p class="footnote">Hand tracking runs entirely in your browser. Camera video never leaves your device.</p>`,
  );

  make(
    'select',
    `
    <h2 class="heading">CHOOSE YOUR HERO</h2>
    <div class="cards" role="radiogroup" aria-label="Choose your hero">
      ${(['devil', 'deer'] as CharacterId[])
        .map(
          (id) => `
        <button class="card" role="radio" data-char="${id}" aria-checked="false">
          <span class="card__tag">\u25B6 SELECTED \u25C0</span>
          <canvas class="card__sprite" width="${FRAME_W}" height="${FRAME_H}"></canvas>
          <span class="card__name">${CHARACTERS[id].name}</span>
          <span class="card__school">${CHARACTERS[id].school}</span>
          <span class="card__num">#${CHARACTERS[id].number}</span>
        </button>`,
        )
        .join('')}
    </div>
    <div class="row">
      <button class="btn" data-action="to-menu">BACK</button>
      <button class="btn btn--big" data-action="start-adventure">START ADVENTURE</button>
    </div>`,
  );

  make(
    'setup',
    `
    <div class="panel setup">
      <h2 class="heading heading--sm">HOW TO PLAY</h2>
      <div class="setup__cols">
        <div class="setup__left">
          ${controlsList()}
          ${tip}
        </div>
        <div class="setup__right">
          <div id="setup-cam-slot" class="cam-slot"></div>
          <p class="setup__msg" id="setup-msg"></p>
        </div>
      </div>
      <div class="row">
        <button class="btn" data-action="to-select">BACK</button>
        <button class="btn" data-action="enable-camera" id="btn-enable">ENABLE CAMERA</button>
        <button class="btn" data-action="keyboard-play">PLAY WITH KEYBOARD</button>
        <button class="btn btn--big" data-action="begin" id="btn-begin" disabled>BEGIN QUEST</button>
      </div>
    </div>`,
  );

  make(
    'howto',
    `
    <div class="panel setup">
      <h2 class="heading heading--sm">HOW TO PLAY</h2>
      <p class="goal">Explore the library and collect <b>5 books</b> hidden in the stacks.</p>
      ${controlsList()}
      ${tip}
      <p class="tip">Use the minimap (top-left) to find the glowing gold book markers. Press <b>ESC</b> to pause.</p>
      <div class="row"><button class="btn" data-action="to-menu">BACK</button></div>
    </div>`,
  );

  make(
    'settings',
    `
    <div class="panel settings">
      <h2 class="heading heading--sm">SETTINGS</h2>
      <label class="set"><span>MUSIC VOLUME</span><input type="range" min="0" max="100" data-set="music"><output data-out="music"></output></label>
      <label class="set"><span>SOUND EFFECTS</span><input type="range" min="0" max="100" data-set="sfx"><output data-out="sfx"></output></label>
      <div class="set"><span>MUTE ALL</span><button class="toggle" data-toggle="muted" role="switch"></button></div>
      <div class="set"><span>CAMERA PREVIEW</span><button class="toggle" data-toggle="showCamera" role="switch"></button></div>
      <div class="set"><span>MIRROR CAMERA</span><button class="toggle" data-toggle="mirror" role="switch"></button></div>
      <p class="tip tip--small">Mirror ON: pointing to your right moves right on screen (selfie view).</p>
      <div class="row"><button class="btn btn--big" data-action="settings-back">BACK</button></div>
    </div>`,
  );

  make(
    'pause',
    `
    <div class="panel pause">
      <h2 class="heading heading--sm">PAUSED</h2>
      <nav class="stack">
        <button class="btn btn--big" data-action="resume">RESUME</button>
        <button class="btn" data-action="restart">RESTART</button>
        <button class="btn" data-action="settings-pause">SETTINGS</button>
        <button class="btn" data-action="to-menu">MAIN MENU</button>
      </nav>
    </div>`,
  );

  make(
    'victory',
    `
    <div class="panel victory">
      <h2 class="victory__title">LIBRARY QUEST COMPLETE!</h2>
      <p class="victory__books">5 / 5 BOOKS COLLECTED</p>
      <p class="victory__time">TIME <b id="victory-time">00:00</b> <span id="victory-best"></span></p>
      <div class="row">
        <button class="btn btn--big" data-action="play-again">PLAY AGAIN</button>
        <button class="btn" data-action="to-menu">MAIN MENU</button>
      </div>
    </div>`,
  );

  wireSettings();
  wireSelect();
  wireActions();
  camera.onChange(updateSetup);
}

/* ------------------------------------------------------------ show/hide */

export function show(name: ScreenName | null): void {
  for (const [n, el] of screens) {
    const on = n === name;
    if (on && el.hidden) {
      el.hidden = false;
      el.classList.remove('screen--in');
      void el.offsetWidth;
      el.classList.add('screen--in');
    } else if (!on) el.hidden = true;
  }
  current = name;
  window.clearInterval(selectTimer);
  if (name === 'select') startSelectAnim();
  if (name === 'settings') syncSettings();
  if (name === 'setup') updateSetup();
  root.classList.toggle('ui--overlay', name === 'pause' || name === 'settings' && settingsFrom === 'pause');
  if (name === 'victory' || name === 'pause') focusFirst(name);
}

export function currentScreen(): ScreenName | null {
  return current;
}

function focusFirst(name: ScreenName): void {
  const b = screens.get(name)?.querySelector<HTMLButtonElement>('.btn--big');
  window.setTimeout(() => b?.focus({ preventScroll: true }), 30);
}

/* ------------------------------------------------------------ select */

function startSelectAnim(): void {
  const cards = [...root.querySelectorAll<HTMLButtonElement>('.card')];
  let frame = 0;
  const draw = () => {
    frame++;
    for (const card of cards) {
      const id = card.dataset.char as CharacterId;
      const sheet = buildSheet(id);
      const selected = card.dataset.char === session.character;
      const col = selected ? 2 + (frame % 4) : frame % 2;
      const c = card.querySelector('canvas')!;
      const g = c.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, FRAME_W, FRAME_H);
      g.drawImage(sheet, col * FRAME_W, DIR_ROWS.indexOf('down') * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
      card.classList.toggle('card--on', selected);
      card.setAttribute('aria-checked', String(selected));
    }
  };
  draw();
  selectTimer = window.setInterval(draw, 160);
}

function pickCharacter(id: CharacterId, announce: boolean): void {
  if (session.character === id && !announce) return;
  session.character = id;
  if (announce) {
    audio.select();
    audio.voice(id === 'devil' ? 'Go Blue Devil!' : 'Go Blue Deer!');
  }
}

function wireSelect(): void {
  const cards = [...root.querySelectorAll<HTMLButtonElement>('.card')];
  cards.forEach((c) => c.addEventListener('click', () => pickCharacter(c.dataset.char as CharacterId, true)));
  window.addEventListener('keydown', (e) => {
    if (current !== 'select') return;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') pickCharacter(session.character === 'devil' ? 'deer' : 'devil', true);
  });
}

/* ------------------------------------------------------------ setup */

function updateSetup(): void {
  if (current !== 'setup') return;
  const msg = document.getElementById('setup-msg')!;
  const begin = document.getElementById('btn-begin') as HTMLButtonElement;
  const enable = document.getElementById('btn-enable') as HTMLButtonElement;
  const st = tracker.status;
  const text: Record<string, string> = {
    idle: 'Press ENABLE CAMERA for hand controls, or play with the keyboard.',
    'requesting-camera': 'Waiting for camera permission… choose ALLOW in your browser.',
    'loading-model': 'Loading the hand tracker (runs locally in your browser)…',
    ready: 'Camera ready! Point a finger up, down, left or right to test it.',
    denied: 'Camera access was denied. Allow it in your browser settings, or play with the keyboard.',
    'no-camera': 'No camera found. You can play with the keyboard instead.',
    error: tracker.detail || 'Something went wrong with the camera. You can use the keyboard.',
  };
  msg.textContent = text[st] ?? '';
  msg.className = `setup__msg ${st === 'ready' ? 'ok' : st === 'denied' || st === 'error' || st === 'no-camera' ? 'bad' : ''}`;
  begin.disabled = st !== 'ready';
  enable.textContent = st === 'ready' ? 'RESTART CAMERA' : st === 'denied' || st === 'error' || st === 'no-camera' ? 'TRY AGAIN' : 'ENABLE CAMERA';
  enable.disabled = st === 'requesting-camera' || st === 'loading-model';
}

/* ------------------------------------------------------------ settings */

function syncSettings(): void {
  const s = settings.value;
  for (const input of root.querySelectorAll<HTMLInputElement>('input[data-set]')) {
    const k = input.dataset.set as 'music' | 'sfx';
    input.value = String(Math.round(s[k] * 100));
    input.style.setProperty('--v', `${input.value}%`);
    root.querySelector<HTMLOutputElement>(`output[data-out="${k}"]`)!.textContent = `${input.value}%`;
  }
  for (const t of root.querySelectorAll<HTMLButtonElement>('[data-toggle]')) {
    const k = t.dataset.toggle as 'muted' | 'showCamera' | 'mirror';
    const on = s[k];
    t.textContent = on ? 'ON' : 'OFF';
    t.classList.toggle('on', on);
    t.setAttribute('aria-checked', String(on));
  }
}

function wireSettings(): void {
  for (const input of root.querySelectorAll<HTMLInputElement>('input[data-set]')) {
    input.addEventListener('input', () => {
      settings.set(input.dataset.set as 'music' | 'sfx', Number(input.value) / 100);
      syncSettings();
    });
    input.addEventListener('change', () => {
      if (input.dataset.set === 'sfx') audio.bookCollect();
    });
  }
  for (const t of root.querySelectorAll<HTMLButtonElement>('[data-toggle]')) {
    t.addEventListener('click', () => {
      const k = t.dataset.toggle as 'muted' | 'showCamera' | 'mirror';
      settings.set(k, !settings.value[k]);
      syncSettings();
    });
  }
}

/* ------------------------------------------------------------ actions */

function wireActions(): void {
  root.addEventListener('pointerenter', (e) => {
    const t = e.target as HTMLElement;
    if (t.matches?.('.btn:not(:disabled), .card')) audio.hover();
  }, true);
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!t || (t as HTMLButtonElement).disabled) return;
    audio.unlock();
    const a = t.dataset.action!;
    if (a === 'to-menu' || a === 'to-select' || a === 'settings-back') audio.back();
    else audio.click();
    switch (a) {
      case 'play':
        flow.toSelect();
        break;
      case 'howto':
        flow.showHowTo();
        break;
      case 'settings-menu':
        flow.showSettings('menu');
        break;
      case 'settings-pause':
        flow.showSettings('pause');
        break;
      case 'settings-back':
        settingsFrom === 'pause' ? show('pause') : flow.toMenu();
        break;
      case 'to-menu':
        flow.toMenu();
        break;
      case 'to-select':
        camera.disable();
        flow.toSelect();
        break;
      case 'start-adventure':
        audio.voice("Let's go!");
        flow.toSetup();
        break;
      case 'enable-camera':
        void camera.enable();
        break;
      case 'keyboard-play':
        session.controlMode = 'keyboard';
        camera.disable();
        flow.startGame();
        break;
      case 'begin':
        flow.startGame();
        break;
      case 'pause':
        flow.pause();
        break;
      case 'resume':
        flow.resume();
        break;
      case 'restart':
        flow.restart();
        break;
      case 'play-again':
        flow.restart();
        break;
    }
  });
  // first interaction unlocks audio (autoplay policy)
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
}

export function setSettingsOrigin(from: 'menu' | 'pause'): void {
  settingsFrom = from;
}

export const formatTime = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function showVictory(ms: number): void {
  document.getElementById('victory-time')!.textContent = formatTime(ms);
  let best = ms;
  try {
    const prev = Number(localStorage.getItem(BEST_KEY));
    best = prev > 0 ? Math.min(prev, ms) : ms;
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    /* ignore */
  }
  document.getElementById('victory-best')!.textContent = best === ms ? '★ NEW BEST!' : `BEST ${formatTime(best)}`;
  hud.hide();
  show('victory');
}
