#!/bin/bash
set -e

if ! kind get clusters | grep -o papergirl &>/dev/null ; then
    reg_name='kind-registry'
    reg_port='5000'
    running="$(docker inspect -f '{{.State.Running}}' "${reg_name}" 2>/dev/null || true)"
    if [ "${running}" != 'true' ]; then
        docker run \
            -d --restart=always -p "127.0.0.1:${reg_port}:5000" --name "${reg_name}" \
            registry:2
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
    hostPort: 9090
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

if ! kubectl get ns nats-io &>/dev/null ; then
    kubectl create ns nats-io
    curl -L https://github.com/nats-io/nats-operator/releases/latest/download/00-prereqs.yaml 2>/dev/null | sed 's/namespace: default/namespace: nats-io/' | kubectl apply -f -
    curl -L https://github.com/nats-io/nats-operator/releases/latest/download/10-deployment.yaml 2>/dev/null | yq e '.spec.template.spec.containers[0].args[1] = "--feature-gates=ClusterScoped=true"' - | yq eval '.metadata.namespace = "nats-io"' - | yq eval '... comments=""' - | kubectl apply -f -
fi

if ! kubectl krew list | grep -o minio &>/dev/null ; then
    kubectl krew update
    kubectl krew install minio
fi

if ! kubectl get ns minio-operator &>/dev/null ; then
    kubectl minio init
fi

while ! kubectl get crd | grep -o -i nats.io &>/dev/null ; do
    echo "Waiting for NATS CRDs to be created by operator..."
    sleep 1
done

while ! kubectl get crd tenants.minio.min.io &>/dev/null ; do
    echo "Waiting for MinIO CRDs to be created by operator..."
    sleep 1
done

docker build --target development -t localhost:5000/papergirl:latest .
docker push localhost:5000/papergirl:latest

if ! helm status papergirl -n papergirl &>/dev/null ; then
    kubectl create ns papergirl
    helm install papergirl -n papergirl -f quickstart-values.yaml ./helm
else
    helm upgrade papergirl -n papergirl -f quickstart-values.yaml ./helm
    kubectl rollout restart sts/papergirl
    kubectl rollout restart sts/papergirl-preview
fi

kubectl config set-context --current --namespace=papergirl &>/dev/null