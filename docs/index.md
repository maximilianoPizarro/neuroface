# NeuroFace - Facial Recognition Webapp with ML

## Overview

NeuroFace is a facial recognition web application built with **FastAPI** (Python) and **Angular 17**. It uses **OpenCV** for face detection and recognition, with a pluggable AI model architecture that supports:

- **OpenCV LBPH** (default) — Local Binary Patterns Histograms, fast and lightweight
- **dlib** (optional) — 128-dimensional face encodings via the face_recognition library

## Architecture

- **Backend:** FastAPI running on `registry.access.redhat.com/ubi9/python-311` (Red Hat UBI9 certified image)
- **Frontend:** Angular 17 with Material Design served via `registry.access.redhat.com/ubi9/nginx-122`
- **Container Runtime:** Compatible with Podman Desktop and OpenShift

## Helm Chart

The Helm chart deploys both backend and frontend components with:

- Deployments for backend (FastAPI + uvicorn) and frontend (Angular + Nginx)
- ClusterIP Services for internal communication
- OpenShift Route for external access (configurable)
- PersistentVolumeClaim for training data storage
- ConfigMap for AI model configuration

### Quick Start

```bash
helm install neuroface ./helm/neuroface -n neuroface --create-namespace
```

### Configuration

Set the AI model via `backend.aiModel` value:

```bash
helm install neuroface ./helm/neuroface --set backend.aiModel=lbph
```

## Container Images

| Image | Registry |
|-------|----------|
| neuroface-backend | `quay.io/maximilianopizarro/neuroface-backend` |
| neuroface-frontend | `quay.io/maximilianopizarro/neuroface-frontend` |

## Links

- **Source:** [github.com/maximilianoPizarro/neuroface](https://github.com/maximilianoPizarro/neuroface)
- **Based on:** [reconocimiento-facial](https://github.com/maximilianoPizarro/reconocimiento-facial)
