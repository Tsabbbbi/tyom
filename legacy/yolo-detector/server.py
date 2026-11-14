"""Serve the UI and process JPEG frames in memory; frames are never persisted."""
from io import BytesIO
from pathlib import Path
from threading import Lock
from time import perf_counter
import warnings
import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError
from flask import Flask, jsonify, request, send_from_directory
from detector import Detector

ROOT = Path(__file__).resolve().parent
Image.MAX_IMAGE_PIXELS = 4_000_000


def create_app(detector=None):
    app = Flask(__name__, static_folder=None)
    app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024
    gate = Lock()
    model = detector if detector is not None else Detector(ROOT / 'models')

    @app.get('/')
    def index():
        return send_from_directory(ROOT, 'index.html')

    @app.get('/<name>')
    def asset(name):
        if name not in ('app.js', 'styles.css'):
            return jsonify(error='Not found'), 404
        return send_from_directory(ROOT, name)

    @app.get('/api/health')
    def health():
        return jsonify(ready=True, model='YOLOv3', classes=len(model.labels))

    @app.post('/api/detect')
    def detect():
        if request.mimetype != 'image/jpeg':
            return jsonify(error='Send a JPEG frame.'), 415
        if not gate.acquire(blocking=False):
            return jsonify(error='Detector is busy. Try again shortly.'), 503
        try:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter('error', Image.DecompressionBombWarning)
                    with Image.open(BytesIO(request.get_data())) as source:
                        if source.format != 'JPEG' or max(source.size) > 2048:
                            return jsonify(error='Use a JPEG no larger than 2048 pixels per side.'), 400
                        rgb = np.array(source.convert('RGB'))
                frame = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
                return jsonify(error='Invalid or oversized image.'), 400
            started = perf_counter()
            detections = model.detect(frame)
            return jsonify(detections=detections, inference_ms=round((perf_counter() - started) * 1000))
        finally:
            gate.release()

    @app.errorhandler(413)
    def too_large(_error):
        return jsonify(error='Frame exceeds the 2 MB limit.'), 413

    @app.after_request
    def headers(response):
        response.headers['Cache-Control'] = 'no-store' if request.path.startswith('/api/') else 'no-cache'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    return app
