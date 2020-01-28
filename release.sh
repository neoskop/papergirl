#!/usr/bin/env bash

set -e

function check_commands() {
  for command in $@ ; do
    if ! command -v $command >/dev/null; then
      echo -e "Install \033[1m$command\033[0m"
      exit 1
    fi
  done
}

check_commands git yarn npm jq yq

if [[ "$#" != "1" ]] || [[ ! "$1" =~ ^(patch|minor|major)$ ]]; then
  echo -e "Usage: $0 \033[1mpatch|minor|major\033[0m"
  exit 1
fi

if [[ `git status --porcelain` ]]; then
  echo -e "The repository has changes. Commit first...\033[0;31mAborting!\033[0m"
  exit 1
fi

git pull --rebase
yarn
yarn build
npm version --no-git-tag-version $1
version=`cat package.json | jq -r .version`
sed -i "s/appVersion: .*/appVersion: \"$version\"/" helm/Chart.yaml
sed -i "s/version: .*/version: $version/" helm/Chart.yaml
yq w -i helm/Chart.yaml version $version
yq w -i helm/Chart.yaml appVersion $version
yq w helm/values.yaml papergirl.image.tag $version
git add .
git commit -m "chore: Bump version to ${version}."
git push

docker build -t neoskop/papergirl:$version .
docker push neoskop/papergirl:$version

helm package helm --destination .deploy
cr upload -o neoskop -r papergirl -p .deploy
git checkout gh-pages
cr index -i ./index.yaml -p .deploy -o neoskop -r papergirl -c https://neoskop.github.io/papergirl/
git add index.yaml
git commit -m "chore: Bump version to ${version}."
git push
git checkout master