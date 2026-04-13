#!/usr/bin/env bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY-$( (jq '.name' package.json 2>/dev/null || basename $(pwd)) | sed 's/[^a-z\/]//g')}

# Parse arguments - keep backward compatibility
# $1 = build directory (default: current directory)
# $2 = fallback file (default: index.html)
FALLBACK_FILE=${2-"index.html"}

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

# Strip trailing slash
_BASE="${NGINX_BASE_PATH%/}"

DOCKER_IMAGE="${DOCKER_REGISTRY}/${IMAGE_REPOSITORY}:${IMAGE_TAG}"

if [[ -n $_BASE ]]; then
    # Subdirectory mode: write a custom nginx config for the given base path
    docker build -t $DOCKER_IMAGE --rm --compress -f- ${1-$(pwd)} <<EOF
FROM docker.io/bobra/nginx:1.29.1
COPY . /static/
RUN sed -i 's/php.conf/static.conf/' /etc/nginx/nginx.conf && \
    printf 'server {\n  listen 80;\n  root /static;\n\n  location = ${_BASE} { return 301 ${_BASE}/; }\n\n  location ${_BASE}/ {\n    try_files \$uri \$uri/ ${_BASE}/${FALLBACK_FILE};\n  }\n}\n' > /etc/nginx/static.conf
EOF
else
    # Root-serve mode (default)
    docker build -t $DOCKER_IMAGE --rm --compress -f- ${1-$(pwd)} <<EOF
FROM docker.io/bobra/nginx:1.29.1
COPY . /static/
RUN sed -i 's/php.conf/static.conf/' /etc/nginx/nginx.conf && \
    sed -i "s|/index.html|/${FALLBACK_FILE}|g" /etc/nginx/static.conf
EOF
fi

docker push $DOCKER_IMAGE
printf '[{"name":"nginx","imageUri":"%s"}]' $DOCKER_IMAGE > imagedefinitions.json
