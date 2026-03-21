#!/usr/bin/env bash
# Update NeuroFace Helm chart: bump version, re-package, and regenerate the docs/ repository index.
#
# Usage:
#   ./update-helm-chart.sh                  # auto-increment patch (1.0.0 → 1.0.1)
#   ./update-helm-chart.sh 2.1.0            # set explicit chart version
#   ./update-helm-chart.sh 2.1.0 2.1.0      # set chart version AND appVersion
#
# Prerequisites: helm CLI

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHART_DIR="${SCRIPT_DIR}/helm/neuroface"
DOCS_DIR="${SCRIPT_DIR}/docs"
CHART_FILE="${CHART_DIR}/Chart.yaml"
REPO_URL="https://maximilianopizarro.github.io/neuroface"

if [[ ! -f "$CHART_FILE" ]]; then
  echo "ERROR: Chart.yaml not found at ${CHART_FILE}" >&2
  exit 1
fi

current_version=$(grep '^version:' "$CHART_FILE" | awk '{print $2}')
current_app_version=$(grep '^appVersion:' "$CHART_FILE" | sed 's/appVersion:[[:space:]]*//' | tr -d '"')

echo "Current chart version : ${current_version}"
echo "Current appVersion    : ${current_app_version}"

auto_bump_patch() {
  local v="$1"
  local major minor patch
  IFS='.' read -r major minor patch <<< "$v"
  patch=$((patch + 1))
  echo "${major}.${minor}.${patch}"
}

if [[ -n "${1:-}" ]]; then
  new_version="$1"
else
  new_version=$(auto_bump_patch "$current_version")
fi

new_app_version="${2:-$new_version}"

echo ""
echo "New chart version     : ${new_version}"
echo "New appVersion        : ${new_app_version}"
echo ""

sed -i "s/^version:.*/version: ${new_version}/" "$CHART_FILE"
sed -i "s/^appVersion:.*/appVersion: \"${new_app_version}\"/" "$CHART_FILE"

echo "=== Chart.yaml updated ==="

rm -f "${DOCS_DIR}"/neuroface-*.tgz

echo "=== Packaging Helm chart ==="
helm package "$CHART_DIR" --destination "$DOCS_DIR"

echo "=== Generating repository index ==="
helm repo index "$DOCS_DIR" --url "$REPO_URL"

echo ""
echo "Done. Updated files:"
echo "  - ${CHART_FILE}"
echo "  - ${DOCS_DIR}/neuroface-${new_version}.tgz"
echo "  - ${DOCS_DIR}/index.yaml"
echo ""
echo "Next steps:"
echo "  git add helm/ docs/"
echo "  git commit -m \"Bump Helm chart to ${new_version}\""
echo "  git push origin main"
