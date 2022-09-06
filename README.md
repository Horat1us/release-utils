# Release Utils

## Telegram-notify
Поддерживает отправку сообщений 2 вариантами:

1. Когда в текущей папке есть файл env.json и в нем лежат все переменные, полученные путем выполнения файла https://gist.githubusercontent.com/Horat1us/8ffc5814b0f3c5fbf95370ac8b778455/raw/1b234ab19ca514caa8e098736493b3795781203e/codebuild-git-env.sh
на стадии билда проекта на AWS Codebuild. А также существуют переменные REPO_OWNER (владелец репозитория) и
GITHUB_AUTH_TOKEN (токен авторизации к github).
2. При наличии переменных окружения таких как: GIT_COMMIT_MESSAGE, GIT_COMMIT_AUTHOR, GIT_COMMIT_URL, GITHUB_REPOSITORY
(например: "facebook/react"), FAILURE (0 | 1).

Также в обоих случаях нужны переменные окружения BOT_API_KEY (ключ телеграм бота), CHAT_ID.


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
run: |
  npm i -g @horat1us/release-utils@3.9.1
  telegram-notify-deploy
```
