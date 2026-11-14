import { Minimap } from '../game/systems/Minimap';

/** In-game DOM HUD: book counter, minimap (upper-left), pause button (upper-right), toast. */
class Hud {
  readonly root: HTMLElement;
  readonly minimap: Minimap;
  private count: HTMLElement;
  private pips: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer = 0;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.id = 'hud';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="hud__vignette" aria-hidden="true"></div>
      <div class="hud__map panel-sm" aria-label="Minimap">
        <canvas id="minimap"></canvas>
      </div>
      <div class="hud__books panel-sm" role="status" aria-live="polite">
        <div class="hud__bookline"><span class="hud__label">BOOKS COLLECTED:</span> <b id="hud-count">0 / 5</b></div>
        <div class="hud__pips" id="hud-pips"></div>
      </div>
      <button class="btn btn--small hud__pause" data-action="pause" aria-label="Pause">PAUSE</button>
      <div class="hud__toast" id="hud-toast" aria-live="polite"></div>
    `;
    document.getElementById('ui')!.appendChild(this.root);
    this.count = this.root.querySelector('#hud-count')!;
    this.pips = this.root.querySelector('#hud-pips')!;
    this.toastEl = this.root.querySelector('#hud-toast')!;
    this.minimap = new Minimap(this.root.querySelector('#minimap') as HTMLCanvasElement);
  }

  show(): void {
    this.root.hidden = false;
  }
  hide(): void {
    this.root.hidden = true;
  }

  reset(total: number): void {
    this.pips.innerHTML = Array.from({ length: total }, () => '<i></i>').join('');
    this.setBooks(0, total);
    this.toastEl.className = 'hud__toast';
    this.toastEl.textContent = '';
  }

  setBooks(n: number, total: number): void {
    this.count.textContent = `${n} / ${total}`;
    this.count.classList.remove('pop');
    void this.count.offsetWidth;
    this.count.classList.add('pop');
    [...this.pips.children].forEach((el, i) => el.classList.toggle('on', i < n));
  }

  toast(title: string, sub = ''): void {
    window.clearTimeout(this.toastTimer);
    this.toastEl.innerHTML = `<b>${title}</b>${sub ? `<span>${sub}</span>` : ''}`;
    this.toastEl.className = 'hud__toast';
    void this.toastEl.offsetWidth;
    this.toastEl.className = 'hud__toast show';
    this.toastTimer = window.setTimeout(() => (this.toastEl.className = 'hud__toast'), 2400);
  }
}

export const hud = new Hud();
