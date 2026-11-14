import { FONT_GLYPHS, Pix } from './pixel';

export type Dir = 'down' | 'left' | 'right' | 'up';
export type CharacterId = 'devil' | 'deer';

export const FRAME_W = 32;
export const FRAME_H = 48;
/** Frame columns: 0-1 idle, 2-5 walk. Rows follow DIR_ROWS. */
export const FRAME_COLS = 6;
export const DIR_ROWS: Dir[] = ['down', 'left', 'right', 'up'];

export const CHARACTERS: Record<CharacterId, { name: string; school: string; short: string; number: number }> = {
  devil: { name: 'BLUE DEVIL', school: 'DUKE UNIVERSITY', short: 'Blue Devil', number: 1 },
  deer: { name: 'BLUE DEER', school: 'DUKE KUNSHAN UNIVERSITY', short: 'Blue Deer', number: 8 },
};

const C = {
  ink: '#0b1226',
  navy: '#101B35',
  blue: '#00539B',
  blueLt: '#2f7fd6',
  blueHi: '#5fa3ee',
  blueDk: '#003a72',
  white: '#ffffff',
  paper: '#e8eef7',
  gray: '#b9c5d8',
  skin: '#f4b890',
  skinDk: '#d58f68',
  gold: '#d8b36a',
  brown: '#a1683c',
  brownLt: '#d39a62',
  brownDk: '#4e2f1c',
  pink: '#f29bb5',
  pinkDk: '#d4708f',
  muzzle: '#cfeaf9',
  cape: '#c5daf0',
  capeDk: '#8fb2dc',
  black: '#15151d',
  blush: '#f08a7a',
  mouth: '#8a2b2b',
};

interface Pose {
  b: number; // upper-body bob (negative = up)
  lift: [number, number]; // left/right leg lift in px
  arm: [number, number]; // left/right arm vertical offset
  stride: number; // side view: leg spread in px
  flutter: number; // cape flutter
}

