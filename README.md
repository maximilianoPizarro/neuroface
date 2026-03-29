<p align="center">
  <img src="docs/icon.svg" alt="NeuroFace Logo" width="120">
</p>

<h1 align="center">NeuroFace - Facial Recognition & Object Detection</h1>

<p align="center">
  <a href="https://artifacthub.io/packages/helm/neuroface/neuroface"><img src="https://img.shields.io/badge/Artifact%20Hub-neuroface-blue?logo=artifacthub" alt="Artifact Hub"></a>
  <a href="https://github.com/maximilianoPizarro/neuroface/releases/tag/v1.2.0"><img src="https://img.shields.io/badge/version-v1.2.0-green" alt="Version"></a>
  <a href="https://quay.io/repository/maximilianopizarro/neuroface-backend"><img src="https://img.shields.io/badge/quay.io-backend-red?logo=redhat" alt="Quay.io"></a>
  <a href="https://quay.io/repository/maximilianopizarro/neuroface-frontend"><img src="https://img.shields.io/badge/quay.io-frontend-red?logo=redhat" alt="Quay.io"></a>
  <a href="https://developers.redhat.com/developer-sandbox"><img src="https://img.shields.io/badge/OpenShift-Ready-EE0000?logo=redhatopenshift" alt="OpenShift"></a>
  <a href="https://maximilianopizarro.github.io/neuroface/"><img src="https://img.shields.io/badge/docs-GitHub%20Pages-blue?logo=github" alt="Documentation"></a>
</p>

