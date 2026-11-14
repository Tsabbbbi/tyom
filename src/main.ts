import '@fontsource/press-start-2p/index.css';
import '@fontsource/vt323/index.css';
import './ui/styles.css';
import { boot } from './app';

async function start(): Promise<void> {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('16px "Press Start 2P"'), document.fonts.load('20px "VT323"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
  boot();
}

void start();
