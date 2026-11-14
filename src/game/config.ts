import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { LibraryScene } from './scenes/LibraryScene';
import { VictoryScene } from './scenes/VictoryScene';

export const VIEW_W = 640;
export const VIEW_H = 360;

export function createGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: VIEW_W,
    height: VIEW_H,
    backgroundColor: '#0b1226',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true }, // audio is handled by our own WebAudio AudioManager
    fps: { target: 60 },
    scene: [BootScene, MenuScene, CharacterSelectScene, LibraryScene, VictoryScene],
  });
}
