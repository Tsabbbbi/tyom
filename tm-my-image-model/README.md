# Lens — Image classifier

A minimal browser interface for the included Teachable Machine image model.

## Run locally

From this folder:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000 and select **Start camera**. Allow camera access when prompted. Use **Stop** to release the camera.

Do not open index.html directly with a file:// URL: the model must be fetched through a web server. Deployment requires HTTPS (localhost also works). An internet connection is needed to download the pinned TensorFlow.js and Teachable Machine scripts from jsDelivr. Camera frames and predictions are processed in the browser.

The exported model, metadata, and weights must stay beside index.html. The current classes are **Billy** and **Class 4**, as supplied by metadata.json. To change what the model recognizes, retrain and export it from Teachable Machine, replacing all three model files together.

## Changes

- Corrected the model URL from the nonexistent ./my_model/ directory to ./.
- Pinned the library versions to the pairing in the Teachable Machine image library's documented example.
- Added permission, dependency, model-loading, and prediction error states.
- Prevented duplicate camera starts and stale predictions; added camera cleanup on stop and page exit.
- Added a responsive, keyboard-accessible interface and live confidence scores.
