# Lens — Image classifier

A responsive, neumorphic interface for a Teachable Machine image model. Includes live confidence scores, camera start/stop controls, and actionable loading and permission errors. Predictions run locally in the browser.

## Run

```sh
python3 -m http.server 8000
```

Open http://localhost:8000 and select **Start camera**. Allow camera access. Opening index.html directly as a file will not load the model; use localhost or an HTTPS server.

Internet access is needed for the pinned TensorFlow.js and Teachable Machine scripts hosted on jsDelivr.

## Files

- `index.html`: page structure
- `styles.css`: responsive layout and neumorphic surfaces
- `app.js`: model loading, predictions, and camera lifecycle
- `model/`: exported model, metadata, and weights

The current model recognizes **Billy**, **phone**, and **Billy holding a phone**. To update it, replace all three exported files in `model/` together.

The interface uses contrasting text, visible keyboard focus, reduced-motion support, and labeled confidence indicators.
