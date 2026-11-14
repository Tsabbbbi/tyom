import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../config';

/** Animated night-time library backdrop shared by the menu, selection and victory scenes. */
export function createBackdrop(scene: Phaser.Scene, opts: { rays?: boolean; warm?: boolean } = {}): void {
  const g = scene.add.graphics().setDepth(0);
  const bands = 18;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(opts.warm ? 0x1b2a5e : 0x0a1330),
      Phaser.Display.Color.ValueToColor(opts.warm ? 0x6a3a58 : 0x1d3a78),
      bands,
      i,
    );
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, Math.floor(t * VIEW_H), VIEW_W, Math.ceil(VIEW_H / bands) + 1);
  }
  const W = VIEW_W;
  const H = VIEW_H;
  // stars
  for (let i = 0; i < 40; i++) {
    const s = scene.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.45), 2, 2, 0xf2e6c9).setAlpha(0.7).setDepth(1);
    scene.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(900, 2400), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
  }
  // moon
  g.fillStyle(0xf2e6c9, 1);
  g.fillCircle(W * 0.83, H * 0.2, 30);
  g.fillStyle(0x1d3a78, 1);
  g.fillCircle(W * 0.83 + 14, H * 0.2 - 7, 26);
  // gothic arch windows
  const arch = (cx: number, w: number, h: number) => {
    const top = Math.round(H * 0.08);
    g.fillStyle(0x6d6a64, 1);
    g.fillRect(cx - w / 2 - 8, top + 30, w + 16, h);
    g.fillCircle(cx, top + 30, w / 2 + 8);
    g.fillStyle(0x16306b, 1);
    g.fillRect(cx - w / 2, top + 30, w, h);
    g.fillCircle(cx, top + 30, w / 2);
    g.fillStyle(0x2f7fd6, 0.55);
    g.fillRect(cx - w / 2, top + 60, w, h - 30);
    g.fillStyle(0xe9e4d4, 1);
    g.fillRect(cx - 2, top + 8, 4, h + 22);
    g.fillRect(cx - w / 2, top + 80, w, 3);
    g.fillRect(cx - w / 2, top + 125, w, 3);
    g.fillStyle(0xd8b36a, 1);
    g.fillCircle(cx, top + 40, 6);
  };
  const archH = Math.round(H * 0.52);
  arch(W * 0.14, 70, archH);
  arch(W * 0.5, 100, archH + 10);
  arch(W * 0.86, 70, archH);
  // shelves along the bottom
  const shelfY = Math.round(H * 0.74);
  for (let x = 0; x < W; x += 240) scene.add.image(x, shelfY, 'shelf-backdrop').setOrigin(0, 0).setDepth(2).setTint(0x8a8ab0);
  const floorY = shelfY + 62;
  const floor = scene.add.graphics().setDepth(3);
  floor.fillStyle(0x4b2e1b, 1);
  floor.fillRect(0, floorY, W, H - floorY);
  floor.fillStyle(0x6b4429, 1);
  for (let y = floorY; y < H; y += 16) floor.fillRect(0, y, W, 2);
  floor.fillStyle(0x0a1330, 0.35);
  floor.fillRect(0, shelfY, W, H - shelfY);

  if (opts.rays) {
    for (let i = 0; i < 9; i++) {
      const ray = scene.add.triangle(VIEW_W / 2, VIEW_H * 0.55, 0, 0, 500, -34, 500, 34, 0xffe9a0, 0.09).setOrigin(0, 0.5).setDepth(1).setAngle(i * 40);
      scene.tweens.add({ targets: ray, angle: ray.angle + 360, duration: 30000, repeat: -1 });
    }
  }

  // drifting books + sparkles
  const textures = ['book-0', 'book-1', 'book-2', 'book-3', 'book-4'];
  for (let i = 0; i < 9; i++) {
    const side = i % 2 === 0 ? Phaser.Math.Between(20, 150) : Phaser.Math.Between(VIEW_W - 150, VIEW_W - 20);
    const b = scene.add.image(side, Phaser.Math.Between(50, VIEW_H - 70), textures[i % 5]).setDepth(4).setAlpha(0.85).setScale(2);
    scene.tweens.add({
      targets: b,
      y: b.y - Phaser.Math.Between(20, 44),
      angle: Phaser.Math.Between(-18, 18),
      duration: Phaser.Math.Between(2200, 3800),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      delay: i * 160,
    });
  }
  for (let i = 0; i < 22; i++) {
    const s = scene.add.image(Phaser.Math.Between(0, VIEW_W), Phaser.Math.Between(30, VIEW_H - 50), 'spark').setDepth(5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    scene.tweens.add({ targets: s, alpha: 0.9, y: s.y - 14, duration: Phaser.Math.Between(900, 1800), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2400) });
  }
}
