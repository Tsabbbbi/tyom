import {
  BOOKS,
  DESK,
  DOOR_X,
  MAP_H,
  MAP_W,
  RUG,
  RUNNERS,
  TABLES,
  TILE,
  WINDOW_XS,
  T,
  tileAt,
} from '../data/libraryMap';
import { FONT_GLYPHS, Pix, rng } from './pixel';

export const PAL = {
  navy: '#101B35',
  blue: '#00539B',
  parchment: '#F2E6C9',
  wood: '#825638',
  gold: '#D8B36A',
  stone: '#B8B5AE',
  ink: '#0b1226',
};

const BOOK_COLORS = ['#00539B', '#2f7fd6', '#8e2a3a', '#b0453a', '#2f6b4f', '#d8b36a', '#f2e6c9', '#5a3a8a', '#d9822b', '#1f8a8a', '#3a3a52'];

/* ---------- floor ---------- */
function drawFloorTile(p: Pix, x: number, y: number, rand: () => number): void {
  const planks = ['#9b6a43', '#8d5f3b', '#a4724a', '#946440'];
  for (let j = 0; j < 4; j++) {
    const base = planks[Math.floor(rand() * planks.length)];
    const split = 6 + Math.floor(rand() * 28);
    const offset = (j % 2) * 20;
    p.r(x, y + j * 10, TILE, 10, base);
    p.r(x, y + j * 10, TILE, 1, '#b07d52');
    p.r(x, y + j * 10 + 9, TILE, 1, '#6e4529');
    p.r(x + ((split + offset) % TILE), y + j * 10, 1, 10, '#6e4529');
    // grain flecks
    for (let k = 0; k < 4; k++) p.r(x + Math.floor(rand() * 36), y + j * 10 + 3 + Math.floor(rand() * 4), 3 + Math.floor(rand() * 5), 1, '#85573a');
  }
}

/* ---------- walls ---------- */
function stoneBlocks(p: Pix, x: number, y: number, w: number, h: number, rand: () => number, light = 0): void {
  const bw = 20;
  const bh = 10;
  const cols = ['#b8b5ae', '#aeaba3', '#c2bfb7', '#b3b0a8'];
  for (let j = 0; j * bh < h; j++) {
    const off = (j % 2) * (bw / 2);
    for (let i = -1; i * bw < w; i++) {
      const bx = x + i * bw + off;
      const c = cols[Math.floor(rand() * cols.length)];
      const cx0 = Math.max(bx, x);
      const cx1 = Math.min(bx + bw, x + w);
      if (cx1 <= cx0) continue;
      p.r(cx0, y + j * bh, cx1 - cx0, Math.min(bh, h - j * bh), c);
      p.r(cx0, y + j * bh, cx1 - cx0, 1, '#d2cfc7');
      p.r(cx0, y + j * bh + Math.min(bh, h - j * bh) - 1, cx1 - cx0, 1, '#8c897f');
      if (bx >= x) p.r(bx, y + j * bh, 1, Math.min(bh, h - j * bh), '#8c897f');
    }
  }
  if (light) p.r(x, y, w, h, `rgba(255,255,255,${light})`);
}

function drawWindow(p: Pix, tx: number): void {
  const x = tx * TILE + 6;
  const y = 6;
  const w = 28;
  const h = 64;
  // stone surround
  p.r(x - 3, y + 12, w + 6, h - 8, '#d9d5ca');
  p.e(x + w / 2, y + 14, w / 2 + 3, 17, '#d9d5ca');
  p.r(x - 3, y + h + 2, w + 6, 4, '#8c897f');
  // glass
  const pane = ['#2f7fd6', '#5fa3ee', '#1f5fb0', '#4a93e2'];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const dx = (i + 0.5 - w / 2) / (w / 2);
      const dy = (j + 0.5 - 14) / 14;
      if (j < 14 && dx * dx + dy * dy > 1) continue;
      const k = (Math.floor(i / 7) + Math.floor(j / 8)) % pane.length;
      p.p(x + i, y + j, pane[k]);
    }
  }
  // warm glow at the bottom
  p.r(x, y + h - 10, w, 10, 'rgba(255,220,140,0.35)');
  // tracery
  p.r(x + w / 2 - 1, y, 2, h, '#e9e4d4');
  p.r(x, y + 28, w, 2, '#e9e4d4');
  p.r(x, y + 46, w, 2, '#e9e4d4');
  p.e(x + w / 2, y + 12, 3, 3, PAL.gold);
  // sill
  p.r(x - 5, y + h + 4, w + 10, 3, '#a9a59a');
}