function poseFor(frame: number): Pose {
  switch (frame) {
    case 0:
      return { b: 0, lift: [0, 0], arm: [0, 0], stride: 0, flutter: 0 };
    case 1:
      return { b: 1, lift: [0, 0], arm: [0, 0], stride: 0, flutter: 1 };
    case 2:
      return { b: 0, lift: [0, 0], arm: [0, 0], stride: 3, flutter: 0 };
    case 3:
      return { b: -1, lift: [2, 0], arm: [-1, 1], stride: 0, flutter: 1 };
    case 4:
      return { b: 0, lift: [0, 0], arm: [0, 0], stride: -3, flutter: 0 };
    default:
      return { b: -1, lift: [0, 2], arm: [1, -1], stride: 0, flutter: 1 };
  }
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                      */
/* ------------------------------------------------------------------ */

function jerseyFront(p: Pix, id: CharacterId, b: number): void {
  // torso
  p.r(10, 26 + b, 12, 11 - b, C.white);
  p.r(10, 26 + b, 1, 11 - b, C.blue);
  p.r(21, 26 + b, 1, 11 - b, C.blue);
  p.r(11, 26 + b, 1, 11 - b, C.paper);
  // neckline
  p.r(13, 26 + b, 6, 1, C.blue);
  p.r(14, 27 + b, 4, 1, C.blue);
  // number
  p.glyph(FONT_GLYPHS[String(CHARACTERS[id].number)], 14, 28 + b, C.blue);
}

function shorts(p: Pix, w: boolean): void {
  p.r(10, 36, 12, 4, w ? C.white : C.white);
  p.r(10, 36, 12, 1, C.blue);
  p.r(10, 39, 12, 1, C.blue);
  p.r(10, 36, 1, 4, C.blue);
  p.r(21, 36, 1, 4, C.blue);
}

/* ------------------------------------------------------------------ */
/* Blue Devil                                                         */
/* ------------------------------------------------------------------ */

function devilHorns(p: Pix, b: number): void {
  // curved white horns, left then mirrored
  const left: [number, number, number][] = [
    [7, 3, 1],
    [7, 4, 2],
    [7, 5, 3],
    [8, 6, 3],
    [8, 7, 4],
  ];
  for (const [x, y, w] of left) p.rm(x, y + b + 0, w, 1, C.paper);
  p.rm(7, 3 + b, 1, 1, C.white);
  p.rm(7, 4 + b, 1, 2, C.white);
  p.rm(9, 7 + b, 2, 1, C.gray);
}

function devilHeadFront(p: Pix, b: number): void {
  devilHorns(p, b);
  p.e(16, 15 + b, 10, 9.5, C.blue);
  p.e(12, 10 + b, 3.5, 1.6, C.blueLt);
  p.r(9, 9 + b, 2, 1, C.blueHi);
  // ears (skin points poking out of the hood)
  p.rm(5, 15 + b, 3, 1, C.skin);
  p.rm(4, 16 + b, 4, 1, C.skin);
  p.rm(4, 17 + b, 3, 1, C.skinDk);
  p.pm(3, 16 + b, C.skinDk);
  // face
  p.e(16, 17.5 + b, 6.6, 6.8, C.skin);
  // eye mask
  p.r(9, 13 + b, 14, 4, C.blue);
  p.r(10, 12 + b, 12, 1, C.blue);
  p.rm(9, 17 + b, 2, 1, C.blue);
  p.rm(10, 13 + b, 4, 1, C.blueDk); // brows
  p.rm(11, 14 + b, 3, 2, C.white);
  p.rm(13, 15 + b, 1, 1, C.navy);
  p.rm(11, 14 + b, 1, 1, C.paper);
  // nose, cheeks, smirk, goatee
  p.r(15, 18 + b, 2, 2, C.skinDk);
  p.pm(10, 19 + b, C.blush);
  p.r(14, 21 + b, 4, 1, C.mouth);
  p.p(18, 20 + b, C.mouth);
  p.r(14, 23 + b, 4, 1, C.black);
  p.r(15, 24 + b, 2, 2, C.black);
}

function devilHeadBack(p: Pix, b: number): void {
  devilHorns(p, b);
  p.e(16, 15 + b, 10, 9.5, C.blue);
  p.e(12, 10 + b, 3.5, 1.6, C.blueLt);
  p.rm(5, 15 + b, 3, 2, C.skin);
  p.e(16, 18 + b, 7.5, 5.5, C.blueDk);
  p.e(16, 16 + b, 8, 6, C.blue);
  p.r(15, 21 + b, 2, 2, C.blueDk);
}

function devilHeadSide(p: Pix, b: number): void {
  // facing right; far horn then near horn
  p.r(17, 5 + b, 2, 1, C.gray);
  p.r(17, 4 + b, 3, 1, C.gray);
  p.r(19, 3 + b, 2, 1, C.gray);
  p.r(18, 6 + b, 4, 2, C.gray);
  p.r(11, 7 + b, 3, 1, C.paper);
  p.r(10, 6 + b, 2, 1, C.paper);
  p.r(9, 4 + b, 2, 2, C.white);
  p.r(9, 3 + b, 1, 1, C.white);
  p.r(12, 7 + b, 3, 1, C.gray);
  p.e(15, 15 + b, 9.5, 9.5, C.blue);
  p.e(12, 10 + b, 3, 1.5, C.blueLt);
  // face (profile, toward right)
  p.e(19, 17.5 + b, 5.5, 6.5, C.skin);
  p.r(23, 18 + b, 3, 2, C.skin); // nose
  p.r(25, 19 + b, 1, 1, C.skinDk);
  p.r(14, 12 + b, 12, 1, C.blue);
  p.r(14, 13 + b, 11, 4, C.blue); // mask band
  p.r(20, 14 + b, 3, 2, C.white);
  p.r(22, 15 + b, 1, 1, C.navy);
  p.r(20, 13 + b, 4, 1, C.blueDk);
  p.r(21, 21 + b, 3, 1, C.mouth);
  p.r(21, 23 + b, 3, 1, C.black);
  p.r(22, 24 + b, 2, 2, C.black);
  // ear
  p.r(11, 15 + b, 3, 2, C.skin);
  p.r(10, 16 + b, 2, 1, C.skinDk);
}

function devilBodyFront(p: Pix, pose: Pose): void {
  const { b } = pose;
  // cape (behind arms)
  p.r(8, 27 + b, 16, 12, C.cape);
  p.r(7, 34, 18, 6, C.cape);
  p.r(7, 39, 18, 1, C.capeDk);
  p.r(8, 27 + b, 16, 1, C.capeDk);
  jerseyFront(p, 'devil', b);
  shorts(p, true);
  // arms + gloves
  for (const [side, ay] of [[0, pose.arm[0]], [1, pose.arm[1]]] as [number, number][]) {
    const x = side === 0 ? 6 : 22;
    p.r(x, 27 + b + ay, 4, 8, C.blue);
    p.r(x, 27 + b + ay, 1, 8, C.blueLt);
    p.r(x, 34 + b + ay, 4, 3, C.white);
    p.r(x, 36 + b + ay, 4, 1, C.gray);
  }
  // cape clasp
  p.pm(10, 27 + b, C.gold);
}

function devilBodyBack(p: Pix, pose: Pose): void {
  const { b } = pose;
  jerseyFront(p, 'devil', b); // for the white edges peeking out
  shorts(p, true);
  for (const [side, ay] of [[0, pose.arm[0]], [1, pose.arm[1]]] as [number, number][]) {
    const x = side === 0 ? 6 : 22;
    p.r(x, 27 + b + ay, 4, 8, C.blue);
    p.r(x, 34 + b + ay, 4, 3, C.white);
  }
  // cape over the back
  p.r(9, 26 + b, 14, 14, C.cape);
  p.r(8, 35, 16, 5, C.cape);
  p.r(8, 39, 16, 1, C.capeDk);
  p.r(15, 27 + b, 2, 11 - b, C.capeDk);
  p.r(9, 26 + b, 14, 1, C.capeDk);
  p.rm(11, 27 + b, 1, 1, C.gold);
}

function devilBodySide(p: Pix, pose: Pose): void {
  const { b, flutter } = pose;
  // cape trailing behind (left)
  p.r(8 - flutter, 27 + b, 6 + flutter, 13, C.cape);
  p.r(6 - flutter, 36, 8 + flutter, 4, C.cape);
  p.r(6 - flutter, 39, 8 + flutter, 1, C.capeDk);
  p.r(13, 27 + b, 1, 12, C.capeDk);
  // torso
  p.r(12, 26 + b, 9, 11 - b, C.white);
  p.r(20, 26 + b, 1, 11 - b, C.blue);
  p.r(12, 26 + b, 1, 11 - b, C.paper);
  p.r(13, 26 + b, 6, 1, C.blue);
  p.r(12, 36, 9, 4, C.white);
  p.r(12, 36, 9, 1, C.blue);
  p.r(12, 39, 9, 1, C.blue);
  p.r(20, 36, 1, 4, C.blue);
  // arm swing
  const sw = pose.stride > 0 ? 3 : pose.stride < 0 ? -3 : 0;
  const ax = 14 - sw;
  p.r(ax, 28 + b, 4, 7, C.blue);
  p.r(ax, 28 + b, 1, 7, C.blueLt);
  p.r(ax, 34 + b, 4, 3, C.white);
  p.r(ax, 36 + b, 4, 1, C.gray);
}

/* ------------------------------------------------------------------ */
/* Blue Deer                                                          */
/* ------------------------------------------------------------------ */

function antlerSet(p: Pix, b: number): void {
  const a = C.brown;
  const l = C.brownLt;
  // left antler, mirrored to the right
  p.rm(11, 6 + b, 3, 3, a);
  p.rm(10, 4 + b, 3, 3, a);
  p.rm(9, 2 + b, 3, 3, l);
  p.rm(13, 3 + b, 2, 3, l); // inner tine
  p.rm(6, 4 + b, 4, 2, a); // outer tine
  p.rm(5, 3 + b, 2, 2, l);
  p.rm(11, 6 + b, 1, 3, C.brownDk);
}

function deerHeadFront(p: Pix, b: number): void {
  antlerSet(p, b);
  // ears (wide, pink inside)
  p.rm(1, 10 + b, 8, 5, C.blue);
  p.rm(2, 9 + b, 6, 1, C.blue);
  p.rm(2, 15 + b, 5, 1, C.blueDk);
  p.rm(3, 11 + b, 4, 3, C.pink);
  p.rm(3, 13 + b, 2, 1, C.pinkDk);
  // head
  p.e(16, 15 + b, 10, 9.5, C.blue);
  p.e(12, 9.5 + b, 3.5, 1.4, C.blueLt);
  p.rm(9, 8 + b, 2, 1, C.blueHi);
  p.r(14, 7 + b, 4, 2, C.blueLt);
  // eyes
  p.rm(9, 11 + b, 5, 6, C.white);
  p.rm(10, 10 + b, 3, 1, C.white);
  p.rm(11, 12 + b, 3, 4, C.brownLt);
  p.rm(12, 13 + b, 2, 3, C.brownDk);
  p.rm(11, 12 + b, 1, 1, C.white);
  p.rm(10, 9 + b, 4, 1, C.brownDk); // brows
  // muzzle
  p.e(16, 20 + b, 6, 4, C.muzzle);
  p.e(16, 21 + b, 5, 2.4, C.white);
  p.r(14, 17 + b, 4, 2, C.ink);
  p.r(15, 19 + b, 2, 1, C.ink);
  p.p(14, 22 + b, C.navy);
  p.p(18, 22 + b, C.navy);
  p.r(15, 23 + b, 3, 1, C.navy);
  p.r(16, 24 + b, 1, 1, C.pink);
  p.pm(8, 19 + b, C.pink);
}

function deerHeadBack(p: Pix, b: number): void {
  antlerSet(p, b);
  p.rm(1, 10 + b, 8, 5, C.blue);
  p.rm(2, 15 + b, 5, 1, C.blueDk);
  p.rm(3, 11 + b, 3, 2, C.pinkDk);
  p.e(16, 15 + b, 10, 9.5, C.blue);
  p.e(12, 9.5 + b, 3.5, 1.4, C.blueLt);
  p.e(16, 19 + b, 6, 4, C.blueDk);
  p.r(14, 12 + b, 4, 6, C.blueLt);
}

function deerHeadSide(p: Pix, b: number): void {
  // far antler (lighter), near antler
  p.r(16, 5 + b, 2, 2, C.brownLt);
  p.r(17, 3 + b, 2, 2, C.brownLt);
  p.r(19, 2 + b, 2, 1, C.brownLt);
  p.r(10, 6 + b, 2, 2, C.brown);
  p.r(11, 4 + b, 2, 2, C.brown);
  p.r(12, 2 + b, 2, 2, C.brown);
  p.r(13, 1 + b, 3, 1, C.brownLt);
  p.r(8, 4 + b, 3, 1, C.brown);
  p.r(7, 3 + b, 1, 1, C.brownLt);
  p.r(14, 2 + b, 1, 3, C.brownLt);
  // ear (back of head)
  p.r(4, 9 + b, 7, 5, C.blue);
  p.r(3, 10 + b, 2, 3, C.blue);
  p.r(5, 10 + b, 4, 3, C.pink);
  p.r(5, 12 + b, 2, 1, C.pinkDk);
  // head
  p.e(15, 15 + b, 9.5, 9.5, C.blue);
  p.e(12, 9.5 + b, 3, 1.4, C.blueLt);
  // muzzle sticking out right
  p.e(21, 19.5 + b, 5.5, 4, C.muzzle);
  p.r(22, 21 + b, 5, 2, C.white);
  p.r(25, 17 + b, 3, 3, C.ink);
  p.r(25, 17 + b, 1, 1, C.gray);
  p.r(22, 23 + b, 3, 1, C.navy);
  // eye
  p.r(17, 11 + b, 5, 6, C.white);
  p.r(18, 10 + b, 3, 1, C.white);
  p.r(19, 12 + b, 3, 4, C.brownLt);
  p.r(20, 13 + b, 2, 3, C.brownDk);
  p.r(19, 12 + b, 1, 1, C.white);
  p.r(17, 9 + b, 5, 1, C.brownDk);
  p.p(17, 19 + b, C.pink);
}

function deerBodyFront(p: Pix, pose: Pose): void {
  const { b } = pose;
  jerseyFront(p, 'deer', b);
  shorts(p, false);
  for (const [side, ay] of [[0, pose.arm[0]], [1, pose.arm[1]]] as [number, number][]) {
    const x = side === 0 ? 6 : 22;
    p.r(x, 27 + b + ay, 4, 8, C.blue);
    p.r(x, 27 + b + ay, 1, 8, C.blueLt);
    p.r(x, 34 + b + ay, 4, 3, C.brown);
    p.r(x, 36 + b + ay, 4, 1, C.brownDk);
  }
  // little tail tuft peeking out
  p.pm(9, 38, C.white);
}

function deerBodyBack(p: Pix, pose: Pose): void {
  const { b } = pose;
  p.r(10, 26 + b, 12, 11 - b, C.white);
  p.r(10, 26 + b, 1, 11 - b, C.blue);
  p.r(21, 26 + b, 1, 11 - b, C.blue);
  p.glyph(FONT_GLYPHS['8'], 14, 28 + b, C.blue);
  shorts(p, false);
  for (const [side, ay] of [[0, pose.arm[0]], [1, pose.arm[1]]] as [number, number][]) {
    const x = side === 0 ? 6 : 22;
    p.r(x, 27 + b + ay, 4, 8, C.blue);
    p.r(x, 34 + b + ay, 4, 3, C.brown);
    p.r(x, 36 + b + ay, 4, 1, C.brownDk);
  }
  // fluffy tail
  p.r(14, 37, 4, 3, C.white);
  p.r(15, 36, 2, 1, C.white);
}

function deerBodySide(p: Pix, pose: Pose): void {
  const { b } = pose;
  p.r(12, 26 + b, 9, 11 - b, C.white);
  p.r(20, 26 + b, 1, 11 - b, C.blue);
  p.r(12, 26 + b, 1, 11 - b, C.paper);
  p.r(13, 26 + b, 6, 1, C.blue);
  p.r(12, 36, 9, 4, C.white);
  p.r(12, 36, 9, 1, C.blue);
  p.r(12, 39, 9, 1, C.blue);
  p.r(20, 36, 1, 4, C.blue);
  // tail
  p.r(9, 35, 3, 3, C.white);
  const sw = pose.stride > 0 ? 3 : pose.stride < 0 ? -3 : 0;
  const ax = 14 - sw;
  p.r(ax, 28 + b, 4, 7, C.blue);
  p.r(ax, 28 + b, 1, 7, C.blueLt);
  p.r(ax, 34 + b, 4, 3, C.brown);
  p.r(ax, 36 + b, 4, 1, C.brownDk);
}

/* ------------------------------------------------------------------ */
/* Legs and feet                                                      */
/* ------------------------------------------------------------------ */

function legsFrontBack(p: Pix, id: CharacterId, pose: Pose): void {
  const legCol = C.blue;
  const hi = C.blueLt;
  const xs = [11, 17];
  xs.forEach((x, i) => {
    const lift = pose.lift[i];
    p.r(x, 40 - lift, 4, 5, legCol);
    p.r(x, 40 - lift, 1, 5, hi);
    if (id === 'devil') {
      p.r(x - 1, 44 - lift, 6, 2, C.blueDk);
      p.r(x - 1, 45 - lift, 6, 1, C.white);
      p.r(x, 44 - lift, 2, 1, C.blueLt);
    } else {
      p.r(x - 1, 44 - lift, 6, 2, C.brownDk);
      p.r(x, 44 - lift, 3, 1, C.brown);
    }
  });
}

function legsSide(p: Pix, id: CharacterId, pose: Pose): void {
  const s = pose.stride;
  const draw = (dx: number, lift: number, far: boolean) => {
    const x = 14 + dx;
    p.r(x, 40 - lift, 4, 5, far ? C.blueDk : C.blue);
    if (id === 'devil') {
      p.r(x - 1, 44 - lift, 7, 2, far ? C.navy : C.blueDk);
      p.r(x - 1, 45 - lift, 7, 1, C.white);
    } else {
      p.r(x - 1, 44 - lift, 7, 2, C.brownDk);
      if (!far) p.r(x + 1, 44 - lift, 4, 1, C.brown);
    }
  };
  draw(-s, s < 0 ? 1 : 0, true);
  draw(s, s > 0 ? 1 : 0, false);
  if (pose.lift[0] || pose.lift[1]) {
    /* mid-step frames already handled by stride sign */
  }
}

/* ------------------------------------------------------------------ */

export function drawFrame(id: CharacterId, dir: Dir, frame: number): HTMLCanvasElement {
  const p = new Pix(FRAME_W, FRAME_H);
  const pose = poseFor(frame);
  const isSide = dir === 'left' || dir === 'right';

  if (dir === 'down') {
    legsFrontBack(p, id, pose);
    id === 'devil' ? devilBodyFront(p, pose) : deerBodyFront(p, pose);
    id === 'devil' ? devilHeadFront(p, pose.b) : deerHeadFront(p, pose.b);
  } else if (dir === 'up') {
    legsFrontBack(p, id, pose);
    id === 'devil' ? devilBodyBack(p, pose) : deerBodyBack(p, pose);
    id === 'devil' ? devilHeadBack(p, pose.b) : deerHeadBack(p, pose.b);
  } else {
    legsSide(p, id, pose);
    id === 'devil' ? devilBodySide(p, pose) : deerBodySide(p, pose);
    id === 'devil' ? devilHeadSide(p, pose.b) : deerHeadSide(p, pose.b);
  }
  p.outline(C.ink);

  if (dir === 'left' && isSide) {
    // Mirror the right-facing frame
    const out = new Pix(FRAME_W, FRAME_H);
    out.g.save();
    out.g.translate(FRAME_W, 0);
    out.g.scale(-1, 1);
    out.g.drawImage(p.c, 0, 0);
    out.g.restore();
    return out.c;
  }
  return p.c;
}

const sheetCache = new Map<CharacterId, HTMLCanvasElement>();

/** Full sprite sheet: FRAME_COLS x 4 directions of 32x48 frames. */
export function buildSheet(id: CharacterId): HTMLCanvasElement {
  const cached = sheetCache.get(id);
  if (cached) return cached;
  const sheet = new Pix(FRAME_W * FRAME_COLS, FRAME_H * DIR_ROWS.length);
  DIR_ROWS.forEach((dir, row) => {
    for (let f = 0; f < FRAME_COLS; f++) sheet.g.drawImage(drawFrame(id, dir, f), f * FRAME_W, row * FRAME_H);
  });
  sheetCache.set(id, sheet.c);
  return sheet.c;
}

export function frameIndex(dir: Dir, col: number): number {
  return DIR_ROWS.indexOf(dir) * FRAME_COLS + col;
}
