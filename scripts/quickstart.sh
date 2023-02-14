#!/bin/bash
set -e

if ! kind get clusters | grep -o papergirl &>/dev/null ; then
    reg_name='kind-registry-papergirl'
    reg_port='5000'
    running="$(docker inspect -f '{{.State.Running}}' "${reg_name}" 2>/dev/null || true)"

    state=$(docker container ls -a -f name=$reg_name --format="{{.State}}")
    if [ -z "$state" ]; then
        docker run \
            -d --restart=always -p "127.0.0.1:${reg_port}:5000" --name "${reg_name}" \
            registry:2
    elif [ "$state" == "exited" ]; then
      docker start "${reg_name}"
    fi

    local_dir=`pwd`

cat <<EOF | kind create cluster --name papergirl --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors."localhost:${reg_port}"]
    endpoint = ["http://${reg_name}:${reg_port}"]
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 30001
    hostPort: 8081
    listenAddress: "127.0.0.1"
  - containerPort: 30002
    hostPort: 8082
    listenAddress: "127.0.0.1"
  - containerPort: 30003
    hostPort: 9000
    listenAddress: "127.0.0.1"
  - containerPort: 30004
    hostPort: 9001
    listenAddress: "127.0.0.1"
  - containerPort: 30005
    hostPort: 4222
    listenAddress: "127.0.0.1"
  extraMounts:
  - hostPath: ${local_dir}
    containerPath: /papergirl
EOF

    docker network connect "kind" "${reg_name}" || true

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:${reg_port}"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
EOF
fi

kubectl config use-context kind-papergirl &>/dev/null

if ! kubectl get ns nats &>/dev/null ; then
  helm repo add nats https://nats-io.github.io/k8s/helm/charts/
  kubectl create ns nats
  helm install nats nats/nats \
  --namespace nats \
  --set cluster.enabled=false
fi

if ! kubectl get ns minio &>/dev/null ; then
  helm repo add minio https://charts.min.io/
  kubectl create ns minio
  helm install minio minio/minio \
   --namespace minio \
   --set rootUser=rootuser,rootPassword=rootpass123 \
   --set replicas=3 \
   --set resources.requests.memory=512Mi
fi

docker build --target development -t localhost:5000/papergirl:latest .
docker push localhost:5000/papergirl:latest

if ! helm status papergirl -n papergirl &>/dev/null ; then
    kubectl create ns papergirl
    helm install papergirl -n papergirl -f quickstart-values.yaml ./helm
else
    helm upgrade papergirl -n papergirl -f quickstart-values.yaml ./helm
    sleep 3
    kubectl -n papergirl rollout restart sts/papergirl
    kubectl -n papergirl rollout restart sts/papergirl-preview
fi

kubectl config set-context --current --namespace=papergirl &>/dev/null