function drawNorthWall(p: Pix, rand: () => number): void {
  stoneBlocks(p, 0, 0, MAP_W * TILE, TILE * 2, rand);
  // darker crown
  p.r(0, 0, MAP_W * TILE, 5, '#6d6a64');
  p.r(0, 5, MAP_W * TILE, 2, '#8c897f');
  // wainscot panelling
  const wy = TILE * 2 - 22;
  p.r(0, wy, MAP_W * TILE, 22, '#5b3a24');
  p.r(0, wy, MAP_W * TILE, 2, PAL.gold);
  for (let x = 0; x < MAP_W * TILE; x += 20) {
    p.r(x + 2, wy + 5, 16, 13, '#6b4429');
    p.r(x + 2, wy + 5, 16, 1, '#8a5a38');
    p.r(x + 2, wy + 17, 16, 1, '#3f2615');
  }
  for (const wx of WINDOW_XS) drawWindow(p, wx);
  // banners between windows (Duke blue with gold D)
  for (const wx of WINDOW_XS.slice(0, -1)) {
    const bx = (wx + 2.5) * TILE - 7;
    p.r(bx, 6, 14, 40, PAL.blue);
    p.r(bx, 6, 14, 2, PAL.gold);
    p.r(bx, 44, 14, 2, PAL.gold);
    p.r(bx, 46, 4, 3, PAL.blue);
    p.r(bx + 10, 46, 4, 3, PAL.blue);
    p.glyph(FONT_GLYPHS.D, bx + 4, 18, '#f2e6c9');
  }
  // soft shadow on the floor below the wall
  const g = p.g.createLinearGradient(0, TILE * 2, 0, TILE * 2 + 16);
  g.addColorStop(0, 'rgba(10,10,30,0.45)');
  g.addColorStop(1, 'rgba(10,10,30,0)');
  p.g.fillStyle = g;
  p.g.fillRect(0, TILE * 2, MAP_W * TILE, 16);
}

function drawSideWalls(p: Pix, rand: () => number): void {
  // west / east columns and bottom rows
  for (let ty = 2; ty < MAP_H; ty++) {
    for (const tx of [0, MAP_W - 1]) {
      stoneBlocks(p, tx * TILE, ty * TILE, TILE, TILE, rand, 0.0);
    }
  }
  for (let ty = MAP_H - 2; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (tileAt(tx, ty) === T.DOOR) continue;
      stoneBlocks(p, tx * TILE, ty * TILE, TILE, TILE, rand, ty === MAP_H - 2 ? 0.06 : 0.0);
    }
  }
  // dark inner edges
  const edge = (x: number, y: number, w: number, h: number, a: number) => p.r(x, y, w, h, `rgba(8,10,25,${a})`);
  edge(TILE, TILE * 2, 8, (MAP_H - 4) * TILE, 0.28);
  edge((MAP_W - 1) * TILE - 8, TILE * 2, 8, (MAP_H - 4) * TILE, 0.28);
  // wainscot on side walls (inner side)
  p.r(TILE - 6, TILE * 2, 6, (MAP_H - 4) * TILE, '#5b3a24');
  p.r((MAP_W - 1) * TILE, TILE * 2, 6, (MAP_H - 4) * TILE, '#5b3a24');
  // south wall top edge shade
  edge(TILE, (MAP_H - 2) * TILE - 8, (MAP_W - 2) * TILE, 8, 0.0);
}

function drawDoor(p: Pix): void {
  const x = DOOR_X * TILE;
  const y = (MAP_H - 2) * TILE;
  p.r(x - 4, y, TILE * 2 + 8, TILE * 2, '#d9d5ca');
  p.r(x, y + 4, TILE * 2, TILE * 2 - 4, '#4b2e1b');
  for (let i = 0; i < 8; i++) p.r(x + i * 10, y + 4, 1, TILE * 2 - 4, '#3a2213');
  p.r(x + TILE - 1, y + 4, 2, TILE * 2 - 4, '#241208');
  p.r(x + 4, y + 8, TILE - 8, 3, PAL.gold);
  p.r(x + TILE + 4, y + 8, TILE - 8, 3, PAL.gold);
  p.r(x + TILE - 7, y + 42, 4, 8, PAL.gold);
  p.r(x + TILE + 3, y + 42, 4, 8, PAL.gold);
  p.r(x, y + 4, TILE * 2, 3, '#2d1a0e');
}