Facial recognition and object detection web application based on the [reconocimiento-facial](https://github.com/maximilianoPizarro/reconocimiento-facial) archetype. Built with **FastAPI** (Python) and **Angular 17**, containerized with Red Hat UBI9 certified images for **Podman Desktop** and **OpenShift**.

**v1.2.0** — Object detection (YOLOv4-tiny, 80 COCO classes), multi-person face grid, enhanced AI chat with object context.

### Video Demo

<p align="center">
  <a href="https://youtu.be/lvFu5u7slXg"><img src="https://img.youtube.com/vi/lvFu5u7slXg/maxresdefault.jpg" alt="NeuroFace Demo" width="480"></a>
</p>

---

## Architecture Overview

| Layer | Technology | Description |
|-------|-----------|-------------|
| **Frontend** | Angular 17, Material | SPA served by Nginx (UBI9); webcam capture via WebRTC, canvas overlay. |
| **Backend** | FastAPI, OpenCV, Python 3.11 | REST API for face detection, recognition, object detection, training. |
| **Face Detection** | OpenCV Haar Cascades / OpenVINO | Switchable at runtime. OpenVINO uses `face-detection-retail-0005` via ModelMesh. |
| **Object Detection** | YOLOv4-tiny (OpenCV DNN) | 80 COCO classes pre-trained. Bundled in the backend image. |
| **Recognition** | OpenCV LBPH (default) | Configurable via `AI_MODEL` env. Optional: dlib/face_recognition. |
| **Data** | Filesystem | Training images, Haar cascades, YOLO weights, serialized models under `/data`. |

**Containers (Podman/OpenShift):** Backend uses `registry.access.redhat.com/ubi9/python-311`. Frontend uses `registry.access.redhat.com/ubi9/nginx-122`.

---

## Architecture Diagram

```mermaid
graph LR
  subgraph Frontend["Frontend — Angular 17 + Nginx"]
    CAM["WebRTC Camera"]
    UI["Angular Material UI"]
    OBJ_UI["Object Detection"]
    CHAT_UI["AI Chat"]
  end

  subgraph Backend["Backend — FastAPI + UBI9"]
    API["REST API\nUvicorn :8080"]
    subgraph Engines["AI Engines"]
      CV["OpenCV\nHaar Cascades"]
      OVMS_C["OpenVINO\nOVMS Client"]
      YOLO["YOLOv4-tiny\n80 COCO Classes"]
      LBPH["LBPH\nRecognizer"]
    end
  end

  subgraph External["OpenShift AI"]
    MM["ModelMesh\n:8008"]
    FACE_M["face-detection\nretail-0005"]
    LLM["LLM Endpoint\nGranite / LiteLLM"]
  end

  CAM -->|POST /api/recognize| API
  CAM -->|POST /api/objects/detect| API
  CHAT_UI -->|POST /api/chat| API
  UI -->|PUT /api/models| API

  API --> CV
  API --> OVMS_C
  API --> YOLO
  API --> LBPH
  OVMS_C -->|KServe V2| MM
  MM --> FACE_M
  API -->|OpenAI API| LLM
```

## Face Recognition Flow

```mermaid
flowchart TD
  A["Camera captures frame\n(base64)"] --> B["POST /api/recognize"]
  B --> C{"Detection\nmethod?"}
  C -- opencv --> D["OpenCV Haar Cascade\ndetectMultiScale"]
  C -- openvino --> E["OVMS REST call\nKServe V2 infer"]
  D --> F["Face bounding boxes\n(x, y, w, h)"]
  E --> F
  F --> G{"Model\ntrained?"}
  G -- Yes --> H["LBPH predict\non each ROI"]
  G -- No --> I["label = unknown\nconfidence = 0"]
  H --> J{"confidence\n< 85?"}
  J -- Yes --> K["Known person\nlabel + confidence"]
  J -- No --> I
  I --> L["Return faces[]\n+ detection_method"]
  K --> L
  L --> M["Draw overlay\n+ multi-person grid"]
```

## Object Detection Flow

```mermaid
flowchart TD
  A["Camera captures frame"] --> B["POST /api/objects/detect"]
  B --> C["OpenCV DNN\nYOLOv4-tiny"]
  C --> D["blobFromImage\n416x416, normalize"]
  D --> E["Forward pass\nthrough network"]
  E --> F["Parse detections\n80 COCO classes"]
  F --> G["NMS filter\nconfidence > 0.4"]
  G --> H{"Objects\nfound?"}
  H -- Yes --> I["Return objects[]\n+ summary counts"]
  H -- No --> J["Return empty\ncount = 0"]
  I --> K["Draw bounding boxes\ncolor per class"]
  J --> K
```

## Training Flow

```mermaid
flowchart TD
  A["User enters label\n(person name)"] --> B["Capture images\nfrom camera"]
  B --> C["POST /api/images\nsave to /data/images/label/"]
  C --> D["POST /api/train"]
  D --> E{"Detection\nmethod?"}
  E -- opencv --> F["Haar Cascade\non each image"]
  E -- openvino --> G["OVMS detect\non each image"]
  F --> H["Extract face ROIs\n(grayscale)"]
  G --> H
  H --> I["LBPH train\non all ROIs + labels"]
  I --> J["Save training.yml\n+ model.pickle"]
  J --> K["Model trained\nlabels + face count"]
```

## AI Chat Analysis Flow

```mermaid
flowchart TD
  A["User sends message\n+ optional image"] --> B{"Image\nattached?"}
  B -- Yes --> C["Face analysis\nanalyze_faces()"]
  C --> D["Object detection\nYOLOv4-tiny"]
  D --> E["Build context:\nfaces + objects + method"]
  B -- No --> F["User message only"]
  E --> G["Compose prompt:\nsystem + context + question"]
  F --> G
  G --> H["POST to LLM\nOpenAI-compatible API"]
  H --> I["Return response\n+ analysis data"]
```

---

## Prerequisites

- **Python 3.11** — backend development
- **Node.js 20** — Angular frontend (`npm install` and `npm run build`)
- **Podman** (and optionally **podman-compose**) — containerized run
- **Helm 3** — Kubernetes/OpenShift deployment
- **Red Hat OpenShift Dev Spaces** — optional, devfile-based workspace

---

## Running the Solution

### Local Development

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

**Frontend:**

```bash
cd frontend
npm install
npm start
```

Open **http://localhost:4200**. The Angular dev server proxies `/api` to `http://localhost:8080`.

### Containers (Podman Compose)

```bash
podman-compose up -d --build
```

- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:8080/api
- **Swagger docs:** http://localhost:8080/docs

### Build and Push to Quay.io

```bash
./build-push-quay.sh [quay-namespace] [--tag v1.2.0]
```

Default namespace: `maximilianopizarro`. Requires `podman login quay.io`.

### Helm Chart (Kubernetes / OpenShift)

```bash
helm repo add neuroface https://maximilianopizarro.github.io/neuroface/
helm install neuroface neuroface/neuroface
```

#### With OpenVINO (using external ModelMesh)

```bash
helm install neuroface neuroface/neuroface \
  --set ovms.externalUrl=http://modelmesh-serving:8008 \
  --set ovms.modelName=face-detection-retail-0005
```

When `ovms.externalUrl` is set, no standalone OVMS is deployed — the backend connects to the existing ModelMesh service.

### Red Hat OpenShift Dev Spaces

The `devfile.yaml` defines components for Python backend and Node.js frontend development with predefined build/run commands.

---

## OpenVINO on Developer Sandbox

To use the OpenVINO face detection from **any** Red Hat Developer Sandbox account, deploy the `face-detection-retail-0005` model on OpenShift AI. Full step-by-step guide is available on the [GitHub Pages documentation](https://maximilianopizarro.github.io/neuroface/).

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Liveness probe |
| `/api/ready` | GET | Readiness probe (includes `ovms_status`, `object_detection`) |
| `/api/recognize` | POST | Detect + recognize faces |
| `/api/train` | POST | Train model using active detection method |
| `/api/images` | POST | Upload training image for a label |
| `/api/images/{label}` | GET/DELETE | List or delete images for a label |
| `/api/labels` | GET | List known persons/labels |
| `/api/models/config` | GET/PUT | View or change AI recognition model |
| `/api/models/detection` | PUT | Switch detection method: `opencv` or `openvino` |
| `/api/models/available` | GET | List available models and detection methods |
| `/api/objects/detect` | POST | Detect objects in image (YOLOv4-tiny, 80 COCO classes) |
| `/api/objects/classes` | GET | List all 80 detectable COCO object classes |
| `/api/objects/status` | GET | Object detector status and info |
| `/api/chat` | POST | AI chat with face + object analysis context |
| `/api/chat/status` | GET | Chat feature status |

---

## AI Model Configuration

### Detection Methods

| Method | Engine | Description |
|--------|--------|-------------|
| `opencv` | OpenCV Haar Cascades | Local CPU detection. Default, no external dependencies. |
| `openvino` | OpenVINO Model Server | Remote detection via `face-detection-retail-0005` on ModelMesh. |

### Object Detection

| Model | Engine | Classes | Description |
|-------|--------|---------|-------------|
| YOLOv4-tiny | OpenCV DNN | 80 COCO | Pre-trained, bundled in backend image (~24MB weights). |

COCO classes: person, bicycle, car, motorbike, aeroplane, bus, train, truck, boat, traffic light, fire hydrant, stop sign, parking meter, bench, bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe, backpack, umbrella, handbag, tie, suitcase, frisbee, skis, snowboard, sports ball, kite, baseball bat, baseball glove, skateboard, surfboard, tennis racket, bottle, wine glass, cup, fork, knife, spoon, bowl, banana, apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake, chair, sofa, pottedplant, bed, diningtable, toilet, tvmonitor, laptop, mouse, remote, keyboard, cell phone, microwave, oven, toaster, sink, refrigerator, book, clock, vase, scissors, teddy bear, hair drier, toothbrush.

### Recognition Models

| Value | Model | Required Package |
|-------|-------|-----------------|
| `lbph` | OpenCV LBPH (default) | `opencv-contrib-python-headless` |
| `dlib` | face_recognition (dlib) | `face_recognition` (optional) |

---

## Helm Chart Values

| Value | Default | Description |
|-------|---------|-------------|
| `backend.aiModel` | `lbph` | Recognition model |
| `backend.image.tag` | `v1.2.0` | Backend image tag |
| `frontend.image.tag` | `v1.2.0` | Frontend image tag |
| `ovms.enabled` | `true` | Enable OpenVINO detection |
| `ovms.externalUrl` | `""` | External OVMS/ModelMesh REST URL |
| `ovms.modelName` | `face-detection-retail-0005` | Model name on OVMS |
| `ovms.confidenceThreshold` | `0.5` | Detection confidence threshold |
| `ovms.defaultDetectionMethod` | `opencv` | Initial detection method |
| `chat.enabled` | `true` | Enable AI chat feature |
| `persistence.enabled` | `true` | Use PVC for training data |

---

## Project Structure

```
neuroface/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── api/                # Route handlers
│   │   │   ├── objects.py      # Object detection endpoints
│   │   │   └── chat.py         # AI chat with face + object context
│   │   ├── core/               # Config + face engine
│   │   ├── models/             # Pluggable AI models
│   │   │   ├── base.py         # Abstract model interface
│   │   │   ├── lbph_model.py   # OpenCV LBPH recognizer
│   │   │   ├── dlib_model.py   # Optional dlib recognizer
│   │   │   ├── openvino_detector.py  # OpenVINO OVMS client
│   │   │   └── object_detector.py    # YOLOv4-tiny (80 COCO classes)
│   │   └── resources/          # Haar cascades
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # Angular 17 SPA
│   ├── src/app/
│   │   ├── components/
│   │   │   ├── objects/        # Object detection UI
│   │   │   ├── recognition/    # Multi-person face grid
│   │   │   └── chat/           # Enhanced AI chat
│   │   └── services/           # API + Camera services
│   ├── nginx.conf
│   └── Dockerfile
├── helm/neuroface/             # Helm chart (v1.2.0)
├── docs/                       # GitHub Pages + screenshots
├── .github/workflows/          # CI/CD
├── devfile.yaml                # Red Hat Dev Spaces
├── docker-compose.yml          # Podman Desktop
├── build-push-quay.sh          # Build + push script
└── README.md
```

---

## Container Images

| Image | Tag | Description |
|-------|-----|-------------|
| `quay.io/maximilianopizarro/neuroface-backend` | `latest` / `v1.0.1` | Without OpenVINO |
| `quay.io/maximilianopizarro/neuroface-backend` | `v1.1.0` | With OpenVINO integration |
| `quay.io/maximilianopizarro/neuroface-backend` | `v1.1.1` | Red Hat UI + mobile flash |
| `quay.io/maximilianopizarro/neuroface-backend` | `v1.2.0` | Object detection + multi-person grid |
| `quay.io/maximilianopizarro/neuroface-frontend` | `latest` / `v1.0.1` | Without OpenVINO UI |
| `quay.io/maximilianopizarro/neuroface-frontend` | `v1.1.0` | With OpenVINO UI controls |
| `quay.io/maximilianopizarro/neuroface-frontend` | `v1.1.1` | Red Hat design + fullscreen training |
| `quay.io/maximilianopizarro/neuroface-frontend` | `v1.2.0` | Object detection + enhanced chat |

---

## License

See repository license file if present.
