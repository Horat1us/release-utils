#!/usr/bin/env bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY-$( (jq '.name' package.json 2>/dev/null || basename $(pwd)) | sed 's/[^a-z\/]//g')}


if [[ -n $CODEBUILD_BUILD_ID ]]; then
    set -e;

    DOCKER_LOGIN=$(aws ecr get-login --no-include-email --region ${AWS_DEFAULT_REGION-"eu-central-1"} 2>/dev/null);
    $DOCKER_LOGIN 2>/dev/null;
    DOCKER_REGISTRY=$(echo $DOCKER_LOGIN | sed -e 's/.*https:\/\///');
    IMAGE_TAG=${IMAGE_TAG-${CODEBUILD_BUILD_ID-latest}}
else
    DOCKER_REGISTRY=docker.io
    IMAGE_TAG=${IMAGE_TAG-$(jq -r '.version' ./package.json 2>/dev/null)}
fi;

set -ex;

DOCKER_IMAGE="${DOCKER_REGISTRY}/${IMAGE_REPOSITORY}:${IMAGE_TAG}"
docker build -t $DOCKER_IMAGE --rm --compress -f- ${1-$(pwd)} <<EOF
FROM flashspys/nginx-static:latest
COPY . /static
RUN sed -i 's/gzip/server_tokens off\; gzip/g' /etc/nginx/nginx.conf && \
    sed -i "s/index/try_files\ \\\$uri\ \\\$uri\\/\ \\/index.html\;index\ /" /etc/nginx/conf.d/default.conf
EOF
docker push $DOCKER_IMAGE
printf '[{"name":"nginx","imageUri":"%s"}]' $DOCKER_IMAGE > imagedefinitions.json
