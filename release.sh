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
npm publish
git add .
git commit -m "chore: Bump version to ${version}."
git tag ${version}
git push origin $version
git pull --rebase
git push