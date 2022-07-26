#!/bin/bash
set -e
kind delete cluster --name=papergirl
reg_name=kind-registry-papergirl
if ! docker ps -q -f name=$reg_name; then
    docker stop $reg_name
    docker rm $reg_name
fi