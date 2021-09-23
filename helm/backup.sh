#!/bin/bash

bold() {
  local BOLD='\033[1m'
  local NC='\033[0m'
  printf "${BOLD}${@}${NC}"
}

info() {
  local BLUE='\033[1;34m'
  local NC='\033[0m'
  printf "[${BLUE}INFO${NC}] $@\n"
}

error() {
  local RED='\033[1;31m'
  local NC='\033[0m'
  printf "[${RED}ERROR${NC}] $@\n"
}

warn() {
  local ORANGE='\033[1;33m'
  local NC='\033[0m'
  printf "[${ORANGE}WARN${NC}] $@\n"
}

silent_exec() {
  output=`$@`

  if [ $? -gt 0 ] ; then
    error "The command $(bold $@) failed: $output"
    exit 1
  fi
}

setup_bucket() {
  if ! mc ls s3 | grep -q $1 ; then
      info "Creating bucket $(bold $1)"
      mc mb s3/$1 &>/dev/null
  fi

  info "Add download policy to bucket $(bold $1)"
  mc policy set download s3/$1 &>/dev/null
}

backup_bucket() {
  setup_bucket $2
  TEMP_DIR=$(mktemp -d)
  info "Created temporary directory $(bold $TEMP_DIR)"
  info "Mirroring bucket $(bold $1) to $(bold $TEMP_DIR)"
  silent_exec mc mirror s3/$1 $TEMP_DIR

  if [ `mc ls s3/$2 | wc -l` -gt 1 ]; then
    info "Deleting contents of bucket $(bold $2)"
    silent_exec mc rm --recursive --force s3/$2
  fi

  info "Mirroring $(bold $TEMP_DIR) to $(bold $2)"
  silent_exec mc mirror $TEMP_DIR s3/$2
  info "Deleting temporary directory $(bold $TEMP_DIR)"
  rm -rf $TEMP_DIR
}

info "Setting up config in $(bold '~/.mc/config.json')"
silent_exec mc config host add s3 http://{{ include "papergirl.s3.endpoint" . }}:9000 {{ .Values.s3.accesskey }} {{ .Values.s3.secretkey }}
backup_bucket {{ .Values.s3.buckets.name }} {{ .Values.s3.buckets.backupName }}
{{ if .Values.papergirlPreview.enabled -}}
backup_bucket {{ .Values.s3.buckets.previewName }} {{ .Values.s3.buckets.previewBackupName }}
{{- end }}


