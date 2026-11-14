/**
 * Pure, dependency-free pointing-gesture classifier.
 * Input: the 21 MediaPipe hand landmarks (normalized image coordinates, y grows downward).
 * Output: Up / Down / Left / Right or null (invalid / not a pointing gesture).
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export interface ClassifierOptions {
  /** True when the camera image is shown mirrored (selfie view). Pointing right on screen == right. */
  mirrored: boolean;
  /** Half-angle (deg) of each direction sector. 45 = no dead zone; 35 leaves a 20deg dead zone. */
  sectorHalfAngle: number;
  /** Wider half-angle used to keep the *current* direction (hysteresis). */
  stickyHalfAngle: number;
  /** Min |MCP->tip| relative to hand size (wrist->middle MCP) for the index to count as extended. */
  minIndexLength: number;
  /** Min straightness: |MCP->tip| / (|MCP->PIP|+|PIP->DIP|+|DIP->tip|). */
  minStraightness: number;
  /** How many of middle/ring/pinky must be curled for a valid point. */
  minCurledOthers: number;
  /** Other finger is "curled" when tip-to-wrist < pip-to-wrist * this factor. */
  curlRatio: number;
}

export const DEFAULT_CLASSIFIER_OPTIONS: ClassifierOptions = {
  mirrored: true,
  sectorHalfAngle: 35,
  stickyHalfAngle: 45,
  minIndexLength: 0.55,
  minStraightness: 0.8,
  minCurledOthers: 2,
  curlRatio: 1.05,
};

export type RejectReason =
  | 'no-hand'
  | 'index-not-extended'
  | 'index-bent'
  | 'fingers-open'
  | 'pointing-at-camera'
  | 'dead-zone';

export interface ClassificationResult {
  direction: Direction | null;
  /** Angle of the (mirror-corrected) index vector in degrees: 0 = right, 90 = up, 180 = left, -90 = down. */
  angle: number | null;
  reason: RejectReason | null;
}

export const LM = {
  WRIST: 0,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
} as const;

const dist = (a: Landmark, b: Landmark): number => Math.hypot(a.x - b.x, a.y - b.y);

const reject = (reason: RejectReason, angle: number | null = null): ClassificationResult => ({
  direction: null,
  angle,
  reason,
});

/** Signed smallest difference between two angles in degrees. */
const angleDiff = (a: number, b: number): number => {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
};

const DIRECTION_ANGLE: Record<Direction, number> = { right: 0, up: 90, left: 180, down: -90 };

export function angleToDirection(
  angle: number,
  halfAngle: number,
  current: Direction | null = null,
  stickyHalfAngle = halfAngle,
): Direction | null {
  if (current && Math.abs(angleDiff(angle, DIRECTION_ANGLE[current])) <= stickyHalfAngle) return current;
  for (const dir of Object.keys(DIRECTION_ANGLE) as Direction[]) {
    if (Math.abs(angleDiff(angle, DIRECTION_ANGLE[dir])) <= halfAngle) return dir;
  }
  return null;
}

export function classifyGesture(
  landmarks: readonly Landmark[] | null | undefined,
  options: Partial<ClassifierOptions> = {},
  currentDirection: Direction | null = null,
): ClassificationResult {
  const o = { ...DEFAULT_CLASSIFIER_OPTIONS, ...options };
  if (!landmarks || landmarks.length < 21) return reject('no-hand');

  const wrist = landmarks[LM.WRIST];
  const mcp = landmarks[LM.INDEX_MCP];
  const pip = landmarks[LM.INDEX_PIP];
  const dip = landmarks[LM.INDEX_DIP];
  const tip = landmarks[LM.INDEX_TIP];

  const handSize = dist(wrist, landmarks[LM.MIDDLE_MCP]);
  if (handSize < 1e-4) return reject('no-hand');

  // 1) Index finger must be extended: long enough and straight (MCP, PIP, DIP, tip roughly collinear).
  const chord = dist(mcp, tip);
  const pathLen = dist(mcp, pip) + dist(pip, dip) + dist(dip, tip);
  const tipFartherThanPip = dist(wrist, tip) > dist(wrist, pip);
  if (!tipFartherThanPip || chord / handSize < o.minIndexLength) {
    // Distinguish "pointing at the camera" (foreshortened but still straight) from a curled finger.
    const straight = pathLen > 0 && chord / pathLen >= o.minStraightness;
    return reject(straight ? 'pointing-at-camera' : 'index-not-extended');
  }
  if (chord / pathLen < o.minStraightness) return reject('index-bent');

  // 2) The other fingers must be curled; an open hand is not a pointing gesture.
  const others: [number, number][] = [
    [LM.MIDDLE_PIP, LM.MIDDLE_TIP],
    [LM.RING_PIP, LM.RING_TIP],
    [LM.PINKY_PIP, LM.PINKY_TIP],
  ];
  let curled = 0;
  for (const [pipIdx, tipIdx] of others) {
    if (dist(wrist, landmarks[tipIdx]) < dist(wrist, landmarks[pipIdx]) * o.curlRatio) curled++;
  }
  if (curled < o.minCurledOthers) return reject('fingers-open');

  // 3) Direction from the MCP -> tip vector, corrected for mirroring.
  let dx = tip.x - mcp.x;
  const dy = tip.y - mcp.y;
  if (o.mirrored) dx = -dx;
  const angle = (Math.atan2(-dy, dx) * 180) / Math.PI;

  const direction = angleToDirection(angle, o.sectorHalfAngle, currentDirection, o.stickyHalfAngle);
  if (!direction) return reject('dead-zone', angle);
  return { direction, angle, reason: null };
}

export interface SmootherOptions {
  /** Consecutive frames a *new* direction must be seen before it becomes active. */
  framesToSwitch: number;
  /** Consecutive invalid frames before an active direction is dropped. */
  framesToStop: number;
}

export const DEFAULT_SMOOTHER_OPTIONS: SmootherOptions = { framesToSwitch: 2, framesToStop: 2 };

/**
 * Temporal stabilizer. Debounces direction changes and short dropouts, but losing the hand
 * always clears the state immediately via {@link reset}.
 */
export class GestureSmoother {
  private active: Direction | null = null;
  private candidate: Direction | null = null;
  private candidateCount = 0;
  private invalidCount = 0;
  private readonly opts: SmootherOptions;

  constructor(options: Partial<SmootherOptions> = {}) {
    this.opts = { ...DEFAULT_SMOOTHER_OPTIONS, ...options };
  }

  get direction(): Direction | null {
    return this.active;
  }

  update(raw: Direction | null): Direction | null {
    if (raw === null) {
      this.candidate = null;
      this.candidateCount = 0;
      if (this.active && ++this.invalidCount >= this.opts.framesToStop) {
        this.active = null;
        this.invalidCount = 0;
      }
      return this.active;
    }
    this.invalidCount = 0;
    if (raw === this.active) {
      this.candidate = null;
      this.candidateCount = 0;
      return this.active;
    }
    if (raw === this.candidate) this.candidateCount++;
    else {
      this.candidate = raw;
      this.candidateCount = 1;
    }
    if (this.candidateCount >= this.opts.framesToSwitch) {
      this.active = raw;
      this.candidate = null;
      this.candidateCount = 0;
    }
    return this.active;
  }

  /** Immediately clear everything (hand lost / tracking stopped). */
  reset(): void {
    this.active = null;
    this.candidate = null;
    this.candidateCount = 0;
    this.invalidCount = 0;
  }
}
