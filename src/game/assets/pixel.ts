/** Tiny helpers for drawing crisp pixel art on canvases. */
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export class Pix {
  readonly c: HTMLCanvasElement;
  readonly g: CanvasRenderingContext2D;
  constructor(readonly w: number, readonly h: number) {
    this.c = makeCanvas(w, h);
    this.g = this.c.getContext('2d', { willReadFrequently: true })!;
    this.g.imageSmoothingEnabled = false;
  }
  r(x: number, y: number, w: number, h: number, col: string): this {
    this.g.fillStyle = col;
    this.g.fillRect(x, y, w, h);
    return this;
  }
  /** Rect mirrored horizontally across the canvas centre. */
  rm(x: number, y: number, w: number, h: number, col: string): this {
    this.r(x, y, w, h, col);
    return this.r(this.w - x - w, y, w, h, col);
  }
  p(x: number, y: number, col: string): this {
    return this.r(x, y, 1, 1, col);
  }
  pm(x: number, y: number, col: string): this {
    return this.rm(x, y, 1, 1, col);
  }
  /** Pixel-accurate filled ellipse (no anti-aliasing). */
  e(cx: number, cy: number, rx: number, ry: number, col: string): this {
    this.g.fillStyle = col;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.g.fillRect(x, y, 1, 1);
      }
    }
    return this;
  }
  /** Bresenham line with optional thickness (extra pixels to the right). */
  line(x0: number, y0: number, x1: number, y1: number, col: string, thick = 1): this {
    let dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.r(x0, y0, thick, 1, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    dx = 0;
    dy = 0;
    return this;
  }
  /** Draw an ASCII glyph. '#' uses `col`, other characters are transparent. */
  glyph(rows: string[], x: number, y: number, col: string): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') this.p(x + i, y + j, col);
    });
    return this;
  }
  /** Add a 1px outline around all opaque pixels (4-neighbourhood). */
  outline(col: string): this {
    const img = this.g.getImageData(0, 0, this.w, this.h);
    const a = img.data;
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < this.w && y < this.h && a[(y * this.w + x) * 4 + 3] > 0;
    this.g.fillStyle = col;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) this.g.fillRect(x, y, 1, 1);
      }
    }
    return this;
  }
}

/** Small deterministic PRNG so generated art is stable between loads. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export const FONT_GLYPHS: Record<string, string[]> = {
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
};
