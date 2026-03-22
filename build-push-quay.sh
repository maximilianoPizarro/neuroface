#!/usr/bin/env bash
# Build NeuroFace images and push to quay.io
# Usage: ./build-push-quay.sh [quay-namespace] [--dlib]
# Default namespace: maximilianopizarro
# Pass --dlib to include face_recognition/dlib in the backend image
# Requires: podman, logged in to quay.io (podman login quay.io)

set -e
QUAY_NS="${1:-maximilianopizarro}"
INSTALL_DLIB="false"

for arg in "$@"; do
  case "$arg" in
    --dlib) INSTALL_DLIB="true" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Using Quay namespace: $QUAY_NS"
echo "Install dlib: $INSTALL_DLIB"

echo "=== Building neuroface-backend ==="
podman build --build-arg "INSTALL_DLIB=${INSTALL_DLIB}" \
  -t "quay.io/${QUAY_NS}/neuroface-backend:latest" -f backend/Dockerfile backend
podman push "quay.io/${QUAY_NS}/neuroface-backend:latest"

echo "=== Building neuroface-frontend ==="
podman build -t "quay.io/${QUAY_NS}/neuroface-frontend:latest" -f frontend/Dockerfile frontend
podman push "quay.io/${QUAY_NS}/neuroface-frontend:latest"

echo "=== All images built and pushed to quay.io/${QUAY_NS} ==="
echo "  - neuroface-backend:latest"
echo "  - neuroface-frontend:latest"
