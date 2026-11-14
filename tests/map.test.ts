import { describe, expect, it } from 'vitest';
import { BOOKS, HITBOX, MAP_H, MAP_W, SPAWN, T, TILE, rectHitsSolid, tileAt, tileCenter } from '../src/game/data/libraryMap';

/** Flood fill at 4px resolution using the REAL player hitbox. */
function reachable() {
  const step = 4;
  const key = (x: number, y: number) => `${x},${y}`;
  const start = tileCenter(SPAWN.tx, SPAWN.ty);
  // positions are the hitbox centre
  const hits = (cx: number, cy: number) => rectHitsSolid(cx - HITBOX.w / 2, cy - HITBOX.h / 2, HITBOX.w, HITBOX.h);
  const seen = new Set<string>();
  const q: [number, number][] = [[start.x, start.y]];
  seen.add(key(start.x, start.y));
  while (q.length) {
    const [x, y] = q.pop()!;
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = key(nx, ny);
      if (seen.has(k) || hits(nx, ny)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return { seen, key, hits };
}

describe('library map', () => {
  it('has the expected size and solid border', () => {
    for (let x = 0; x < MAP_W; x++) {
      expect(tileAt(x, 0)).toBe(T.WALL);
      expect(tileAt(x, MAP_H - 1)).not.toBe(T.FLOOR);
    }
    for (let y = 0; y < MAP_H; y++) expect(tileAt(0, y)).toBe(T.WALL);
  });
  it('has exactly five books, each on a free tile', () => {
    expect(BOOKS).toHaveLength(5);
    expect(new Set(BOOKS.map((b) => b.id)).size).toBe(5);
    for (const b of BOOKS) expect(tileAt(b.tx, b.ty)).toBe(T.FLOOR);
  });
  it('spawn is walkable and every book is reachable with the real hitbox', () => {
    const { seen, key, hits } = reachable();
    const s = tileCenter(SPAWN.tx, SPAWN.ty);
    expect(hits(s.x, s.y)).toBe(false);
    for (const b of BOOKS) {
      const c = tileCenter(b.tx, b.ty);
      // allow nearest 4px grid cell within pickup radius
      const near = [...Array(11).keys()].some((i) => [...Array(11).keys()].some((j) => seen.has(key(s.x + Math.round((c.x - s.x) / 4) * 4 + (i - 5) * 4, s.y + Math.round((c.y - s.y) / 4) * 4 + (j - 5) * 4))));
      expect(near, `book ${b.title} unreachable`).toBe(true);
    }
  });
  it('the player cannot be placed inside bookshelves, tables or walls', () => {
    expect(rectHitsSolid(4 * TILE, 2 * TILE, HITBOX.w, HITBOX.h)).toBe(true); // shelf
    expect(rectHitsSolid(19 * TILE + 5, 12 * TILE + 5, HITBOX.w, HITBOX.h)).toBe(true); // table
    expect(rectHitsSolid(10, 10, HITBOX.w, HITBOX.h)).toBe(true); // wall
  });
  it('reachable area covers most of the open floor (no sealed-off wings)', () => {
    const { seen } = reachable();
    let floor = 0;
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (tileAt(x, y) === T.FLOOR) floor++;
    const reachableTiles = new Set([...seen].map((k) => k.split(',').map(Number)).map(([x, y]) => `${Math.floor(x / TILE)},${Math.floor(y / TILE)}`));
    expect(reachableTiles.size / floor).toBeGreaterThan(0.9);
  });
});