/* ---------- rugs ---------- */
function drawRug(p: Pix): void {
  const x = RUG.x * TILE;
  const y = RUG.y * TILE;
  const w = RUG.w * TILE;
  const h = RUG.h * TILE;
  p.r(x + 4, y + 6, w, h, 'rgba(0,0,0,0.25)');
  p.r(x, y, w, h, '#0c2d5a');
  p.r(x + 6, y + 6, w - 12, h - 12, PAL.gold);
  p.r(x + 9, y + 9, w - 18, h - 18, '#0c2d5a');
  p.r(x + 16, y + 16, w - 32, h - 32, '#0a4a8a');
  for (let j = 0; j < (h - 32) / 16; j++) {
    for (let i = 0; i < (w - 32) / 16; i++) {
      const cx = x + 16 + i * 16 + 8;
      const cy = y + 16 + j * 16 + 8;
      if (cx > x + w - 20 || cy > y + h - 20) continue;
      p.r(cx - 1, cy - 3, 2, 6, '#135fa8');
      p.r(cx - 3, cy - 1, 6, 2, '#135fa8');
      p.p(cx, cy, PAL.gold);
    }
  }
  // medallion
  const cx = x + w / 2;
  const cy = y + h / 2;
  p.e(cx, cy, 30, 30, PAL.gold);
  p.e(cx, cy, 27, 27, '#0c2d5a');
  p.e(cx, cy, 24, 24, PAL.blue);
  const gl = FONT_GLYPHS.D;
  for (let j = 0; j < gl.length; j++) for (let i = 0; i < gl[j].length; i++) if (gl[j][i] === '#') p.r(cx - 12 + i * 5, cy - 17 + j * 5, 5, 5, '#f2e6c9');
}

function drawRunner(p: Pix, r: Rect2): void {
  const x = r.x * TILE + 3;
  const w = r.w * TILE - 6;
  const y = r.y * TILE + 8;
  const h = TILE - 16;
  const base = r.color === 'burgundy' ? '#6e1f2b' : '#13315f';
  const mid = r.color === 'burgundy' ? '#8e2f3d' : '#1d4a8c';
  p.r(x + 2, y + 3, w, h, 'rgba(0,0,0,0.22)');
  p.r(x, y, w, h, base);
  p.r(x, y + 2, w, 2, PAL.gold);
  p.r(x, y + h - 4, w, 2, PAL.gold);
  for (let i = 8; i < w - 8; i += 12) p.r(x + i, y + 7, 6, h - 14, mid);
  for (let i = 0; i < h; i += 3) {
    p.r(x - 3, y + i, 3, 1, '#d8c9a0');
    p.r(x + w, y + i, 3, 1, '#d8c9a0');
  }
}
type Rect2 = { x: number; y: number; w: number; h: number; color: 'burgundy' | 'navy' };

/* ---------- full base layer ---------- */
export function renderBase(): HTMLCanvasElement {
  const p = new Pix(MAP_W * TILE, MAP_H * TILE);
  const rand = rng(1337);
  for (let ty = 2; ty < MAP_H - 2; ty++) for (let tx = 1; tx < MAP_W - 1; tx++) drawFloorTile(p, tx * TILE, ty * TILE, rand);
  drawRug(p);
  for (const r of RUNNERS) drawRunner(p, r);
  // door mat
  p.r(DOOR_X * TILE + 4, (MAP_H - 3) * TILE + 10, TILE * 2 - 8, 22, '#12305f');
  p.r(DOOR_X * TILE + 7, (MAP_H - 3) * TILE + 13, TILE * 2 - 14, 16, '#0c2347');
  p.r(DOOR_X * TILE + 4, (MAP_H - 3) * TILE + 10, TILE * 2 - 8, 2, PAL.gold);
  drawNorthWall(p, rand);
  drawSideWalls(p, rand);
  drawDoor(p);
  // window light shafts onto the floor
  p.g.save();
  for (const wx of WINDOW_XS) {
    const x = wx * TILE + 6;
    const g = p.g.createLinearGradient(x, TILE * 2, x + 90, TILE * 2 + 260);
    g.addColorStop(0, 'rgba(255,232,170,0.20)');
    g.addColorStop(1, 'rgba(255,232,170,0)');
    p.g.fillStyle = g;
    p.g.beginPath();
    p.g.moveTo(x, TILE * 2);
    p.g.lineTo(x + 28, TILE * 2);
    p.g.lineTo(x + 28 + 100, TILE * 2 + 270);
    p.g.lineTo(x + 100, TILE * 2 + 270);
    p.g.closePath();
    p.g.fill();
  }
  p.g.restore();
  return p.c;
}

