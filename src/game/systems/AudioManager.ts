import { settings } from './Settings';

type Wave = OscillatorType;
type TrackName = 'menu' | 'library';

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Each step is one eighth note; 0 = rest. */
const TRACKS: Record<
  TrackName,
  { bpm: number; lead: number[]; bass: number[]; pad: number[][]; leadWave: Wave; leadVol: number; hat: boolean }
> = {
  menu: {
    bpm: 132,
    leadWave: 'square',
    leadVol: 0.05,
    hat: true,
    lead: [
      76, 0, 79, 0, 84, 0, 79, 76, 72, 0, 76, 0, 81, 0, 76, 72, 77, 0, 81, 0, 84, 0, 81, 77, 79, 0, 83, 0, 86, 0, 83, 79,
    ],
    bass: [
      36, 0, 43, 0, 36, 0, 43, 0, 33, 0, 40, 0, 33, 0, 40, 0, 29, 0, 36, 0, 29, 0, 36, 0, 31, 0, 38, 0, 31, 0, 38, 0,
    ],
    pad: [
      [60, 64, 67],
      [57, 60, 64],
      [53, 57, 60],
      [55, 59, 62],
    ],
  },
  library: {
    bpm: 66,
    leadWave: 'sine',
    leadVol: 0.05,
    hat: false,
    lead: [
      0, 0, 74, 0, 0, 77, 0, 0, 0, 0, 72, 0, 76, 0, 0, 0, 0, 0, 70, 0, 0, 74, 0, 0, 0, 72, 0, 0, 69, 0, 0, 0,
    ],
    bass: [
      38, 0, 0, 0, 45, 0, 0, 0, 36, 0, 0, 0, 43, 0, 0, 0, 31, 0, 0, 0, 38, 0, 0, 0, 33, 0, 0, 0, 40, 0, 0, 0,
    ],
    pad: [
      [50, 53, 57, 60],
      [48, 52, 55, 59],
      [43, 46, 50, 53],
      [45, 48, 52, 55],
    ],
  },
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private track: TrackName | null = null;
  private wantedTrack: TrackName | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private lastStepAt = 0;
  private lastFootstep = 0;

  constructor() {
    settings.subscribe(() => this.applyVolumes());
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  /** Must be called from a user gesture (click / key). Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.wantedTrack && this.track !== this.wantedTrack) this.startTrack(this.wantedTrack);
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const s = settings.value;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.02);
    this.musicGain.gain.setTargetAtTime(s.music * 0.9, t, 0.02);
    this.sfxGain.gain.setTargetAtTime(s.sfx, t, 0.02);
    if (s.muted && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  /* ---------------- music ---------------- */
  playMusic(name: TrackName): void {
    this.wantedTrack = name;
    if (!this.ctx) return;
    if (this.track === name) return;
    this.startTrack(name);
  }

  stopMusic(): void {
    this.wantedTrack = null;
    this.track = null;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private startTrack(name: TrackName): void {
    if (!this.ctx) return;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.track = name;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.schedule(), 80);
    this.schedule();
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.track) return;
    const tr = TRACKS[this.track];
    const stepDur = 60 / tr.bpm / 2;
    this.lastStepAt = performance.now();
    while (this.nextTime < ctx.currentTime + 0.25) {
      const i = this.step % tr.lead.length;
      const t = this.nextTime;
      const lead = tr.lead[i];
      if (lead) this.note(midi(lead), t, stepDur * (this.track === 'library' ? 3 : 0.9), tr.leadWave, tr.leadVol, this.musicGain);
      const bass = tr.bass[i];
      if (bass) this.note(midi(bass), t, stepDur * (this.track === 'library' ? 4 : 1.8), 'triangle', 0.09, this.musicGain);
      if (i % 8 === 0) {
        const chord = tr.pad[Math.floor(i / 8) % tr.pad.length];
        for (const n of chord) this.note(midi(n), t, stepDur * 8, this.track === 'library' ? 'sine' : 'triangle', this.track === 'library' ? 0.025 : 0.018, this.musicGain, 0.4);
      }
      if (tr.hat && i % 2 === 1) this.noise(t, 0.03, 0.025, 7000, this.musicGain);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  /* ---------------- primitives ---------------- */
  private note(freq: number, when: number, dur: number, type: Wave, vol: number, dest: AudioNode, attack = 0.01, slideTo?: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(dest);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  private noise(when: number, dur: number, vol: number, cutoff: number, dest: AudioNode, lowpass = false): void {
    const ctx = this.ctx!;
    if (!this.noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = lowpass ? 'lowpass' : 'highpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(when, Math.random() * 0.5);
    src.stop(when + dur + 0.02);
  }

  private tone(freq: number, dur: number, type: Wave = 'square', vol = 0.12, delay = 0, slideTo?: number): void {
    if (!this.ctx) return;
    this.note(freq, this.ctx.currentTime + delay, dur, type, vol, this.sfxGain, 0.005, slideTo);
  }

  /* ---------------- sound effects ---------------- */
  hover(): void {
    this.tone(660, 0.05, 'square', 0.05);
  }
  click(): void {
    this.tone(440, 0.06, 'square', 0.1);
    this.tone(880, 0.09, 'square', 0.08, 0.05);
  }
  back(): void {
    this.tone(520, 0.06, 'square', 0.09);
    this.tone(330, 0.1, 'square', 0.08, 0.05);
  }
  select(): void {
    [523, 659, 784].forEach((f, i) => this.tone(f, 0.1, 'square', 0.09, i * 0.06));
  }
  pause(): void {
    this.tone(392, 0.08, 'triangle', 0.12);
    this.tone(294, 0.12, 'triangle', 0.12, 0.07);
  }
  bookCollect(): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.16, 'square', 0.08, i * 0.07));
    this.tone(2093, 0.4, 'sine', 0.06, 0.28);
    if (this.ctx) this.noise(this.ctx.currentTime, 0.12, 0.05, 6000, this.sfxGain);
  }
  fanfare(): void {
    const seq: [number, number, number][] = [
      [523, 0, 0.14], [523, 0.15, 0.14], [523, 0.3, 0.14], [659, 0.45, 0.28],
      [587, 0.75, 0.14], [659, 0.9, 0.14], [784, 1.05, 0.5], [659, 1.6, 0.14],
      [784, 1.75, 0.14], [1047, 1.9, 0.9],
    ];
    for (const [f, d, l] of seq) {
      this.tone(f, l, 'square', 0.09, d);
      this.tone(f / 2, l, 'triangle', 0.1, d);
    }
    [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.05, 1.9 + i * 0.06));
  }
  footstep(): void {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this.lastFootstep < 260) return;
    this.lastFootstep = now;
    this.noise(this.ctx.currentTime, 0.05, 0.05 + Math.random() * 0.015, 500 + Math.random() * 200, this.sfxGain, true);
  }
  bump(): void {
    this.tone(110, 0.08, 'triangle', 0.08, 0, 70);
  }

  /* ---------------- voice (browser speech synthesis; no paid TTS) ---------------- */
  voice(text: string, pitch = 1.5): void {
    const s = settings.value;
    if (s.muted || s.sfx <= 0.01 || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch;
      u.rate = 1.12;
      u.volume = Math.min(1, s.sfx);
      const voices = window.speechSynthesis.getVoices();
      const en = voices.find((v) => /^en[-_](US|GB)/i.test(v.lang) && /female|samantha|google|zira|karen/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith('en'));
      if (en) u.voice = en;
      window.speechSynthesis.speak(u);
    } catch {
      /* speech unavailable */
    }
  }

  get isRunning(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }
  /** For tests/diagnostics. */
  get musicTrack(): string | null {
    return this.track;
  }
  get lastScheduleAt(): number {
    return this.lastStepAt;
  }
}

export const audio = new AudioManager();
