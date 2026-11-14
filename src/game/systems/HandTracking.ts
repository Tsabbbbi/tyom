import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { Direction, Landmark } from './GestureClassifier';

export type TrackerStatus =
  | 'idle'
  | 'requesting-camera'
  | 'loading-model'
  | 'ready'
  | 'denied'
  | 'no-camera'
  | 'error';

export interface TrackerListener {
  onStatus?(status: TrackerStatus, detail?: string): void;
  /** Called after every inference with the first hand's landmarks, or null when no hand is visible. */
  onLandmarks?(landmarks: Landmark[] | null, timestamp: number): void;
}

const BASE = import.meta.env.BASE_URL;
const WASM_PATH = `${BASE}wasm`;
const MODEL_PATH = `${BASE}models/hand_landmarker.task`;
const TARGET_FPS = 24;

/**
 * Owns the webcam stream and the MediaPipe HandLandmarker.
 * The model is created once and reused; inference runs on a throttled timer (~24 FPS)
 * independent of the Phaser render loop. Frames never leave the browser.
 */
export class HandTracker {
  status: TrackerStatus = 'idle';
  detail = '';
  private landmarker: HandLandmarker | null = null;
  private landmarkerDelegate: 'GPU' | 'CPU' | null = null;
  private loading: Promise<void> | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private timer: number | null = null;
  private lastVideoTime = -1;
  private running = false;
  private listeners = new Set<TrackerListener>();
  private lastTs = 0;
  inferenceMs = 0;

  subscribe(l: TrackerListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private setStatus(s: TrackerStatus, detail = ''): void {
    this.status = s;
    this.detail = detail;
    this.listeners.forEach((l) => l.onStatus?.(s, detail));
  }

  get active(): boolean {
    return this.running;
  }

  async start(video: HTMLVideoElement): Promise<void> {
    if (this.running) return;
    this.video = video;
    this.setStatus('requesting-camera');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('getUserMedia unavailable'), { name: 'NotFoundError' });
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user', frameRate: { ideal: 30 } },
        audio: false,
      });
    } catch (e) {
      const name = (e as DOMException).name;
      if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') this.setStatus('denied', 'Camera permission was denied.');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') this.setStatus('no-camera', 'No camera was found.');
      else this.setStatus('error', (e as Error).message || 'Could not open the camera.');
      return;
    }
    video.srcObject = this.stream;
    try {
      await video.play();
    } catch {
      /* autoplay of a muted stream normally succeeds; ignore */
    }

    this.setStatus('loading-model');
    try {
      await this.ensureModel();
    } catch (e) {
      this.releaseStream();
      this.setStatus('error', `Hand tracking model failed to load: ${(e as Error).message}`);
      return;
    }
    this.running = true;
    this.lastVideoTime = -1;
    this.setStatus('ready');
    this.loop();
  }

  private ensureModel(): Promise<void> {
    if (this.landmarker) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      const make = (delegate: 'GPU' | 'CPU') =>
        HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      try {
        this.landmarker = await make('GPU');
        this.landmarkerDelegate = 'GPU';
      } catch {
        this.landmarker = await make('CPU');
        this.landmarkerDelegate = 'CPU';
      }
    })().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  get delegate(): string | null {
    return this.landmarkerDelegate;
  }

  private loop = (): void => {
    if (!this.running) return;
    const started = performance.now();
    this.infer(started);
    const elapsed = performance.now() - started;
    this.timer = window.setTimeout(this.loop, Math.max(4, 1000 / TARGET_FPS - elapsed));
  };

  private infer(now: number): void {
    const v = this.video;
    if (!v || !this.landmarker || v.readyState < 2) return;
    if (document.hidden) {
      this.emit(null, now);
      return;
    }
    if (v.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = v.currentTime;
    // timestamps passed to MediaPipe must be strictly increasing
    const ts = Math.max(now, this.lastTs + 1);
    this.lastTs = ts;
    try {
      const t0 = performance.now();
      const res = this.landmarker.detectForVideo(v, ts);
      this.inferenceMs = this.inferenceMs * 0.9 + (performance.now() - t0) * 0.1;
      const lm = res.landmarks?.[0] as NormalizedLandmark[] | undefined;
      this.emit(lm && lm.length >= 21 ? lm : null, now);
    } catch (e) {
      if (this.landmarkerDelegate === 'GPU') {
        // GPU delegate can fail at first inference on some drivers: rebuild on CPU once.
        this.landmarker?.close();
        this.landmarker = null;
        this.landmarkerDelegate = null;
        this.running = false;
        this.emit(null, now);
        void this.ensureModelCpu().then(() => {
          this.running = true;
          this.loop();
        });
      } else {
        this.emit(null, now);
        console.warn('Hand inference error', e);
      }
    }
  }

  private async ensureModelCpu(): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numHands: 1,
    });
    this.landmarkerDelegate = 'CPU';
  }

  private emit(lm: Landmark[] | null, ts: number): void {
    this.listeners.forEach((l) => l.onLandmarks?.(lm, ts));
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
  }

  /** Stop inference and release the camera. The model stays loaded for a fast restart. */
  stop(): void {
    this.running = false;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.releaseStream();
    this.emit(null, performance.now());
    if (this.status !== 'idle') this.setStatus('idle');
  }

  /** Full cleanup including the WASM model. */
  dispose(): void {
    this.stop();
    this.landmarker?.close();
    this.landmarker = null;
    this.landmarkerDelegate = null;
  }
}

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

/** Pixel-style landmark overlay. The canvas is mirrored with CSS together with the video. */
export function drawLandmarks(canvas: HTMLCanvasElement, lm: Landmark[] | null, dir: Direction | null): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const w = canvas.width;
  const h = canvas.height;
  g.clearRect(0, 0, w, h);
  if (!lm) return;
  g.lineCap = 'square';
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(242,230,201,0.85)';
  for (const [a, b] of CONNECTIONS) {
    g.beginPath();
    g.moveTo(lm[a].x * w, lm[a].y * h);
    g.lineTo(lm[b].x * w, lm[b].y * h);
    g.stroke();
  }
  // index finger highlighted
  g.strokeStyle = dir ? '#ffd34d' : '#5fa3ee';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(lm[5].x * w, lm[5].y * h);
  for (const i of [6, 7, 8]) g.lineTo(lm[i].x * w, lm[i].y * h);
  g.stroke();
  for (let i = 0; i < lm.length; i++) {
    g.fillStyle = i === 8 ? '#ffffff' : '#00539B';
    const s = i === 8 ? 8 : 5;
    g.fillRect(Math.round(lm[i].x * w - s / 2), Math.round(lm[i].y * h - s / 2), s, s);
  }
}
