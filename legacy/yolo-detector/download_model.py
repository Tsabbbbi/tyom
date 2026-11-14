"""Download the upstream YOLOv3 weights, verifying the expected SHA-256."""
from hashlib import sha256
from pathlib import Path
import shutil
from urllib.request import urlopen

URL = 'https://pjreddie.com/media/files/yolov3.weights'
SHA256 = '523e4e69e1d015393a1b0a441cef1d9c7659e3eb2d7e15f793f060a21b32f297'
DEST = Path(__file__).resolve().parent / 'models' / 'yolov3.weights'


def digest(path):
    with path.open('rb') as source:
        return sha256(source.read()).hexdigest()


def main():
    if DEST.exists() and digest(DEST) == SHA256:
        print('YOLOv3 weights verified.')
        return
    DEST.parent.mkdir(exist_ok=True)
    temporary = DEST.with_suffix('.download')
    try:
        with urlopen(URL, timeout=120) as response, temporary.open('wb') as output:
            shutil.copyfileobj(response, output)
        if digest(temporary) != SHA256:
            raise RuntimeError('YOLOv3 weights checksum mismatch.')
        temporary.replace(DEST)
    finally:
        temporary.unlink(missing_ok=True)
    print('YOLOv3 weights downloaded and verified.')


if __name__ == '__main__':
    main()
