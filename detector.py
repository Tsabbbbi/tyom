"""YOLOv3/OpenCV inference based on arunponnusamy/object-detection-opencv.
See models/LICENSE.upstream for the original project's MIT license.
"""
from pathlib import Path
from threading import Lock
import cv2
import numpy as np


class Detector:
    def __init__(self, directory='models'):
        directory = Path(directory)
        self.labels = (directory / 'coco.names').read_text().splitlines()
        self.net = cv2.dnn.readNetFromDarknet(str(directory / 'yolov3.cfg'), str(directory / 'yolov3.weights'))
        self.outputs = self.net.getUnconnectedOutLayersNames()
        self.lock = Lock()
        cv2.setNumThreads(2)

    def detect(self, image):
        height, width = image.shape[:2]
        blob = cv2.dnn.blobFromImage(image, 1 / 255.0, (416, 416), swapRB=True, crop=False)
        # OpenCV nets are mutable: keep input + forward atomic across requests.
        with self.lock:
            self.net.setInput(blob)
            outputs = self.net.forward(self.outputs)
        return decode(outputs, self.labels, width, height)


def decode(outputs, labels, width, height):
    groups = {}
    for output in outputs:
        for detection in output:
            scores = detection[5:]
            class_id = int(np.argmax(scores))
            # OpenCV's Darknet Region layer already combines objectness and class score.
            confidence = float(scores[class_id])
            if confidence < 0.5:
                continue
            cx, cy, w, h = detection[:4] * [width, height, width, height]
            box = [float(cx - w / 2), float(cy - h / 2), float(w), float(h)]
            groups.setdefault(class_id, []).append((box, confidence))
    results = []
    # Suppress overlapping boxes per class, preserving different overlapping objects.
    for class_id, candidates in groups.items():
        boxes, scores = zip(*candidates)
        indices = cv2.dnn.NMSBoxes(list(boxes), list(scores), 0.5, 0.4)
        for index in np.asarray(indices).flatten():
            x, y, w, h = boxes[int(index)]
            x1, y1 = max(0, x), max(0, y)
            x2, y2 = min(width, x + w), min(height, y + h)
            if x2 <= x1 or y2 <= y1:
                continue
            results.append({'label': labels[class_id], 'confidence': scores[int(index)],
                            'box': [x1 / width, y1 / height, (x2 - x1) / width, (y2 - y1) / height]})
    return sorted(results, key=lambda item: item['confidence'], reverse=True)[:50]
