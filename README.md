# Release Utils

### Installation

This scripts are available as a bin command when the package is installed:

```bash
npm install -g @horat1us/release-utils
```

## Docker Build Script

The `docker/build.sh` script builds and pushes a Docker image using the project's own Dockerfile.

### Usage

```bash
# When installed globally via npm
docker-build [directory] [dockerfile]

# When running directly
./docker/build.sh [directory] [dockerfile]
```

### Arguments

1. **directory** (optional) - Build context directory (default: current directory)
2. **dockerfile** (optional) - Path to the Dockerfile (default: `Dockerfile` inside the build context directory)

### Examples

```bash
# Build from current directory using ./Dockerfile
docker-build

# Build from a subdirectory
docker-build ./app

# Build with a custom Dockerfile path
docker-build ./app ./app/Dockerfile.prod
```

### Environment Variables

- `IMAGE_REPOSITORY` - Docker image repository name (default: from package.json name or current directory name)
- `IMAGE_TAG` - Docker image tag (default: from package.json version or CODEBUILD_BUILD_NUMBER)
- `CONTAINER_NAME` - Container name used in `imagedefinitions.json` (default: `app`)
- `DOCKER_BUILD_ARGS` - Space-separated list of environment variable names to forward as Docker build args (e.g. `"NODE_ENV API_URL"`)
- `CODEBUILD_BUILD_ID` - When set, uses AWS ECR registry and authentication
- `AWS_DEFAULT_REGION` - AWS region for ECR (default: eu-central-1)

### Features

- Uses the project's own `Dockerfile` (no base image assumptions)
- Automatically detects AWS CodeBuild environment and uses ECR
- Pushes to Docker Hub when running outside CodeBuild
- Generates `imagedefinitions.json` for AWS CodeDeploy

## Docker Nginx Build Script

The `docker/nginx/build.sh` script builds and pushes a Docker image for serving static files using nginx.

### Installation

This script is available as a bin command when the package is installed:

```bash
npm install -g @horat1us/release-utils
```

### Usage

```bash
# When installed globally via npm
docker-build-nginx [directory] [fallback_file]

# When running directly
./docker/nginx/build.sh [directory] [fallback_file]
```

### Arguments

1. **directory** (optional) - Directory containing files to copy to the image (default: current directory)
2. **fallback_file** (optional) - Fallback file for client-side routing in nginx config (default: `index.html`)

### Examples

```bash
# Build from current directory with default index.html fallback
docker-build-nginx

# Build from dist directory with default index.html fallback
docker-build-nginx ./dist

# Build from dist directory with custom fallback file
docker-build-nginx ./dist app.html
```

### Environment Variables

- `IMAGE_REPOSITORY` - Docker image repository name (default: from package.json name or current directory name)
- `IMAGE_TAG` - Docker image tag (default: from package.json version or CODEBUILD_BUILD_NUMBER)
- `CODEBUILD_BUILD_ID` - When set, uses AWS ECR registry and authentication
- `AWS_DEFAULT_REGION` - AWS region for ECR (default: eu-central-1)

### Features

- Uses `docker.io/bobra/nginx:1.29.1` as base image
- Copies specified directory contents to `/static/` in the container
- Configures nginx to use `static.conf` with customizable fallback file for SPAs
- Automatically detects AWS CodeBuild environment and uses ECR
- Generates `imagedefinitions.json` for AWS CodeDeploy

## Telegram-notify
Поддерживает отправку сообщений 2 вариантами:

1. Когда в текущей папке есть файл env.json и в нем лежат все переменные, полученные путем выполнения файла https://gist.githubusercontent.com/Horat1us/8ffc5814b0f3c5fbf95370ac8b778455/raw/1b234ab19ca514caa8e098736493b3795781203e/codebuild-git-env.sh
на стадии билда проекта на AWS Codebuild. А также существуют переменные REPO_OWNER (владелец репозитория) и
GITHUB_AUTH_TOKEN (токен авторизации к github).
2. При наличии переменных окружения таких как: GIT_COMMIT_MESSAGE, GIT_COMMIT_AUTHOR, GIT_COMMIT_URL, GITHUB_REPOSITORY
(например: "facebook/react"), FAILURE (0 | 1).

Также в обоих случаях нужны переменные окружения BOT_API_KEY (ключ телеграм бота), CHAT_ID.

Опционально: `RELEASE_TYPE` (android|ios|web|backend|internal|telegram) — тип релиза, добавляет эмодзи-метку к сообщению. Можно передать аргументом `--release-type=<type>` (аргумент имеет приоритет над переменной окружения).

### Examples
    
#### AWS CodeBuild
```bash
curl -O https://gist.githubusercontent.com/Horat1us/8ffc5814b0f3c5fbf95370ac8b778455/raw/1b234ab19ca514caa8e098736493b3795781203e/codebuild-git-env.sh
chmod +x ./codebuild-git-env.sh
./codebuild-git-env.sh > ./env.json
if [[ "$CODEBUILD_BUILD_SUCCEEDING" == "0" ]]; then
  npm i -g @horat1us/release-utils@3.9.4;
  telegram-notify-deploy;
fi;
```
#### GitHub Actions
```yml
name: Set commit variables
if: ${{ always() }}
run: |
  echo "GIT_COMMIT_MESSAGE=$(git log --format=%B -n 1 ${{ github.event.after }})" >> $GITHUB_ENV
  echo "GIT_COMMIT_AUTHOR=$(git log --format=%an -n 1 ${{ github.event.after }})" >> $GITHUB_ENV
  echo "GIT_COMMIT_URL=https://github.com/${GITHUB_REPOSITORY}/commit/${{ github.event.after }}" >> $GITHUB_ENV
name: Send deploy notification
if: ${{ always() }}
env:
  FAILURE: ${{ env.FAILURE }}
  GIT_COMMIT_MESSAGE: ${{ env.GIT_COMMIT_MESSAGE }}
  GIT_COMMIT_AUTHOR: ${{ env.GIT_COMMIT_AUTHOR }}
  GIT_COMMIT_URL: ${{ env.GIT_COMMIT_URL }}
  RELEASE_TYPE: web
run: |
  npm i -g @horat1us/release-utils@3.9.1
  telegram-notify-deploy
```
