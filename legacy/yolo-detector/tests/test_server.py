from io import BytesIO
import unittest
import numpy as np
from PIL import Image
from detector import decode
from server import create_app


class FakeDetector:
    labels = ['person', 'cell phone']
    def detect(self, image):
        assert image.shape == (32, 32, 3)
        return [{'label': 'person', 'confidence': .9, 'box': [0, 0, 1, 1]}]


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = create_app(FakeDetector()).test_client()

    def test_assets_and_private_files(self):
        for path in ('/', '/app.js', '/styles.css', '/api/health'):
            with self.client.get(path) as response:
                self.assertEqual(response.status_code, 200)
        for path in ('/server.py', '/models/yolov3.weights', '/.git/config'):
            self.assertEqual(self.client.get(path).status_code, 404)

    def test_jpeg_detection(self):
        output = BytesIO()
        Image.new('RGB', (32, 32)).save(output, format='JPEG')
        response = self.client.post('/api/detect', data=output.getvalue(), content_type='image/jpeg')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['detections'][0]['label'], 'person')
        self.assertEqual(response.headers['Cache-Control'], 'no-store')

    def test_bad_inputs(self):
        self.assertEqual(self.client.post('/api/detect', data=b'bad', content_type='image/jpeg').status_code, 400)
        self.assertEqual(self.client.post('/api/detect', data=b'bad', content_type='text/plain').status_code, 415)
        self.assertEqual(self.client.post('/api/detect', data=b'x' * (2 * 1024 * 1024 + 1), content_type='image/jpeg').status_code, 413)

    def test_class_aware_suppression(self):
        output = np.array([[.5,.5,.8,.8,.99,.9,.1], [.5,.5,.8,.8,.99,.8,.1], [.5,.5,.8,.8,.99,.1,.85]])
        result = decode([output], ['person','phone'], 100, 100)
        self.assertEqual([item['label'] for item in result], ['person','phone'])
        self.assertEqual(decode([np.array([[.5,.5,.8,.8,.1,.1,.1]])], ['person','phone'], 100,100), [])


if __name__ == '__main__':
    unittest.main()