/* ---------- tall objects (y-sorted sprites) ---------- */
export const SHELF_OVERHANG = 16;

export function renderShelfRun(w: number, seed: number): HTMLCanvasElement {
  const W = w * TILE;
  const H = TILE + SHELF_OVERHANG;
  const p = new Pix(W, H);
  const rand = rng(seed * 7919 + 13);
  // top surface
  p.r(0, 0, W, 15, '#b57a4c');
  p.r(0, 0, W, 2, '#d09564');
  p.r(0, 13, W, 2, '#7a4a2c');
  for (let x = 6; x < W - 10; x += 9 + Math.floor(rand() * 18)) {
    const c = BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)];
    p.r(x, 4 + Math.floor(rand() * 3), 6 + Math.floor(rand() * 4), 4, c);
  }
  // front frame + back
  p.r(0, 15, W, H - 15, '#6b4429');
  p.r(2, 17, W - 4, H - 22, '#34200f');
  // compartments
  const rows = [
    { y: 18, h: 17 },
    { y: 37, h: 17 },
  ];
  for (const row of rows) {
    p.r(2, row.y, W - 4, row.h, '#2a190b');
    let x = 3;
    while (x < W - 6) {
      if ((x - 3) % TILE < 3 && x > 6) {
        x += 2;
        continue;
      }
      const bw = 3 + Math.floor(rand() * 4);
      const bh = row.h - 2 - Math.floor(rand() * 5);
      const c = BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)];
      if (rand() < 0.07) {
        x += 4 + Math.floor(rand() * 6);
        continue; // gap
      }
      const by = row.y + row.h - bh;
      p.r(x, by, bw, bh, c);
      p.r(x, by, 1, bh, 'rgba(255,255,255,0.25)');
      p.r(x + bw - 1, by, 1, bh, 'rgba(0,0,0,0.3)');
      if (rand() < 0.5) p.r(x, by + 3, bw, 1, PAL.gold);
      if (rand() < 0.2) p.r(x + 1, by + 6, Math.max(1, bw - 2), 1, '#f2e6c9');
      x += bw;
    }
    // shelf board
    p.r(1, row.y + row.h, W - 2, 3, '#8a5a38');
    p.r(1, row.y + row.h, W - 2, 1, '#b07a4c');
  }
  // uprights between tiles
  for (let i = 0; i <= w; i++) {
    const x = Math.min(W - 3, Math.max(0, i * TILE - 1));
    p.r(x, 15, 3, H - 15, '#6b4429');
    p.r(x, 15, 1, H - 15, '#8a5a38');
  }
  p.r(0, H - 5, W, 5, '#4b2e1b');
  p.r(0, H - 1, W, 1, '#2d1a0e');
  p.outline(PAL.ink);
  return p.c;
}

export const TABLE_OVERHANG = 12;

export function renderTable(w: number, h: number, seed: number): HTMLCanvasElement {
  const W = w * TILE;
  const H = h * TILE + TABLE_OVERHANG;
  const p = new Pix(W, H);
  const rand = rng(seed * 31 + 5);
  // drop shadow lives under the sprite via outline; table body
  const topH = H - 12;
  p.r(0, 0, W, topH, '#9a6238');
  p.r(2, 2, W - 4, topH - 4, '#b5794a');
  for (let y = 6; y < topH - 4; y += 7) p.r(4, y, W - 8, 1, '#a46d40');
  for (let i = 0; i < 18; i++) p.r(6 + Math.floor(rand() * (W - 20)), 5 + Math.floor(rand() * (topH - 12)), 8 + Math.floor(rand() * 10), 1, '#c58a58');
  p.r(2, 2, W - 4, 2, '#d09564');
  // front lip + legs
  p.r(0, topH, W, 8, '#6b4429');
  p.r(0, topH, W, 2, '#8a5a38');
  p.r(3, topH + 8, 6, 4, '#4b2e1b');
  p.r(W - 9, topH + 8, 6, 4, '#4b2e1b');
  // lamp (banker's lamp) + books + papers
  const lx = 10 + Math.floor(W * 0.15);
  p.r(lx, 8, 12, 5, '#c9a24a');
  p.r(lx + 4, 13, 4, 6, '#c9a24a');
  p.r(lx - 1, 2, 14, 7, '#2f6b4f');
  p.r(lx - 1, 2, 14, 2, '#4a9a75');
  p.r(lx + 2, 8, 8, 2, '#ffe9a0');
  p.r(W - 38, 10, 18, 5, BOOK_COLORS[Math.floor(rand() * 6)]);
  p.r(W - 36, 7, 15, 4, BOOK_COLORS[Math.floor(rand() * 6)]);
  p.r(W - 38, 10, 18, 1, PAL.gold);
  p.r(Math.floor(W / 2) - 6, 16, 16, 12, '#f2e6c9');
  p.r(Math.floor(W / 2) - 4, 19, 12, 1, '#a89b7a');
  p.r(Math.floor(W / 2) - 4, 22, 9, 1, '#a89b7a');
  if (w >= 3) {
    p.r(W - 16, topH - 20, 6, 7, '#ffffff');
    p.r(W - 16, topH - 20, 6, 2, '#00539B');
  }
  p.outline(PAL.ink);
  return p.c;
}

