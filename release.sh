#!/usr/bin/env bash

set -e

function check_command() {
  if ! command -v $1 >/dev/null; then
    echo -e "Install \033[1m$1\033[0m"
    exit 1
  fi
}

check_command git
check_command yarn
check_command npm
check_command jq

if [[ "$#" != "1" ]] || [[ ! "$1" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: $0 patch|minor|major"
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
git add .
git commit -m "chore: Bump version to ${version}."
git tag ${version}
git push origin $version
git pull --rebase
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