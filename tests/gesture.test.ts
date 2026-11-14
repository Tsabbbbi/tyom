import { describe, expect, it } from 'vitest';
import {
  classifyGesture,
  GestureSmoother,
  type Direction,
  type Landmark,
} from '../src/game/systems/GestureClassifier';

/**
 * Builds a synthetic right-hand-ish landmark set. `idx` is the index fingertip direction in
 * RAW image coordinates (unit vector, y down). `others` controls curled vs extended fingers.
 */
function handUpright(idx: { dx: number; dy: number }, others: 'curled' | 'open' = 'curled', indexBent = false): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.7 }));
  const wrist = { x: 0.5, y: 0.8 };
  lm[0] = wrist;
  // hand size = wrist -> middle MCP = 0.2
  lm[9] = { x: 0.5, y: 0.6 };
  const mcp = { x: 0.45, y: 0.62 };
  lm[5] = mcp;
  const seg = 0.07;
  const at = (n: number) => ({ x: mcp.x + idx.dx * seg * n, y: mcp.y + idx.dy * seg * n });
  lm[6] = at(1);
  if (indexBent) {
    // fold the finger back toward the palm
    lm[7] = { x: lm[6].x - idx.dy * 0.04, y: lm[6].y + idx.dx * 0.04 };
    lm[8] = { x: mcp.x + 0.01, y: mcp.y + 0.03 };
  } else {
    lm[7] = at(2);
    lm[8] = at(3);
  }
  const finger = (pipI: number, dipI: number, tipI: number, x: number) => {
    lm[pipI] = { x, y: 0.62 - 0.0 };
    if (others === 'open') {
      lm[pipI] = { x, y: 0.55 };
      lm[dipI] = { x, y: 0.47 };
      lm[tipI] = { x, y: 0.4 };
    } else {
      lm[pipI] = { x, y: 0.64 };
      lm[dipI] = { x, y: 0.7 };
      lm[tipI] = { x, y: 0.72 }; // closer to wrist than PIP
    }
  };
  finger(10, 11, 12, 0.5);
  finger(14, 15, 16, 0.55);
  finger(18, 19, 20, 0.6);
  return lm;
}

/** Whole-hand pose whose index finger points along `idx` (the wrist sits behind the finger, like a real hand). */
function hand(idx: { dx: number; dy: number }, others: 'curled' | 'open' = 'curled', indexBent = false): Landmark[] {
  // Build upright (index along local "up"), then rotate everything about the wrist so up -> idx.
  const lm = handUpright({ dx: 0, dy: -1 }, others, indexBent);
  const a = Math.atan2(idx.dy, idx.dx) - Math.atan2(-1, 0);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const w = lm[0];
  return lm.map((p) => {
    const x = p.x - w.x;
    const y = p.y - w.y;
    return { x: w.x + x * c - y * s, y: w.y + x * s + y * c };
  });
}

const dirs: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

describe('classifyGesture (non-mirrored)', () => {
  for (const d of ['up', 'down', 'left', 'right'] as Direction[]) {
    it(`points ${d}`, () => {
      expect(classifyGesture(hand(dirs[d]), { mirrored: false }).direction).toBe(d);
    });
  }
  it('tolerates ~20deg tilt', () => {
    const a = (20 * Math.PI) / 180;
    expect(classifyGesture(hand({ dx: Math.sin(a), dy: -Math.cos(a) }), { mirrored: false }).direction).toBe('up');
  });
  it('rejects the diagonal dead zone', () => {
    const r = classifyGesture(hand({ dx: Math.SQRT1_2, dy: -Math.SQRT1_2 }), { mirrored: false });
    expect(r.direction).toBeNull();
    expect(r.reason).toBe('dead-zone');
  });
  it('keeps the current direction across the boundary (hysteresis)', () => {
    const a = (40 * Math.PI) / 180; // 40deg off up -> outside 35 but inside sticky 45
    const lm = hand({ dx: Math.sin(a), dy: -Math.cos(a) });
    expect(classifyGesture(lm, { mirrored: false }, null).direction).toBeNull();
    expect(classifyGesture(lm, { mirrored: false }, 'up').direction).toBe('up');
  });
});

describe('classifyGesture (mirrored selfie camera)', () => {
  it('raw image-left finger is the player pointing right', () => {
    expect(classifyGesture(hand(dirs.left), { mirrored: true }).direction).toBe('right');
    expect(classifyGesture(hand(dirs.right), { mirrored: true }).direction).toBe('left');
  });
  it('does not flip vertical directions', () => {
    expect(classifyGesture(hand(dirs.up), { mirrored: true }).direction).toBe('up');
    expect(classifyGesture(hand(dirs.down), { mirrored: true }).direction).toBe('down');
  });
});

describe('invalid gestures', () => {
  it('rejects a closed fist', () => {
    const r = classifyGesture(hand(dirs.up, 'curled', true), { mirrored: false });
    expect(r.direction).toBeNull();
  });
  it('rejects an open hand', () => {
    const r = classifyGesture(hand(dirs.up, 'open'), { mirrored: false });
    expect(r.direction).toBeNull();
    expect(r.reason).toBe('fingers-open');
  });
  it('rejects missing / short landmark sets', () => {
    expect(classifyGesture(null).direction).toBeNull();
    expect(classifyGesture([]).reason).toBe('no-hand');
    expect(classifyGesture(hand(dirs.up).slice(0, 10)).direction).toBeNull();
  });
});

describe('GestureSmoother', () => {
  it('needs consecutive frames to switch direction', () => {
    const s = new GestureSmoother({ framesToSwitch: 2, framesToStop: 2 });
    expect(s.update('up')).toBeNull();
    expect(s.update('up')).toBe('up');
    expect(s.update('left')).toBe('up'); // jitter ignored
    expect(s.update('up')).toBe('up');
    expect(s.update('left')).toBe('up');
    expect(s.update('left')).toBe('left');
  });
  it('tolerates a single dropped frame but stops after sustained invalid input', () => {
    const s = new GestureSmoother({ framesToSwitch: 1, framesToStop: 2 });
    s.update('right');
    expect(s.update(null)).toBe('right');
    expect(s.update(null)).toBeNull();
  });
  it('tracking loss clears immediately via reset', () => {
    const s = new GestureSmoother({ framesToSwitch: 1, framesToStop: 5 });
    s.update('down');
    expect(s.direction).toBe('down');
    s.reset();
    expect(s.direction).toBeNull();
  });
});
