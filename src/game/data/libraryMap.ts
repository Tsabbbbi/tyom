/**
 * Hand-designed layout of the fictional Duke library.
 * Tile grid: 48 x 34 tiles of 40px (1920 x 1360px).
 *
 *   - Gothic north wall with arched windows, front door on the south wall
 *   - West & east stacks: parallel shelf rows separated by 3-4 tile reading aisles
 *   - Central nave with columns, a grand rug and four study tables
 *   - Northern lounge with two long tables, southern circulation desk
 */
export const TILE = 40;
export const MAP_W = 48;
export const MAP_H = 34;

export const T = {
  FLOOR: 0,
  WALL: 1,
  SHELF: 2,
  TABLE: 3,
  PILLAR: 4,
  DESK: 5,
  DOOR: 6,
  PLANT: 7,
} as const;
export type TileType = (typeof T)[keyof typeof T];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BookSpot {
  id: number;
  tx: number;
  ty: number;
  title: string;
  place: string;
}

export const SPAWN = { tx: 23, ty: 30 };

export const BOOKS: BookSpot[] = [
  { id: 0, tx: 4, ty: 4, title: 'Gothic Wonders of Duke Chapel', place: 'North-west stacks' },
  { id: 1, tx: 41, ty: 18, title: 'Blue Devil Basketball Lore', place: 'East stacks' },
  { id: 2, tx: 24, ty: 8, title: 'A Scholar’s Guide to Durham', place: 'Northern lounge' },
  { id: 3, tx: 3, ty: 26, title: 'Secrets of Kunshan', place: 'South-west stacks' },
  { id: 4, tx: 44, ty: 30, title: 'The Great Duke Cookbook', place: 'South-east corner' },
];

export const TABLES: Rect[] = [
  { x: 18, y: 5, w: 3, h: 2 },
  { x: 27, y: 5, w: 3, h: 2 },
  { x: 19, y: 12, w: 3, h: 2 },
  { x: 26, y: 12, w: 3, h: 2 },
  { x: 19, y: 16, w: 3, h: 2 },
  { x: 26, y: 16, w: 3, h: 2 },
];

export const RUG: Rect = { x: 18, y: 11, w: 12, h: 8 };
export const DESK: Rect = { x: 19, y: 28, w: 10, h: 1 };
export const WINDOW_XS = [3, 8, 13, 18, 23, 28, 33, 38, 43];
export const DOOR_X = 23; // 2 tiles wide
export const PILLARS: { tx: number; ty: number }[] = [];
export const PLANTS = [
  { tx: 16, ty: 3 },
  { tx: 31, ty: 3 },
  { tx: 16, ty: 30 },
  { tx: 31, ty: 30 },
];
export const SHELF_ROW_YS = [2, 6, 10, 15, 20, 24, 28];
export const RUNNERS: (Rect & { color: 'burgundy' | 'navy' })[] = [];

export interface MapData {
  grid: TileType[][];
  /** Contiguous shelf runs (rendered as one unit each). */
  shelfRuns: { x: number; y: number; w: number }[];
}

export function buildMap(): MapData {
  const grid: TileType[][] = Array.from({ length: MAP_H }, () => Array<TileType>(MAP_W).fill(T.FLOOR));
  const set = (x: number, y: number, t: TileType) => {
    if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) grid[y][x] = t;
  };
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (y < 2 || y >= MAP_H - 2 || x === 0 || x === MAP_W - 1) set(x, y, T.WALL);
    }
  }
  set(DOOR_X, MAP_H - 2, T.DOOR);
  set(DOOR_X + 1, MAP_H - 2, T.DOOR);
  set(DOOR_X, MAP_H - 1, T.DOOR);
  set(DOOR_X + 1, MAP_H - 1, T.DOOR);

  const shelfRuns: MapData['shelfRuns'] = [];
  const shelfRun = (x1: number, x2: number, y: number) => {
    for (let x = x1; x <= x2; x++) set(x, y, T.SHELF);
    shelfRuns.push({ x: x1, y, w: x2 - x1 + 1 });
  };
  const mirror = (x1: number, x2: number): [number, number] => [MAP_W - 1 - x2, MAP_W - 1 - x1];

  for (const y of SHELF_ROW_YS) {
    const segs: [number, number][] = y === 2 ? [[2, 13]] : [[2, 6], [9, 13]];
    for (const [a, b] of segs) {
      shelfRun(a, b, y);
      const [ma, mb] = mirror(a, b);
      shelfRun(ma, mb, y);
    }
  }
  // Central south shelves
  shelfRun(15, 20, 24);
  shelfRun(27, 32, 24);
  // Tables, desk
  for (const t of TABLES) for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) set(x, y, T.TABLE);
  for (let x = DESK.x; x < DESK.x + DESK.w; x++) set(x, DESK.y, T.DESK);
  // Nave columns
  for (const y of [12, 15, 18]) {
    for (const x of [15, 32]) {
      set(x, y, T.PILLAR);
      PILLARS.push({ tx: x, ty: y });
    }
  }
  for (const p of PLANTS) set(p.tx, p.ty, T.PLANT);

  // Decorative runners down the middle of each wing aisle (walkable).
  const rows = SHELF_ROW_YS;
  for (let i = 0; i < rows.length - 1; i++) {
    const mid = Math.round((rows[i] + rows[i + 1]) / 2);
    const color = i % 2 === 0 ? 'burgundy' : 'navy';
    RUNNERS.push({ x: 2, y: mid, w: 12, h: 1, color });
    RUNNERS.push({ x: 34, y: mid, w: 12, h: 1, color });
  }
  return { grid, shelfRuns };
}

export const MAP: MapData = buildMap();

export function tileAt(tx: number, ty: number): TileType {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return T.WALL;
  return MAP.grid[ty][tx];
}

export function isSolidTile(t: TileType): boolean {
  return t !== T.FLOOR;
}

/** Does an axis-aligned pixel rect overlap any solid tile? */
export function rectHitsSolid(x: number, y: number, w: number, h: number): boolean {
  const x0 = Math.floor(x / TILE);
  const x1 = Math.floor((x + w - 0.001) / TILE);
  const y0 = Math.floor(y / TILE);
  const y1 = Math.floor((y + h - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolidTile(tileAt(tx, ty))) return true;
  return false;
}

export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

/** Player collision box (feet-anchored). */
export const HITBOX = { w: 20, h: 12 };

export function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}
