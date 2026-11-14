export interface SettingsData {
  music: number; // 0..1
  sfx: number; // 0..1
  muted: boolean;
  showCamera: boolean;
  mirror: boolean;
}

const KEY = 'dlq.settings.v1';
const DEFAULTS: SettingsData = { music: 0.5, sfx: 0.7, muted: false, showCamera: true, mirror: true };

type Listener = (s: Readonly<SettingsData>) => void;

class SettingsStore {
  private data: SettingsData = { ...DEFAULTS };
  private listeners = new Set<Listener>();

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<SettingsData>;
        this.data = {
          music: clamp01(p.music, DEFAULTS.music),
          sfx: clamp01(p.sfx, DEFAULTS.sfx),
          muted: typeof p.muted === 'boolean' ? p.muted : DEFAULTS.muted,
          showCamera: typeof p.showCamera === 'boolean' ? p.showCamera : DEFAULTS.showCamera,
          mirror: typeof p.mirror === 'boolean' ? p.mirror : DEFAULTS.mirror,
        };
      }
    } catch {
      /* storage unavailable: use defaults */
    }
  }

  get value(): Readonly<SettingsData> {
    return this.data;
  }

  set<K extends keyof SettingsData>(key: K, value: SettingsData[K]): void {
    this.data = { ...this.data, [key]: value };
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
    this.listeners.forEach((l) => l(this.data));
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

function clamp01(v: unknown, d: number): number {
  return typeof v === 'number' && isFinite(v) ? Math.min(1, Math.max(0, v)) : d;
}

export const settings = new SettingsStore();
