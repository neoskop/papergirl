#!/bin/bash
set -e
cd $(git rev-parse --show-toplevel)

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
  for command in $@; do
    if ! command -v $command >/dev/null; then
      echo -e "Install $(bold $command)"
      exit 1
    fi
  done
}

get_tags() {
  i=0
  has_more=""
  while [[ $has_more != "null" ]]; do
    i=$((i + 1))
    answer=$(curl -s "https://hub.docker.com/v2/repositories/$1/tags/?page_size=100&page=$i")
    result=$(echo "$answer" | jq -r '.results | map(.name) | .[]')
    has_more=$(echo "$answer" | jq -r '.next')
    if [[ ! -z "${result// /}" ]]; then results="${results}\n${result}"; fi
  done
  echo -e "$results"
}

get_node_lts_tags() {
  local NODE_TAGS=$(get_tags library/node | grep '^[0-9]*\.[0-9]*\.[0-9]*' | grep '\-buster\-slim$' | sort -V)
  for tag in $NODE_TAGS; do
    if [[ "$tag" =~ ^[0-9]+ ]] && [ -n "$(echo "${BASH_REMATCH[0]}" | awk '! ($0 % 2)')" ]; then
      echo "$tag"
    fi
  done
}

check_commands yarn-check yarn jq yq
yarn-check -u
echo "Will use the following new image versions:"
NODE_LATEST_TAG=$(get_node_lts_tags | tail -n 1)
echo "  - Node: $(bold $NODE_LATEST_TAG)"
DNSMASQ_LATEST_TAG=$(get_tags janeczku/go-dnsmasq | grep '^release-[0-9]*\.[0-9]*\.[0-9]$' | sort -V | tail -n 1)
echo "  - Dnsmasq: $(bold $DNSMASQ_LATEST_TAG)"
OPENRESTY_LATEST_TAG=$(get_tags openresty/openresty | grep '^[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*-buster$' | sort -V | tail -n 1)
echo "  - OpenResty: $(bold $OPENRESTY_LATEST_TAG)"
NGINX_PROMETHEUS_EXPORTER_LATEST_TAG=$(get_tags nginx/nginx-prometheus-exporter | grep '^[0-9]*\.[0-9]*\.[0-9]*$' | sort -V | tail -n 1)
echo "  - NGINX Prometheus Exporter: $(bold $NGINX_PROMETHEUS_EXPORTER_LATEST_TAG)"
NATS_LATEST_TAG=$(get_tags library/nats | grep '^[0-9]*\.[0-9]*\.[0-9]*-scratch$' | sort -V | tail -n 1)
echo "  - NATS: $(bold $NATS_LATEST_TAG)"
NATS_LATEST_VERSION=$(get_tags library/nats | grep '^[0-9]*\.[0-9]*\.[0-9]*$' | sort -V | tail -n 1)
MINIO_LATEST_TAG=$(get_tags minio/minio | grep '^RELEASE.[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}-[0-9]\{2\}-[0-9]\{2\}Z$' | sort | tail -n 1)
echo "  - MinIO: $(bold $MINIO_LATEST_TAG)"
MINIO_CONSOLE_LATEST_TAG=$(get_tags minio/console | grep '^v[0-9]*\.[0-9]*\.[0-9]*$' | sort | tail -n 1)
echo "  - MinIO Console: $(bold $MINIO_CONSOLE_LATEST_TAG)"
MINIO_MC_LATEST_TAG=$(get_tags minio/mc | grep '^RELEASE.[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}-[0-9]\{2\}-[0-9]\{2\}Z$' | sort | tail -n 1)
echo "  - MinIO CLI: $(bold $MINIO_MC_LATEST_TAG)"
BUSYBOX_LATEST_TAG=$(get_tags library/busybox | grep '^[0-9]*\.[0-9]*\.[0-9]*$' | sort -V | tail -n 1)
echo "  - Busybox: $(bold $BUSYBOX_LATEST_TAG)"
sed -i "1 s/^.*$/FROM node:$NODE_LATEST_TAG as base/" Dockerfile
CARAVAGGIO_LATEST_TAG=$(get_tags ramielcreations/caravaggio | grep '^[0-9]*\.[0-9]*\.[0-9]*$' | sort -V | tail -n 1)
echo "  - Caravaggio: $(bold $CARAVAGGIO_LATEST_TAG)"
yq eval -i ".services.webserver.image = \"openresty/openresty:$OPENRESTY_LATEST_TAG\"" docker-compose.yml
yq eval -i ".services.queue.image = \"nats:$NATS_LATEST_TAG\"" docker-compose.yml
yq eval -i ".services.s3.image = \"minio/minio:$MINIO_LATEST_TAG\"" docker-compose.yml
yq eval -i ".dnsmasq.image.tag = \"$DNSMASQ_LATEST_TAG\"" helm/values.yaml
yq eval -i ".nginx.image.tag = \"$OPENRESTY_LATEST_TAG\"" helm/values.yaml
yq eval -i ".prometheus.nginxExporterImage.tag = \"$NGINX_PROMETHEUS_EXPORTER_LATEST_TAG\"" helm/values.yaml
yq eval -i ".minio.image.tag = \"$MINIO_LATEST_TAG\"" helm/values.yaml
yq eval -i ".minio.console.image.tag = \"$MINIO_CONSOLE_LATEST_TAG\"" helm/values.yaml
yq eval -i ".bucketSetup.image.tag = \"$MINIO_MC_LATEST_TAG\"" helm/values.yaml
yq eval -i ".backup.image.tag = \"$MINIO_MC_LATEST_TAG\"" helm/values.yaml
yq eval -i ".nats.version = \"$NATS_LATEST_VERSION\"" helm/values.yaml
yq eval -i ".volumeSetup.image.tag = \"$BUSYBOX_LATEST_TAG\"" helm/values.yaml
yq eval -i ".connectionCheck.image.tag = \"$BUSYBOX_LATEST_TAG\"" helm/values.yaml
yq eval -i ".imageProxy.image.tag = \"$CARAVAGGIO_LATEST_TAG\"" helm/values.yaml
