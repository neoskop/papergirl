#!/bin/bash
set -e

if ! kind get clusters | grep -o papergirl &>/dev/null ; then
    kind create cluster --name papergirl
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

if ! helm status papergirl -n papergirl &>/dev/null ; then
    kubectl create ns papergirl
    helm install papergirl -n papergirl -f quickstart-values.yaml ./helm
else
    helm upgrade papergirl -n papergirl -f quickstart-values.yaml ./helm
fi

kubectl config set-context --current --namespace=papergirl &>/dev/null