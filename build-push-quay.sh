#!/usr/bin/env bash
# Build NeuroFace images and push to quay.io
# Usage: ./build-push-quay.sh [quay-namespace]
# Default namespace: maximilianopizarro
# Requires: podman, logged in to quay.io (podman login quay.io)

set -e
QUAY_NS="${1:-maximilianopizarro}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Using Quay namespace: $QUAY_NS"

echo "=== Building neuroface-backend ==="
podman build -t "quay.io/${QUAY_NS}/neuroface-backend:latest" -f backend/Dockerfile backend
podman push "quay.io/${QUAY_NS}/neuroface-backend:latest"

echo "=== Building neuroface-frontend ==="
podman build -t "quay.io/${QUAY_NS}/neuroface-frontend:latest" -f frontend/Dockerfile frontend
podman push "quay.io/${QUAY_NS}/neuroface-frontend:latest"

echo "=== All images built and pushed to quay.io/${QUAY_NS} ==="
echo "  - neuroface-backend:latest"
echo "  - neuroface-frontend:latest"
