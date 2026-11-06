# Lens — YOLOv3 object detection

A neumorphic camera UI backed by YOLOv3 and OpenCV, based on [arunponnusamy/object-detection-opencv](https://github.com/arunponnusamy/object-detection-opencv). Detects 80 COCO object categories and shows confidence scores and bounding boxes. It does not recognize individual people by name.

**Camera frames are sent to your server for inference.** The application processes them in memory without saving them. Stop releases the camera and cancels further requests. Boxes describe the most recently analyzed frame, so moving objects may outpace inference.

## Dokploy deployment

This is now a Python service, not a static website. Change the existing Dokploy application settings before deploying:

| Setting | Value |
| --- | --- |
| Repository branch | `main` |
| Build path / context | `/` (repository root) |
| Build type | `Dockerfile` |
| Dockerfile path | `Dockerfile` |
| Domain container port | `8000` |
| HTTPS | Enable (required for camera access) |
| Health endpoint | `/api/health` |

Save settings and deploy. The image build downloads and verifies the approximately 248 MB YOLOv3 weights. Build-time internet access is required; inference needs no external services. Allow time for the first build and model startup. CPU inference speed depends on the host; start with at least 2 GB RAM and monitor actual usage. One worker loads one model; requests are bounded rather than queued indefinitely.

A successful health request returns `ready: true`, `model: YOLOv3`, and `classes: 80`. A static server or `python -m http.server` cannot run detection.

## Local development (Python 3.12)

```sh
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python download_model.py
flask --app 'server:create_app()' run --port 8000
```

Open http://localhost:8000 and click **Start camera**. Or run the production container:

```sh
docker build -t lens .
docker run --rm -p 8000:8000 lens
```

## Tests

```sh
python -m unittest discover -s tests -v
node --check app.js
```

The API accepts JPEG request bodies at `POST /api/detect` (2 MB maximum, dimensions up to 2048 per side). It returns normalized `[x, y, width, height]` boxes. The browser sends mirrored, square 640px frames one at a time. Threshold: 0.5; class-aware NMS: 0.4.

## Attribution

The YOLOv3 configuration and COCO labels come from Arun Ponnusamy's repository. Its MIT license is preserved in `models/LICENSE.upstream`. The Python inference follows that project's OpenCV DNN approach, adapted for a web service and modern OpenCV. Weights come from https://pjreddie.com/media/files/yolov3.weights and are checksum-verified. The large weights are downloaded during builds rather than committed to Git.

The previous Teachable Machine files in `model/` are retained only as an unused archive and excluded from the container.
