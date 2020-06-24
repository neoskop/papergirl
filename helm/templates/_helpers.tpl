{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "papergirl.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "papergirl.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create a prefix for all preview instance resources
*/}}
{{- define "papergirl.preview.name" -}}
{{- include "papergirl.fullname" . }}-preview
{{- end -}}

{{/*
Create a prefix for all minio cluster resources
*/}}
{{- define "papergirl.minio.name" -}}
{{- include "papergirl.fullname" . }}-minio
{{- end -}}

{{/*
Create a prefix for backup resources
*/}}
{{- define "papergirl.backup.name" -}}
{{- include "papergirl.fullname" . }}-backup
{{- end -}}

{{/*
Create a prefix for preview backup resources
*/}}
{{- define "papergirl.preview-backup.name" -}}
{{- include "papergirl.fullname" . }}-preview-backup
{{- end -}}

{{/*
Create a prefix for fallback frontend resources
*/}}
{{- define "papergirl.fallback.name" -}}
{{- include "papergirl.fullname" . }}-fallback
{{- end -}}

{{/*
Create a prefix for preview fallback frontend resources
*/}}
{{- define "papergirl.preview-fallback.name" -}}
{{- include "papergirl.fullname" . }}-preview-fallback
{{- end -}}

{{/*
Endpoint for the S3 bucket to use
*/}}
{{- define "papergirl.minio.endpoint" -}}
{{- default (printf "%s-minio" (include "papergirl.fullname" .)) .Values.minio.endpoint -}}
{{- end -}}

{{/*
Create a prefix for all NATS cluster resources
*/}}
{{- define "papergirl.nats.name" -}}
{{- include "papergirl.fullname" . }}-nats
{{- end -}}

{{/*
URL for the NATS instance to use
*/}}
{{- define "papergirl.nats.url" -}}
{{- default (printf "nats://%s-nats:4222" (include "papergirl.fullname" .)) .Values.nats.url -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "papergirl.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "papergirl.labels" -}}
app.kubernetes.io/name: {{ include "papergirl.name" . }}
helm.sh/chart: {{ include "papergirl.chart" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}
