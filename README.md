# Duke Library Quest

A hand-gesture-controlled, top-down pixel-art exploration game. Pick the **Duke Blue Devil** or the **DKU Blue Deer**,
explore a Gothic Duke-inspired library and collect **five books** by pointing your index finger at your webcam
(or with WASD / arrow keys).

* Phaser 3 + TypeScript + Vite
* Google MediaPipe Tasks Vision **Hand Landmarker** (runs 100% in the browser; webcam frames never leave the device)
* Procedural pixel-art sprites/tiles and a procedural WebAudio sound system (no binary art/audio assets)
* Static build served by nginx in Docker (port **8000**)

## Controls

| Gesture (index finger extended, other fingers curled) | Action |
|---|---|
| Point up / down / left / right | Walk in that direction (keeps walking while held) |
| No hand / open palm / fist | Stop |

Keyboard `WASD` / arrow keys always work and take priority over gestures. `Esc` pauses.
Camera mirroring (selfie view) is a setting; with it ON, pointing to *your* right moves right on screen.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173  (add ?debug=1 to expose window.__DLQ__ for tests)
npm test             # vitest: gesture classifier + map reachability
npm run build        # type-check + production build into dist/
npm run preview      # serve dist/ on :4173
```

End-to-end smoke test (Playwright; uses Chromium's fake camera + mocked landmarks):

```bash
npm run build && npx vite preview --port 4173 &
APP_URL=http://localhost:4173 PW_CHANNEL=chrome node e2e/flow.mjs   # PW_CHANNEL optional
```

## Architecture

```
src/
  main.ts, app.ts, services.ts        bootstrap, scene/screen flow, shared singletons
  game/
    config.ts                         Phaser config (640x360 logical, pixelArt, FIT scaling)
    scenes/                           Boot, Menu, CharacterSelect, Library, Victory (+ shared backdrop)
    entities/                         Player (tile collision, corner assist), CollectibleBook
    systems/
      GestureClassifier.ts            pure landmark -> direction classifier + temporal smoother (unit-tested)
      HandTracking.ts                 webcam + MediaPipe HandLandmarker (GPU delegate, CPU fallback), ~24 FPS loop
      InputManager.ts                 keyboard + gesture merge, stale-gesture watchdog, focus-loss handling
      AudioManager.ts                 WebAudio music/SFX + speechSynthesis voice lines
      Minimap.ts, Settings.ts
    data/libraryMap.ts                48x34 tile layout, book spots, collision helpers
    assets/                           pixel.ts helpers, sprites.ts (characters), worldArt.ts (tiles/objects)
  ui/                                 DOM screens, HUD, camera preview, pixel-UI CSS
public/models/hand_landmarker.task    MediaPipe model (served locally)
public/wasm/                          MediaPipe WASM runtime (copied from @mediapipe/tasks-vision)
```

Gesture pipeline: `HandTracker` (inference, ~24 FPS) → `InputManager.ingestLandmarks` → `classifyGesture`
(index extension/straightness, other fingers curled, MCP→tip angle with dead zone + hysteresis, mirroring) →
`GestureSmoother` (needs 2 consecutive frames to switch / stop). A lost hand clears movement immediately and a gesture
older than 300 ms is ignored, so the character can never keep walking on a stale gesture.

## Deploy (Dokploy)

`Dockerfile` is a two-stage build (Node 22 build → `nginx-unprivileged`), serving on **port 8000**, the port the repo's
previous Dokploy service already used. Point the Dokploy domain/port at `8000`. The webcam needs a secure context, so
serve over **HTTPS** (Traefik/Let's Encrypt via Dokploy) — `localhost` also works. `nginx.conf` provides the SPA fallback,
`application/wasm`, caching and `/healthz`.

The previous project in this repo (a YOLOv3 object-detection service) is preserved in `legacy/yolo-detector/`.
