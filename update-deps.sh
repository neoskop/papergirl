#!/bin/bash
set -e

bold() {
  local BOLD='\033[1m'
  local NC='\033[0m'
  printf "${BOLD}${1}${NC}"
}

info() {
  local BLUE='\033[1;34m'
  local NC='\033[0m'
  printf "[${BLUE}INFO${NC}] $1\n"
}

error() {
  local RED='\033[1;31m'
  local NC='\033[0m'
  printf "[${RED}ERROR${NC}] $1\n"
}

warn() {
  local ORANGE='\033[1;33m'
  local NC='\033[0m'
  printf "[${ORANGE}WARN${NC}] $1\n"
}

check_commands() {
  for command in $@ ; do
    if ! command -v $command >/dev/null; then
      echo -e "Install $(bold $command)"
      exit 1
    fi
  done
}

get_tags() {
    curl -s https://hub.docker.com/v2/repositories/$1/tags/?page_size=10000 | jq -r '.results | map(.name) | .[]'
}

check_commands yarn-check yarn jq yq
yarn-check -u
echo "Will use the following new image versions:"
NGINX_LATEST_TAG=`get_tags library/nginx | grep '^[0-9]*\.[0-9]*\.[0-9]*$' | sort -V | tail -n 1`
echo "  - NGINX: $(bold $NGINX_LATEST_TAG)"
NGINX_PROMETHEUS_EXPORTER_LATEST_TAG=`get_tags nginx/nginx-prometheus-exporter | grep '^[0-9]*\.[0-9]*\.[0-9]*$' | sort -V | tail -n 1`
echo "  - NGINX Prometheus Exporter: $(bold $NGINX_PROMETHEUS_EXPORTER_LATEST_TAG)"
NATS_LATEST_TAG=`get_tags library/nats | grep '^[0-9]*\.[0-9]*\.[0-9]*-scratch$' | sort -V | tail -n 1`
echo "  - NATS: $(bold $NATS_LATEST_TAG)"
NATS_LATEST_VERSION=`get_tags library/nats | grep '^[0-9]*\.[0-9]*\.[0-9]*$' | sort -V | tail -n 1`
MINIO_LATEST_TAG=`get_tags minio/minio | grep '^RELEASE' | sort | tail -n 1`
echo "  - MinIO: $(bold $MINIO_LATEST_TAG)"
BUSYBOX_LATEST_TAG=`get_tags library/busybox | grep '^[0-9]*\.[0-9]*\.[0-9]*$' | sort -V | tail -n 1`
echo "  - Busybox: $(bold $BUSYBOX_LATEST_TAG)"
yq w -i docker-compose.yml services.webserver.image nginx:$NGINX_LATEST_TAG
yq w -i docker-compose.yml services.queue.image nats:$NATS_LATEST_TAG
yq w -i docker-compose.yml services.s3.image minio/minio:$MINIO_LATEST_TAG
yq w -i helm/values.yaml nginx.image.tag $NGINX_LATEST_TAG
yq w -i helm/values.yaml prometheus.nginxExporterImage.tag $NGINX_PROMETHEUS_EXPORTER_LATEST_TAG
yq w -i helm/values.yaml minio.image.tag $MINIO_LATEST_TAG
yq w -i helm/values.yaml nats.version $NATS_LATEST_VERSION
yq w -i helm/values.yaml volumeSetup.image.tag $BUSYBOX_LATEST_TAG