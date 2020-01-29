#!/usr/bin/env bash

if [[ -n $CODEBUILD_BUILD_ID ]]; then
    set -e;

    DOCKER_LOGIN=$(aws ecr get-login --no-include-email --region ${AWS_DEFAULT_REGION-"eu-central-1"} 2>/dev/null);
    $DOCKER_LOGIN 2>/dev/null;
    DOCKER_REGISTRY=$(echo $DOCKER_LOGIN | sed -e 's/.*https:\/\///');
fi;

set -ex;
DOCKER_IMAGE="${DOCKER_REGISTRY}/${IMAGE_REPOSITORY}:${IMAGE_TAG-${CODEBUILD_BUILD_ID}}"
echo -e "FROM flashspys/nginx-static@085c648c774d \n COPY . ." | docker build -t $DOCKER_IMAGE --rm --compress $1
docker push $DOCKER_IMAGE
printf '[{"name":"nginx","imageUri":"%s"}]' $DOCKER_IMAGE > imagedefinitions.json
