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
Create a prefix for fallback frontend resources
*/}}
{{- define "papergirl.image-proxy.name" -}}
{{- include "papergirl.fullname" . }}-image-proxy
{{- end -}}

{{/*
Create a prefix for preview fallback frontend resources
*/}}
{{- define "papergirl.preview-fallback.name" -}}
{{- include "papergirl.fullname" . }}-preview-fallback
{{- end -}}

{{/*
Endpoint for the S3 server to use
*/}}
{{- define "papergirl.s3.endpoint" -}}
{{- .Values.s3.endpoint -}}
{{- end -}}

{{/*
Protocol for the S3 server to use
*/}}
{{- define "papergirl.s3.protocol" -}}
{{- .Values.s3.ssl | ternary "https" "http" -}}
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

{{/*
Create a prefix for the pull secret
*/}}
{{- define "papergirl.pull-secret-name" -}}
{{- include "papergirl.fullname" . }}-pull-secret
{{- end -}}

{{- define "imagePullSecret" }}
{{- with .Values.imagePullSecret }}
{{- printf "{\"auths\":{\"%s\":{\"username\":\"%s\",\"password\":\"%s\",\"email\":\"%s\",\"auth\":\"%s\"}}}" .registry .username .password .email (printf "%s:%s" .username .password | b64enc) | b64enc }}
{{- end }}
{{- end }}