# NeuroFace Helm Chart

Deploys the NeuroFace facial recognition webapp on Kubernetes / OpenShift.

## Prerequisites

- Kubernetes 1.23+ or OpenShift 4.x
- Helm 3.x
- Container images pushed to the registry

## Installation

```bash
helm install neuroface ./helm/neuroface -n neuroface --create-namespace
```

## Values

| Parameter                        | Description                          | Default                                                |
|----------------------------------|--------------------------------------|--------------------------------------------------------|
| `backend.image.repository`       | Backend image                        | `quay.io/maximilianopizarro/neuroface-backend`         |
| `backend.image.tag`              | Backend image tag                    | `latest`                                               |
| `backend.replicas`               | Backend replicas                     | `1`                                                    |
| `backend.aiModel`                | AI model type (lbph / dlib)          | `lbph`                                                 |
| `backend.resources.limits.cpu`   | Backend CPU limit                    | `500m`                                                 |
| `backend.resources.limits.memory`| Backend memory limit                 | `512Mi`                                                |
| `frontend.image.repository`      | Frontend image                       | `quay.io/maximilianopizarro/neuroface-frontend`        |
| `frontend.image.tag`             | Frontend image tag                   | `latest`                                               |
| `frontend.replicas`              | Frontend replicas                    | `1`                                                    |
| `route.enabled`                  | Create OpenShift Route               | `true`                                                 |
| `route.host`                     | Route hostname (auto if empty)       | `""`                                                   |
| `persistence.enabled`            | Enable PVC for training data         | `true`                                                 |
| `persistence.size`               | PVC size                             | `1Gi`                                                  |

## Uninstall

```bash
helm uninstall neuroface -n neuroface
```
