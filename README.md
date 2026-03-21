# NeuroFace - Facial Recognition Webapp with ML

Facial recognition web application based on the [reconocimiento-facial](https://github.com/maximilianoPizarro/reconocimiento-facial) archetype. Built with **FastAPI** (Python) and **Angular 17**, containerized with Red Hat UBI9 certified images for **Podman Desktop** and **OpenShift**.

---

## Architecture Overview

| Layer        | Technology                     | Description                                                                 |
|--------------|--------------------------------|-----------------------------------------------------------------------------|
| **Frontend** | Angular 17, Material           | SPA served by Nginx (UBI9); webcam capture via WebRTC, canvas overlay.      |
| **Backend**  | FastAPI, OpenCV, Python 3.11   | REST API for face detection, recognition, training. Pluggable AI models.    |
| **AI Model** | OpenCV LBPH (default)          | Configurable via `AI_MODEL` env. Optional: dlib/face_recognition.           |
| **Data**     | Filesystem                     | Training images, Haar cascades, serialized models under `/data`.            |

**Containers (Podman/OpenShift):** Backend uses `registry.access.redhat.com/ubi9/python-311`. Frontend uses `registry.access.redhat.com/ubi9/nginx-122`.

---

## Architecture Diagram

```
┌─────────────────────────┐       ┌───────────────────────────────────┐
│  Frontend (Angular 17)  │       │  Backend (FastAPI on UBI9 Py311) │
│                         │       │                                   │
│  WebRTC Camera ─────────┼──POST─┼─▶ /api/recognize                 │
│  Training Upload ───────┼──POST─┼─▶ /api/images, /api/train        │
│  Model Config ──────────┼──PUT──┼─▶ /api/models/config              │
│  Dashboard ─────────────┼──GET──┼─▶ /api/labels, /api/health        │
│                         │       │                                   │
│  Nginx (:8080)          │       │  Uvicorn (:8080)                  │
│  /api → proxy_pass ─────┼───────┼──────────────────────────────────▶│
└─────────────────────────┘       │  ┌─────────────────────────┐      │
                                  │  │ Pluggable AI Models     │      │
                                  │  │  ├─ LBPH (default)      │      │
                                  │  │  └─ dlib (optional)     │      │
                                  │  └─────────────────────────┘      │
                                  └───────────────────────────────────┘
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
./build-push-quay.sh [quay-namespace]
```

Default namespace: `maximilianopizarro`. Requires `podman login quay.io`.

Images pushed:
- `neuroface-backend:latest`
- `neuroface-frontend:latest`

### Helm Chart (Kubernetes / OpenShift)

```bash
helm install neuroface ./helm/neuroface -n neuroface
```

See `helm/neuroface/README.md` for values and configuration.

### Red Hat OpenShift Dev Spaces

The `devfile.yaml` defines components for Python backend and Node.js frontend development with predefined build/run commands.

---

## API Endpoints

| Endpoint               | Method    | Description                                    |
|------------------------|-----------|------------------------------------------------|
| `/api/health`          | GET       | Liveness probe                                 |
| `/api/ready`           | GET       | Readiness probe                                |
| `/api/recognize`       | POST      | Send base64 frame, returns detected faces      |
| `/api/train`           | POST      | Train model with uploaded images               |
| `/api/images`          | POST      | Upload training image for a label              |
| `/api/images/{label}`  | GET/DELETE| List or delete images for a label              |
| `/api/labels`          | GET       | List known persons/labels                      |
| `/api/models/config`   | GET/PUT   | View or change AI model configuration          |
| `/api/models/available`| GET       | List available AI models                       |

---

## AI Model Configuration

The backend supports pluggable AI models via the `AI_MODEL` environment variable:

| Value  | Model                      | Required Package                    |
|--------|----------------------------|-------------------------------------|
| `lbph` | OpenCV LBPH (default)      | `opencv-contrib-python-headless`    |
| `dlib` | face_recognition (dlib)    | `face_recognition` (optional)       |

Set `AI_MODEL=dlib` to switch. The dlib model is **not mandatory** — the project works fully with the default LBPH model.

---

## Project Structure

```
neuroface/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── api/                # Route handlers
│   │   ├── core/               # Config + face engine
│   │   ├── models/             # Pluggable AI model interface
│   │   └── resources/data/     # Haar cascades
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # Angular 17 SPA
│   ├── src/app/
│   │   ├── components/         # UI components
│   │   └── services/           # API + Camera services
│   ├── nginx.conf
│   └── Dockerfile
├── helm/neuroface/             # Helm chart
├── docs/                       # Artifact Hub docs
├── .github/workflows/          # CI/CD
├── devfile.yaml                # Red Hat Dev Spaces
├── docker-compose.yml          # Podman Desktop
├── build-push-quay.sh          # Build + push script
└── README.md
```

---

## License

See repository license file if present.
