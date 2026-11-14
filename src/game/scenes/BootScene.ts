import Phaser from 'phaser';
import { BOOKS, MAP, TABLES, DESK } from '../data/libraryMap';
import { buildSheet, DIR_ROWS, FRAME_COLS, FRAME_H, FRAME_W, type CharacterId } from '../assets/sprites';
import { Pix } from '../assets/pixel';
import {
  renderBase,
  renderBook,
  renderDesk,
  renderGlow,
  renderPillar,
  renderPlant,
  renderShelfRun,
  renderTable,
} from '../assets/worldArt';

/** Generates every texture procedurally (no binary art files) and moves on to the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const add = (key: string, canvas: HTMLCanvasElement) => {
      if (!this.textures.exists(key)) this.textures.addCanvas(key, canvas);
    };

    for (const id of ['devil', 'deer'] as CharacterId[]) {
      const key = `char-${id}`;
      if (this.textures.exists(key)) continue;
      const tex = this.textures.addCanvas(key, buildSheet(id))!;
      DIR_ROWS.forEach((_, row) => {
        for (let c = 0; c < FRAME_COLS; c++) tex.add(row * FRAME_COLS + c, 0, c * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
      });
    }

    add('base', renderBase());
    MAP.shelfRuns.forEach((run, i) => add(`shelf-${i}`, renderShelfRun(run.w, i + 1)));
    add('shelf-backdrop', renderShelfRun(6, 77));
    TABLES.forEach((t, i) => add(`table-${i}`, renderTable(t.w, t.h, i + 1)));
    add('desk', renderDesk(DESK.w));
    add('pillar', renderPillar());
    add('plant', renderPlant());
    BOOKS.forEach((b) => add(`book-${b.id}`, renderBook(b.id)));
    add('glow-map', renderGlow());

    // small utility sprites
    const glow = new Pix(48, 48);
    const g = glow.g.createRadialGradient(24, 24, 1, 24, 24, 24);
    g.addColorStop(0, 'rgba(255,225,120,0.9)');
    g.addColorStop(1, 'rgba(255,225,120,0)');
    glow.g.fillStyle = g;
    glow.g.fillRect(0, 0, 48, 48);
    add('glow-dot', glow.c);
    const spark = new Pix(5, 5);
    spark.r(2, 0, 1, 5, '#fff7c2').r(0, 2, 5, 1, '#fff7c2').r(2, 2, 1, 1, '#ffffff');
    add('spark', spark.c);
    const px = new Pix(2, 2);
    px.r(0, 0, 2, 2, '#ffffff');
    add('px', px.c);

    this.scene.start('Menu');
  }
}
