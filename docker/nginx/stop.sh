#!/usr/bin/env bash

set -ex;

IMAGE_REPOSITORY=${IMAGE_REPOSITORY-$( (jq '.name' package.json 2>/dev/null || basename $(pwd)) | sed 's/[^a-z\/]//g')}
IMAGE_REPOSITORY=${IMAGE_REPOSITORY//[^a-zA-Z0-9_.]/}

docker rm -f $IMAGE_REPOSITORY