export const PILLAR_H = 92;
export function renderPillar(): HTMLCanvasElement {
  const p = new Pix(TILE, PILLAR_H);
  const shaft = ['#cfccc3', '#c2bfb6', '#b3b0a7', '#a29f96'];
  for (let i = 0; i < 4; i++) p.r(8 + i * 6, 10, 6, PILLAR_H - 24, shaft[i]);
  p.r(8, 10, 24, PILLAR_H - 24, 'rgba(0,0,0,0)');
  // base & capital
  p.r(3, PILLAR_H - 14, 34, 14, '#bdbab1');
  p.r(3, PILLAR_H - 14, 34, 3, '#d9d6cd');
  p.r(5, PILLAR_H - 22, 30, 8, '#b3b0a7');
  p.r(3, 0, 34, 10, '#bdbab1');
  p.r(3, 0, 34, 3, '#d9d6cd');
  p.r(6, 10, 28, 5, '#a29f96');
  // blue pennant ring
  p.r(8, 38, 24, 4, PAL.blue);
  p.r(8, 38, 24, 1, PAL.gold);
  p.r(0, PILLAR_H - 3, TILE, 3, 'rgba(0,0,0,0.2)');
  p.outline(PAL.ink);
  return p.c;
}

export const PLANT_H = 66;
export function renderPlant(): HTMLCanvasElement {
  const p = new Pix(TILE, PLANT_H);
  const rand = rng(99);
  const greens = ['#2f6b4f', '#3f8a5f', '#58a873', '#245a42'];
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI - Math.PI;
    const len = 12 + rand() * 18;
    const x0 = 20;
    const y0 = 36;
    p.line(x0, y0, Math.round(x0 + Math.cos(a) * len), Math.round(y0 + Math.sin(a) * len * 1.3), greens[i % 4], 3);
  }
  p.r(10, 40, 20, 4, '#b5683a');
  p.r(8, 42, 24, 4, '#c97a48');
  p.r(11, 46, 18, 16, '#b5683a');
  p.r(11, 46, 3, 16, '#d38a58');
  p.r(11, 58, 18, 4, '#8f4f2a');
  p.r(14, 41, 12, 2, '#3b2615');
  p.outline(PAL.ink);
  return p.c;
}

export const DESK_OVERHANG = 14;
export function renderDesk(w: number): HTMLCanvasElement {
  const W = w * TILE;
  const H = TILE + DESK_OVERHANG;
  const p = new Pix(W, H);
  p.r(0, 0, W, 22, '#c4905c');
  p.r(2, 2, W - 4, 18, '#d4a46c');
  p.r(0, 20, W, 2, '#8a5a38');
  p.r(0, 22, W, H - 22, '#5b3a24');
  for (let x = 6; x < W - 12; x += 28) {
    p.r(x, 28, 22, H - 36, '#6e4529');
    p.r(x, 28, 22, 1, '#8a5a38');
  }
  p.r(0, H - 4, W, 4, '#3f2615');
  // Duke plaque
  p.r(W / 2 - 22, 24, 44, H - 32, PAL.blue);
  p.r(W / 2 - 22, 24, 44, 2, PAL.gold);
  p.r(W / 2 - 22, H - 10, 44, 2, PAL.gold);
  p.glyph(FONT_GLYPHS.D, W / 2 - 3, 28, '#f2e6c9');
  // computer
  p.r(40, 2, 24, 14, '#1b2540');
  p.r(42, 4, 20, 9, '#5fa3ee');
  p.r(48, 16, 8, 3, '#1b2540');
  // bell + books
  p.e(W - 70, 12, 6, 5, PAL.gold);
  p.r(W - 78, 14, 16, 2, '#a98a45');
  p.r(W - 44, 6, 22, 5, '#8e2a3a');
  p.r(W - 42, 3, 18, 4, '#2f6b4f');
  p.r(W - 44, 8, 22, 1, PAL.gold);
  p.outline(PAL.ink);
  return p.c;
}

