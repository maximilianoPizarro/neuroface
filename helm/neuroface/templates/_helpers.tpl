{{/*
Expand the name of the chart.
*/}}
{{- define "neuroface.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "neuroface.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "neuroface.labels" -}}
helm.sh/chart: {{ include "neuroface.name" . }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ include "neuroface.name" . }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "neuroface.backendLabels" -}}
{{ include "neuroface.labels" . }}
app.kubernetes.io/name: {{ include "neuroface.fullname" . }}-backend
app.kubernetes.io/component: backend
app.openshift.io/runtime: python
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "neuroface.frontendLabels" -}}
{{ include "neuroface.labels" . }}
app.kubernetes.io/name: {{ include "neuroface.fullname" . }}-frontend
app.kubernetes.io/component: frontend
app.openshift.io/runtime: angularjs
{{- end }}
