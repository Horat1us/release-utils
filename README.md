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
- `NGINX_BASE_PATH` - Serve the SPA from a subdirectory instead of `/` (e.g. `/app`). Trailing slash is stripped automatically.

### Base Path (subdirectory hosting)

When `NGINX_BASE_PATH` is set, the generated nginx config serves the SPA from that path instead of the root:

- `GET /app` → `301 /app/`
- `GET /app/<any>` → tries the file, then falls back to `/app/<fallback_file>` (SPA client-side routing)

```bash
# Serve from /app/
NGINX_BASE_PATH=/app docker-build-nginx ./dist

# Serve from /app/ with a custom fallback file
NGINX_BASE_PATH=/app docker-build-nginx ./dist app.html
```

When `NGINX_BASE_PATH` is unset or empty, the script falls back to the original root-serve behaviour.

### Features

- Uses `docker.io/bobra/nginx:1.29.1` as base image
- Copies specified directory contents to `/static/` in the container
- Configures nginx to use `static.conf` with customizable fallback file for SPAs
- Supports subdirectory hosting via `NGINX_BASE_PATH` for SPAs deployed under a path prefix
- Automatically detects AWS CodeBuild environment and uses ECR
- Generates `imagedefinitions.json` for AWS CodeDeploy

## CodeBuild Export Git Env

The `aws/codebuild/export-git-env.sh` script resolves Git context variables that AWS CodeBuild does not expose natively (branch name, commit message, author, tag, etc.) and prints all environment variables as a JSON object to stdout.

### Usage

```bash
# When installed globally via npm
codebuild-export-git-env > env.json

# When running directly
./aws/codebuild/export-git-env.sh > env.json
```

### Exported Variables

| Variable | Description |
|---|---|
| `CI` | Always `true` |
| `CODEBUILD` | Always `true` |
| `CODEBUILD_ACCOUNT_ID` | AWS account ID from `aws sts get-caller-identity` |
| `CODEBUILD_GIT_BRANCH` | Current branch name; falls back to remote tracking branch on detached HEAD |
| `CODEBUILD_GIT_MESSAGE` | Last commit message |
| `CODEBUILD_GIT_AUTHOR` | Last commit author name |
| `CODEBUILD_GIT_AUTHOR_EMAIL` | Last commit author email |
| `CODEBUILD_GIT_COMMIT` | Full commit SHA |
| `CODEBUILD_GIT_SHORT_COMMIT` | Short commit SHA |
| `CODEBUILD_GIT_TAG` | Exact tag on current commit (empty if none) |
| `CODEBUILD_PULL_REQUEST` | PR number if branch matches `pr-<number>`, otherwise `false` |
| `CODEBUILD_PROJECT` | Project name derived from `CODEBUILD_BUILD_ID` |
| `CODEBUILD_BUILD_URL` | Direct link to this build in the AWS Console |

### Example (buildspec.yml)

```yaml
phases:
  build:
    commands:
      - codebuild-export-git-env > env.json
```

## Telegram-notify
Поддерживает отправку сообщений 2 вариантами:

1. Когда в текущей папке есть файл env.json и в нем лежат все переменные, полученные путем выполнения команды `codebuild-export-git-env`
на стадии билда проекта на AWS Codebuild. А также существуют переменные REPO_OWNER (владелец репозитория) и
GITHUB_AUTH_TOKEN (токен авторизации к github).
2. При наличии переменных окружения таких как: GIT_COMMIT_MESSAGE, GIT_COMMIT_AUTHOR, GIT_COMMIT_URL, GITHUB_REPOSITORY
(например: "facebook/react"), FAILURE (0 | 1).

Также в обоих случаях нужны переменные окружения BOT_API_KEY (ключ телеграм бота), CHAT_ID.

Опционально: `RELEASE_TYPE` (android|ios|web|backend|internal|telegram) — тип релиза, добавляет эмодзи-метку к сообщению. Приоритет: значение из `env.json` → аргумент `--release-type=<type>` → переменная окружения `RELEASE_TYPE`.

Опционально: `RELEASE_ENVIRONMENT` (dev|test|staging|production) — среда развёртывания, добавляет отдельную строку `Environment: <emoji> <label>.` перед версией. Приоритет: значение из `env.json` → аргумент `--environment=<env>` → переменная окружения `RELEASE_ENVIRONMENT`.

### Examples
    
#### AWS CodeBuild
```bash
codebuild-export-git-env > ./env.json
if [[ "$CODEBUILD_BUILD_SUCCEEDING" == "0" ]]; then
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
  RELEASE_ENVIRONMENT: production
run: |
  npm i -g @horat1us/release-utils@3.9.1
  telegram-notify-deploy
```
