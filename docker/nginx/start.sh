#!/usr/bin/env bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY-$( (jq '.name' package.json 2>/dev/null || basename $(pwd)) | sed 's/[^a-z\/]//g')}

IMAGE_TAG=${IMAGE_TAG-$(jq -r '.version' ./package.json 2>/dev/null || echo 'test')}

set -ex;

DOCKER_IMAGE="${IMAGE_REPOSITORY//[^a-zA-Z0-9_.]/-}:${IMAGE_TAG}"

docker build -t $DOCKER_IMAGE --rm --compress -f- ${1-$(pwd)} <<EOF
FROM docker.io/bobra/nginx:1.17-5
COPY . /static/
RUN sed -i 's/php.conf/static.conf/' /etc/nginx/nginx.conf
EOF

docker run -d -p 6543:80 --name $IMAGE_REPOSITORY $DOCKER_IMAGE
