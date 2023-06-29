#!/usr/bin/env bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY-$( (jq '.name' package.json 2>/dev/null || basename $(pwd)) | sed 's/[^a-z\/]//g')}


if [[ -n $CODEBUILD_BUILD_ID ]]; then
    set -e;

    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
    DOCKER_REGISTRY=$AWS_ACCOUNT_ID.dkr.ecr.${AWS_DEFAULT_REGION-"eu-central-1"}.amazonaws.com
    echo Registry: $DOCKER_REGISTRY

    aws ecr get-login-password \
        --region ${AWS_DEFAULT_REGION-"eu-central-1"} \
    | docker login \
        --username AWS \
        --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.${AWS_DEFAULT_REGION-"eu-central-1"}.amazonaws.com

    IMAGE_TAG=${IMAGE_TAG-${CODEBUILD_BUILD_NUMBER-latest}}
else
    DOCKER_REGISTRY=docker.io
    IMAGE_TAG=${IMAGE_TAG-$(jq -r '.version' ./package.json 2>/dev/null)}
fi;

set -ex;

DOCKER_IMAGE="${DOCKER_REGISTRY}/${IMAGE_REPOSITORY}:${IMAGE_TAG}"
docker build -t $DOCKER_IMAGE --rm --compress -f- ${1-$(pwd)} <<EOF
FROM docker.io/bobra/nginx:1.17-5
COPY . /static/
RUN sed -i 's/php.conf/static.conf/' /etc/nginx/nginx.conf
EOF
docker push $DOCKER_IMAGE
printf '[{"name":"nginx","imageUri":"%s"}]' $DOCKER_IMAGE > imagedefinitions.json
