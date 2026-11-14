import type Phaser from 'phaser';
import { createGame } from './game/config';
import type { LibraryScene } from './game/scenes/LibraryScene';
import { audio } from './game/systems/AudioManager';
import { flow, input, session, tracker } from './services';
import { camera } from './ui/camera';
import { hud } from './ui/hud';
import { buildScreens, currentScreen, setSettingsOrigin, show, showVictory } from './ui/screens';

const SCENES = ['Menu', 'CharacterSelect', 'Library', 'Victory'];

export function boot(): void {
  buildScreens();
  camera.init();
  audio.playMusic('menu'); // queued; starts after the first click/key (autoplay policy)
  const game: Phaser.Game = createGame('game');

  const switchTo = (key: string): void => {
    for (const k of SCENES) {
      if (k !== key && game.scene.isActive(k)) game.scene.stop(k);
    }
    if (game.scene.isActive(key) || game.scene.isPaused(key)) game.scene.stop(key);
    game.scene.start(key);
  };
  const library = () => game.scene.getScene('Library') as LibraryScene;
  const playing = () => game.scene.isActive('Library') && library().state === 'playing';

  // Boot scene hands over to Menu on its own; once the menu exists, show the title UI.
  const waitMenu = window.setInterval(() => {
    if (game.scene.isActive('Menu')) {
      window.clearInterval(waitMenu);
      show('menu');
    }
  }, 30);

  const stopCamera = () => {
    camera.disable();
    camera.setMode('hidden');
  };

  Object.assign(flow, {
    toMenu() {
      stopCamera();
      hud.hide();
      input.clear();
      switchTo('Menu');
      show('menu');
      audio.playMusic('menu');
    },
    toSelect() {
      switchTo('CharacterSelect');
      show('select');
      audio.playMusic('menu');
    },
    toSetup() {
      show('setup');
      camera.setMode('setup', document.getElementById('setup-cam-slot')!);
      void camera.enable();
    },
    showHowTo() {
      show('howto');
    },
    showSettings(from: 'menu' | 'pause') {
      setSettingsOrigin(from);
      show('settings');
    },
    startGame() {
      input.clear();
      camera.setMode('hud');
      hud.show();
      show(null);
      switchTo('Library');
      audio.playMusic('library');
    },
    pause() {
      if (!playing()) return;
      library().setPaused(true);
      audio.pause();
      show('pause');
    },
    resume() {
      if (!game.scene.isActive('Library')) return;
      library().setPaused(false);
      input.clear();
      show(null);
    },
    restart() {
      input.clear();
      if (session.controlMode === 'camera' && !tracker.active) void camera.enable();
      camera.setMode('hud');
      hud.show();
      show(null);
      switchTo('Library');
      audio.playMusic('library');
    },
    victory(ms: number) {
      stopCamera();
      switchTo('Victory');
      showVictory(ms);
      audio.playMusic('menu');
    },
  });

  input.onFocusLost = () => {
    if (playing()) flow.pause();
  };
  input.onPauseKey = () => {
    const s = currentScreen();
    if (s === 'pause') flow.resume();
    else if (s === null && playing()) flow.pause();
    else if (s === 'settings' && document.querySelector('.ui--overlay')) show('pause');
  };

  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as { __DLQ__: unknown }).__DLQ__ = {
      game,
      library,
      services: { input, tracker, session },
      flow,
      audio,
    };
  }
}
