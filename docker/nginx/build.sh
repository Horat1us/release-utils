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
    # Subdirectory mode: write location directives for the given base path.
    # Notes:
    #   - static.conf is include-d inside the existing server{} block in nginx.conf,
    #     so it must NOT contain a server{} wrapper.
    #   - bobra/nginx is compiled --without-http_rewrite_module, so `return` is
    #     unavailable. alias /static/ is used instead of root to strip the base
    #     prefix when resolving file paths.
    docker build -t $DOCKER_IMAGE --rm --compress -f- ${1-$(pwd)} <<EOF
FROM docker.io/bobra/nginx:1.29.1
COPY . /static/
RUN sed -i 's/php.conf/static.conf/' /etc/nginx/nginx.conf && \
    printf 'include /etc/nginx/mime.types;\ndefault_type application/octet-stream;\n\nlocation = ${_BASE} {\n  root /static;\n  try_files /${FALLBACK_FILE} =404;\n}\n\nlocation ~* ^${_BASE}/.+\.(map|log)$ {\n  deny all;\n}\n\nlocation ~* ^${_BASE}/(.+\.(jpg|jpeg|gif|png|webp|avif|ico|svg|css|js|woff|woff2|ttf|eot))$ {\n  alias /static/\$1;\n  access_log off;\n  expires 1y;\n  add_header Cache-Control "public, immutable";\n  add_header Vary "Accept-Encoding";\n  gzip_static on;\n  brotli_static on;\n}\n\nlocation ${_BASE}/ {\n  alias /static/;\n  try_files \$uri ${_BASE}/${FALLBACK_FILE};\n}\n\nclient_max_body_size 1m;\n' > /etc/nginx/static.conf
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
