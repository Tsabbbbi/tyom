import { MAP, MAP_H, MAP_W, RUG, TILE, T, WORLD_H, WORLD_W } from '../data/libraryMap';

const S = 2; // logical pixels per tile
const Z = 2; // CSS-free integer upscale: the canvas itself is drawn at native size (no CSS scaling)

export class Minimap {
  private ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = MAP_W * S * Z;
    canvas.height = MAP_H * S * Z;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.scale(Z, Z);
    this.base = document.createElement('canvas');
    this.base.width = MAP_W * S;
    this.base.height = MAP_H * S;
    this.drawBase();
  }

  private drawBase(): void {
    const g = this.base.getContext('2d')!;
    g.fillStyle = '#d9c8a0';
    g.fillRect(0, 0, this.base.width, this.base.height);
    g.fillStyle = '#4b7fc0';
    g.fillRect(RUG.x * S, RUG.y * S, RUG.w * S, RUG.h * S);
    const color: Record<number, string> = {
      [T.WALL]: '#101B35',
      [T.DOOR]: '#c9a24a',
      [T.SHELF]: '#6b4429',
      [T.TABLE]: '#b5794a',
      [T.DESK]: '#b5794a',
      [T.PILLAR]: '#8c897f',
      [T.PLANT]: '#2f6b4f',
    };
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const c = color[MAP.grid[y][x]];
        if (c) {
          g.fillStyle = c;
          g.fillRect(x * S, y * S, S, S);
        }
      }
    }
  }

  update(px: number, py: number, books: { x: number; y: number }[], time: number): void {
    const g = this.ctx;
    g.drawImage(this.base, 0, 0);
    // remaining books: pulsing gold plus-markers with a dark outline
    const pulse = Math.sin(time / 220) > 0;
    for (const b of books) {
      const bx = Math.round((b.x / WORLD_W) * this.base.width);
      const by = Math.round((b.y / WORLD_H) * this.base.height);
      g.fillStyle = '#101B35';
      g.fillRect(bx - 3, by - 1, 7, 3);
      g.fillRect(bx - 1, by - 3, 3, 7);
      g.fillStyle = pulse ? '#ffd34d' : '#ff9d00';
      g.fillRect(bx - 2, by, 5, 1);
      g.fillRect(bx, by - 2, 1, 5);
    }
    // player: white square with blue ring (visually distinct from gold markers)
    const x = Math.round((px / WORLD_W) * this.base.width);
    const y = Math.round((py / WORLD_H) * this.base.height);
    g.fillStyle = '#101B35';
    g.fillRect(x - 3, y - 3, 6, 6);
    g.fillStyle = '#00a2ff';
    g.fillRect(x - 2, y - 2, 4, 4);
    g.fillStyle = '#ffffff';
    g.fillRect(x - 1, y - 1, 2, 2);
  }
}

export const MINIMAP_TILE = TILE;