/* ---------- collectible books ---------- */
const BOOK_STYLES = [
  { cover: '#00539B', hi: '#2f7fd6', trim: '#d8b36a', mark: 'D' },
  { cover: '#8e2a3a', hi: '#b8485a', trim: '#d8b36a', mark: 'cross' },
  { cover: '#2f6b4f', hi: '#4a9a75', trim: '#e8e0c8', mark: 'star' },
  { cover: '#5a3a8a', hi: '#7c58b4', trim: '#d8b36a', mark: 'moon' },
  { cover: '#d9822b', hi: '#f0a24d', trim: '#1b2540', mark: 'dot' },
];

export function renderBook(i: number): HTMLCanvasElement {
  const s = BOOK_STYLES[i % BOOK_STYLES.length];
  const p = new Pix(22, 26);
  // pages
  p.r(5, 3, 15, 20, '#f2e6c9');
  p.r(5, 21, 15, 2, '#cdbf9c');
  // cover
  p.r(2, 2, 16, 21, s.cover);
  p.r(2, 2, 3, 21, s.hi);
  p.r(2, 2, 16, 1, s.hi);
  p.r(2, 22, 16, 1, 'rgba(0,0,0,0.3)');
  p.r(4, 4, 12, 1, s.trim);
  p.r(4, 20, 12, 1, s.trim);
  p.r(15, 4, 1, 17, s.trim);
  p.r(4, 4, 1, 17, s.trim);
  const cx = 10;
  const cy = 12;
  switch (s.mark) {
    case 'D':
      p.glyph(FONT_GLYPHS.D, cx - 2, cy - 3, '#f2e6c9');
      break;
    case 'cross':
      p.r(cx, cy - 4, 2, 9, s.trim);
      p.r(cx - 3, cy - 1, 8, 2, s.trim);
      break;
    case 'star':
      p.r(cx - 1, cy - 4, 3, 9, s.trim);
      p.r(cx - 4, cy - 1, 9, 3, s.trim);
      break;
    case 'moon':
      p.e(cx + 1, cy, 4, 4, s.trim);
      p.e(cx + 3, cy - 1, 3.5, 3.5, s.cover);
      break;
    default:
      p.e(cx + 1, cy, 3.5, 3.5, s.trim);
  }
  p.outline(PAL.ink);
  return p.c;
}

/* ---------- lighting ---------- */
export function renderGlow(): HTMLCanvasElement {
  const p = new Pix(MAP_W * TILE, MAP_H * TILE);
  const glow = (x: number, y: number, r: number, a: number) => {
    const g = p.g.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, `rgba(255,200,110,${a})`);
    g.addColorStop(1, 'rgba(255,200,110,0)');
    p.g.fillStyle = g;
    p.g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  for (const t of TABLES) glow((t.x + 0.8) * TILE, (t.y + 0.5) * TILE, 120, 0.42);
  for (const wx of WINDOW_XS) glow(wx * TILE + 20, TILE * 2 + 30, 90, 0.22);
  glow(DOOR_X * TILE + TILE, (MAP_H - 2) * TILE - 10, 130, 0.3);
  glow((DESK.x + 1.5) * TILE, DESK.y * TILE + 10, 120, 0.3);
  return p.c;
}

export function renderVignette(w: number, h: number): HTMLCanvasElement {
  const p = new Pix(w, h);
  const g = p.g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
  g.addColorStop(0, 'rgba(8,10,28,0)');
  g.addColorStop(1, 'rgba(8,10,28,0.62)');
  p.g.fillStyle = g;
  p.g.fillRect(0, 0, w, h);
  return p.c;
}

export function bookCount(): number {
  return BOOKS.length;
}
