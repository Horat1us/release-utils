#!/bin/bash

# Expected variables
# ECS_TASK_FAMILY, ECS_CLUSTER, ECS_SERVICE_NAME
# https://github.com/aws/aws-sdk/issues/406#issuecomment-1314183221

set -ex;

NEW_IMAGE=$(jq -r '.[0].imageUri' ./imagedefinitions.json 2>/dev/null)

TASK_DEFINITION=$(aws ecs describe-task-definition --task-definition "$ECS_TASK_FAMILY" --region $AWS_DEFAULT_REGION || echo exit $?)
NEW_TASK_DEFINITION=$(echo $TASK_DEFINITION | jq --arg IMAGE "$NEW_IMAGE" '.taskDefinition | .containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn) | del(.revision) | del(.status) | del(.requiresAttributes) | del(.compatibilities) | del(.registeredAt) | del(.registeredBy)')

NEW_TASK_INFO=$(aws ecs register-task-definition --region "$AWS_DEFAULT_REGION" --cli-input-json "$NEW_TASK_DEFINITION" || echo exit $?)
NEW_REVISION=$(echo $NEW_TASK_INFO | jq '.taskDefinition.revision')

aws ecs update-service --cluster ${ECS_CLUSTER} \
                       --service ${ECS_SERVICE_NAME} \
                       --task-definition ${ECS_TASK_FAMILY}:${NEW_REVISION}
