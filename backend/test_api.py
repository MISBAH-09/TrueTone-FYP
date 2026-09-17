"""Quick API test script for TrueTone Django server."""
import urllib.request
import json
import sys
from pathlib import Path

BASE = "http://localhost:8000"

def test_health():
    print("Testing GET /api/health ...")
    r = urllib.request.urlopen(f"{BASE}/api/health", timeout=120)
    data = json.loads(r.read())
    print(f"  Status: {data['status']}")
    print(f"  Device: {data['device']}")
    print(f"  Models: {data['models_loaded']}")
    print(f"  Uptime: {data['uptime_seconds']}s")
    print()

def test_models():
    print("Testing GET /api/models ...")
    r = urllib.request.urlopen(f"{BASE}/api/models", timeout=10)
    data = json.loads(r.read())
    for name, info in data.get("models", {}).items():
        print(f"  {name}: {info['num_classes']} classes -> {info['classes']}")
    print()

def test_analyze(image_path):
    print(f"Testing POST /api/analyze with {image_path} ...")
    boundary = "----TrueToneBoundary123"
    img_bytes = Path(image_path).read_bytes()
    filename = Path(image_path).name

    body = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"image\"; filename=\"{filename}\"\r\n"
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode() + img_bytes + f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        f"{BASE}/api/analyze",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    r = urllib.request.urlopen(req, timeout=60)
    data = json.loads(r.read())

    if data["status"] == "success":
        p = data["predictions"]
        print(f"  Skin Type   : {p['skin_type']['label'].upper()} ({p['skin_type']['confidence']:.0%})")
        print(f"  Skin Tone   : {p['skin_tone']['label'].upper()} ({p['skin_tone']['confidence']:.0%})")
        d = p['skin_disease']
        flag = " [!] DETECTED" if d['disease_detected'] else ""
        print(f"  Skin Disease: {d['label'].upper()} ({d['confidence']:.0%}){flag}")
        print(f"  Total Time  : {data['latency_ms']['total_ms']} ms")
        if data.get("warnings"):
            for w in data["warnings"]:
                print(f"  [!] {w}")
    else:
        print(f"  Error: {data.get('message', data)}")
    print()

if __name__ == "__main__":
    test_health()
    test_models()

    images = list(Path("test_images").glob("*.jpg"))
    if not images:
        print("No test images found in test_images/")
        sys.exit(1)

    for img in sorted(images):
        test_analyze(str(img))
