[![Artifact Hub](https://img.shields.io/badge/Artifact%20Hub-neuroface-blue?logo=artifacthub)](https://artifacthub.io/packages/helm/neuroface/neuroface)
[![Version](https://img.shields.io/badge/version-v1.2.0-green)](https://github.com/maximilianoPizarro/neuroface/releases/tag/v1.2.0)
[![Quay.io Backend](https://img.shields.io/badge/quay.io-backend-red?logo=redhat)](https://quay.io/repository/maximilianopizarro/neuroface-backend)
[![Quay.io Frontend](https://img.shields.io/badge/quay.io-frontend-red?logo=redhat)](https://quay.io/repository/maximilianopizarro/neuroface-frontend)
[![OpenShift](https://img.shields.io/badge/OpenShift-Ready-EE0000?logo=redhatopenshift)](https://developers.redhat.com/developer-sandbox)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://github.com/maximilianoPizarro/neuroface/blob/main/LICENSE)

> **Experimental** — This is an experimental project for learning and demonstration purposes.

## Overview

NeuroFace is a facial recognition and object detection web application built with **FastAPI** (Python) and **Angular 17**, featuring a **Red Hat design system** inspired UI. It supports:

**Face Detection Engines** (switchable at runtime):
- **OpenCV Haar Cascades** (default) — Local CPU-based detection, no external dependencies
- **OpenVINO Model Server** — Remote AI inference via OpenShift AI / ModelMesh using `face-detection-retail-0005`

**Recognition Models** (applied after detection):
- **OpenCV LBPH** (default) — Local Binary Patterns Histograms, fast and lightweight
- **dlib** (optional) — 128-dimensional face encodings via the face_recognition library

**Object Detection:**
- **YOLOv4-tiny** — 80 COCO classes pre-trained, via OpenCV DNN

### What's New in v1.2.0

- **Object Detection module** — YOLOv4-tiny with 80 COCO pre-trained classes (person, car, dog, chair, bottle, laptop, cell phone, and 73 more)
- **Multi-person face grid** — Simultaneous display for 3+ detected faces with individual face crops
- **Enhanced AI Chat** — Now includes object detection context and OpenVINO model info when analyzing images
- **Experimental badge** moved to footer only (removed from toolbar)
- **New sidebar navigation** includes Object Detection link

### Screenshots

#### Dashboard
![Dashboard](screenshots/dashboard.png)

#### Object Detection (YOLOv4-tiny - 80 COCO Classes)
![Object Detection](screenshots/objects.png)

#### Live Face Recognition
![Recognition](screenshots/recognition.png)

#### AI Face Analysis Chat
![Chat](screenshots/chat.png)

## Architecture (v1.2.0)

```
┌──────────────────────────┐       ┌──────────────────────────────────┐
│  Frontend (Angular 17)   │       │  Backend (FastAPI on UBI9)       │
│                          │       │                                  │
│  WebRTC Camera ──────────┼─POST──┼─▶ /api/recognize                │
│  Training Upload ────────┼─POST──┼─▶ /api/images, /api/train       │
│  Object Detection ───────┼─POST──┼─▶ /api/objects/detect           │
│  AI Chat ────────────────┼─POST──┼─▶ /api/chat                     │
│  Model Config ───────────┼─PUT───┼─▶ /api/models/config            │
│  Detection Switch ───────┼─PUT───┼─▶ /api/models/detection         │
│  Flash/Torch (mobile) ───┤       │                                  │
│  Multi-person Grid ──────┤       │                                  │
│                          │       │                                  │
│  Nginx (:8080)           │       │  Uvicorn (:8080)                │
└──────────────────────────┘       │  ┌────────────────────────────┐  │
                                   │  │ Face Detection (switchable)│  │
                                   │  │  ├─ OpenCV Haar Cascades   │  │
                                   │  │  └─ OpenVINO OVMS ─────────┼──┼──▶ ModelMesh
                                   │  ├────────────────────────────┤  │    :8008
                                   │  │ Object Detection           │  │
                                   │  │  └─ YOLOv4-tiny (80 COCO) │  │
                                   │  ├────────────────────────────┤  │
                                   │  │ Recognition (pluggable)    │  │
                                   │  │  ├─ LBPH (default)         │  │
                                   │  │  └─ dlib (optional)        │  │
                                   │  └────────────────────────────┘  │
                                   └──────────────────────────────────┘
```

## Helm Chart

### Quick Start (without OpenVINO)

```bash
helm repo add neuroface https://maximilianopizarro.github.io/neuroface/
helm install neuroface neuroface/neuroface
```

### Quick Start (with OpenVINO on OpenShift AI)

```bash
helm install neuroface neuroface/neuroface \
  --set ovms.externalUrl=http://modelmesh-serving:8008 \
  --set ovms.modelName=face-detection-retail-0005
```

### Configuration

| Value | Default | Description |
|-------|---------|-------------|
| `backend.aiModel` | `lbph` | Recognition model: `lbph` or `dlib` |
| `backend.image.tag` | `v1.2.0` | Backend container image tag |
| `frontend.image.tag` | `v1.2.0` | Frontend container image tag |
| `ovms.enabled` | `true` | Enable OpenVINO face detection |
| `ovms.externalUrl` | `""` | External OVMS/ModelMesh URL. When set, no standalone OVMS is deployed |
| `ovms.modelName` | `face-detection-retail-0005` | Face detection model name on OVMS |
| `ovms.confidenceThreshold` | `0.5` | Minimum detection confidence (0.0-1.0) |
| `ovms.defaultDetectionMethod` | `opencv` | Initial detection method: `opencv` or `openvino` |

---

## Deploying OpenVINO on Red Hat Developer Sandbox

This guide explains how to deploy the `face-detection-retail-0005` model on **OpenShift AI (RHOAI)** in a **Red Hat Developer Sandbox** so that NeuroFace can use it for remote face detection.

### Prerequisites

- A [Red Hat Developer Sandbox](https://developers.redhat.com/developer-sandbox) account
- `oc` CLI logged in to your sandbox
- OpenShift AI (RHOAI) enabled in your sandbox (enabled by default)

### Step 1: Create the ServingRuntime

The ServingRuntime defines the OpenVINO Model Server container that will serve models.

```bash
oc apply -f - <<'EOF'
apiVersion: serving.kserve.io/v1alpha1
kind: ServingRuntime
metadata:
  name: neuroface
  annotations:
    openshift.io/display-name: "NeuroFace OpenVINO Runtime"
  labels:
    opendatahub.io/dashboard: "true"
spec:
  supportedModelFormats:
    - name: openvino_ir
      version: opset1
      autoSelect: true
    - name: onnx
      version: "1"
    - name: tensorflow
      version: "2"
  multiModel: true
  grpcDataEndpoint: port:8001
  grpcEndpoint: port:8085
  containers:
    - name: ovms
      image: quay.io/modelmesh-serving/ovms-adapter:latest
      args:
        - --port=8001
        - --rest_port=8888
        - --model_store=/models
        - --grpc_bind_address=127.0.0.1
        - --rest_bind_address=127.0.0.1
      resources:
        requests:
          cpu: 500m
          memory: 3Gi
        limits:
          cpu: "2"
          memory: 3Gi
  builtInAdapter:
    serverType: ovms
    runtimeManagementPort: 8888
    memBufferBytes: 134217728
    modelLoadingTimeoutMillis: 90000
EOF
```

### Step 2: Create a PVC for Model Storage

```bash
oc apply -f - <<'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: neuroface-models
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
  storageClassName: gp3
EOF
```

### Step 3: Configure ModelMesh Storage

Create the `storage-config` secret that tells ModelMesh where to find models:

```bash
oc apply -f - <<'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: storage-config
stringData:
  neuroface-models: |
    {
      "type": "pvc",
      "name": "neuroface-models"
    }
EOF
```

### Step 4: Download the Face Detection Model

This Job downloads Intel's `face-detection-retail-0005` model (OpenVINO IR, FP16) from the Open Model Zoo:

```bash
oc apply -f - <<'EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: download-face-model
spec:
  template:
    spec:
      containers:
        - name: downloader
          image: registry.access.redhat.com/ubi9/python-311:latest
          command:
            - bash
            - -c
            - |
              pip install openvino-dev[onnx,tensorflow] > /dev/null 2>&1
              omz_downloader --name face-detection-retail-0005 --precision FP16 \
                -o /tmp/models
              mkdir -p /models/face-detection-retail-0005/1
              cp /tmp/models/intel/face-detection-retail-0005/FP16/* \
                /models/face-detection-retail-0005/1/
              ls -la /models/face-detection-retail-0005/1/
          volumeMounts:
            - name: model-storage
              mountPath: /models
      volumes:
        - name: model-storage
          persistentVolumeClaim:
            claimName: neuroface-models
      restartPolicy: Never
  backoffLimit: 2
EOF
```

Wait for the job to complete:

```bash
oc wait --for=condition=complete job/download-face-model --timeout=300s
oc logs job/download-face-model
```

You should see `face-detection-retail-0005.xml` and `.bin` files listed.

### Step 5: Deploy the InferenceService

```bash
oc apply -f - <<'EOF'
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: face-detection-retail-0005
  annotations:
    serving.kserve.io/deploymentMode: ModelMesh
spec:
  predictor:
    model:
      modelFormat:
        name: openvino_ir
      runtime: neuroface
      storage:
        key: neuroface-models
        path: face-detection-retail-0005
EOF
```

Wait for the model to load:

```bash
oc wait --for=condition=Ready inferenceservice/face-detection-retail-0005 --timeout=300s
```

### Step 6: Verify the Model

```bash
oc exec deployment/neuroface-backend -- \
  curl -s http://modelmesh-serving:8008/v2/models/face-detection-retail-0005
```

Expected output:

```json
{
  "name": "face-detection-retail-0005__isvc-...",
  "platform": "OpenVINO",
  "inputs": [{"name": "input.1", "datatype": "FP32", "shape": ["1","3","300","300"]}],
  "outputs": [{"name": "527", "datatype": "FP32", "shape": ["1","1","200","7"]}]
}
```

### Step 7: Deploy NeuroFace

```bash
helm repo add neuroface https://maximilianopizarro.github.io/neuroface/
helm install neuroface neuroface/neuroface \
  --set ovms.externalUrl=http://modelmesh-serving:8008 \
  --set ovms.modelName=face-detection-retail-0005
```

The backend auto-detects the model's input/output tensor names from the OVMS metadata endpoint.

---

## Using the UI

### Dashboard

The dashboard shows the current system status:

- **Model Trained** badge indicates if the LBPH recognizer is trained
- **OpenVINO** / **OpenCV** chip shows the active detection method
- **OVMS: connected** confirms connectivity to ModelMesh
- **YOLO: ready** confirms the object detector is loaded

### Object Detection

1. Go to **Object Detection** from the sidebar
2. Start the camera and enable **Auto-detect** to continuously detect objects
3. The module uses **YOLOv4-tiny** pre-trained on 80 COCO classes:

   person, bicycle, car, motorbike, aeroplane, bus, train, truck, boat, traffic light, fire hydrant, stop sign, parking meter, bench, bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe, backpack, umbrella, handbag, tie, suitcase, frisbee, skis, snowboard, sports ball, kite, baseball bat, baseball glove, skateboard, surfboard, tennis racket, bottle, wine glass, cup, fork, knife, spoon, bowl, banana, apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake, chair, sofa, pottedplant, bed, diningtable, toilet, tvmonitor, laptop, mouse, remote, keyboard, cell phone, microwave, oven, toaster, sink, refrigerator, book, clock, vase, scissors, teddy bear, hair drier, toothbrush

4. Detected objects are shown with bounding boxes and confidence scores
5. A summary panel shows object counts grouped by class

### Live Recognition (Multi-Person)

1. Go to **Recognition** and start the camera
2. Enable **Auto-detect** for continuous detection
3. When **3+ faces** are detected, individual face crops are shown in a grid below the camera
4. Each face card shows: cropped face image, identity label, confidence %, and dimensions

### AI Face Analysis Chat

1. Go to **AI Chat** — requires LLM endpoint configuration
2. Capture an image and ask questions about faces or objects
3. The chat now includes **object detection data** alongside face analysis data when an image is attached
4. OpenVINO detection method info is included in the context

### Training

1. Go to **Training** and use the fullscreen icon for distraction-free capture
2. On mobile, use the **flash/torch** button if you need more light
3. Enter a person name, then capture multiple images
4. Click **Start Training** to train the recognition model

### Model Configuration

Switch between detection methods at runtime:

- **Face Detection Method** — switch between OpenCV (local) and OpenVINO (remote)
- **Recognition Model** — select LBPH or dlib

---

## Container Images

| Image | Tag | Description |
|-------|-----|-------------|
| `quay.io/maximilianopizarro/neuroface-backend` | `latest` / `v1.0.1` | Stable release without OpenVINO |
| `quay.io/maximilianopizarro/neuroface-backend` | `v1.1.0` | With OpenVINO integration |
| `quay.io/maximilianopizarro/neuroface-backend` | `v1.1.1` | Red Hat UI + mobile flash |
| `quay.io/maximilianopizarro/neuroface-backend` | `v1.2.0` | Object detection + multi-person grid |
| `quay.io/maximilianopizarro/neuroface-frontend` | `latest` / `v1.0.1` | Stable release |
| `quay.io/maximilianopizarro/neuroface-frontend` | `v1.1.0` | With OpenVINO UI controls |
| `quay.io/maximilianopizarro/neuroface-frontend` | `v1.1.1` | Red Hat design + fullscreen training |
| `quay.io/maximilianopizarro/neuroface-frontend` | `v1.2.0` | Object detection + enhanced chat |

## API Endpoints (v1.2.0)

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
| `/api/models/available` | GET | List models and detection methods with availability |
| `/api/objects/detect` | POST | Detect objects in image (YOLOv4-tiny, 80 COCO classes) |
| `/api/objects/classes` | GET | List all detectable object classes |
| `/api/objects/status` | GET | Object detector status and info |
| `/api/chat` | POST | AI chat with face + object analysis context |
| `/api/chat/status` | GET | Chat feature status |

## Links

- **Source:** [github.com/maximilianoPizarro/neuroface](https://github.com/maximilianoPizarro/neuroface)
- **Helm Chart:** [Artifact Hub](https://artifacthub.io/packages/helm/neuroface/neuroface)
- **Author:** [maximilianoPizarro](https://maximilianopizarro.github.io/)
- **Based on:** [reconocimiento-facial](https://github.com/maximilianoPizarro/reconocimiento-facial)
