#!/usr/bin/env node --no-warnings --experimental-modules --es-module-specifier-resolution=node

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import {promisify} from "util";

const readFile = promisify(fs.readFile);

const sendNotification = async () => {

    const getVariables = async () => {
        const variables = await readFile(path.resolve("./env.json"), "utf8");
        return JSON.parse(variables);
    }

    const isResponse = (response) => ("ok" in response)
        && (("result" in response)
            || ("description" in response));

    async function sendRequest(url) {
        const body = await new Promise((resolve, reject) => {
            const req = https.request(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            });
            req.on('error', reject);
            req.end();
        });
        const response = JSON.parse(body);
        if (!isResponse(response)) {
            throw new Error(`Invalid Response: ${body}`);
        }
        return response;
    }

    async function sendMessage(message) {
        const url = new URL(`/bot${encodeURIComponent(process.env.BOT_API_KEY)}/sendMessage`, 'https://api.telegram.org/');
        url.searchParams.append('chat_id', process.env.CHAT_ID);
        url.searchParams.append('text', message.toString());
        url.searchParams.append("parse_mode", 'Markdown');
        const response = await sendRequest(url);
        if (!response.ok) {
            throw new Error(`Telegram Error #${response.error_code}: ${response.description}`);
        }
        return response.result;
    }

    function getMessage(variables) {
        const [project, buildId] = variables.CODEBUILD_PROJECT.split(":", 2);
        const icon = variables.CODEBUILD_BUILD_SUCCEEDING ? `✅` : "🛑";

        let message = `${icon}\t**Project ${project}** `;
        const isPullRequest = /^pr\/\d+$/.test(variables.CODEBUILD_SOURCE_VERSION);
        const pullRequest = variables.CODEBUILD_SOURCE_VERSION.split('/')[1];
        if (isPullRequest) {
            const action = variables.CODEBUILD_WEBHOOK_EVENT.match(/^PULL_REQUEST_(\w+)$/)[1];
            message += ` Pull Request #${pullRequest} ${action}`;
        } else {
            const environment = variables.NODE_ENV || "production";
            message += `${environment} ${variables.CODEBUILD_WEBHOOK_EVENT}`;
        }
        const author = variables.CODEBUILD_GIT_AUTHOR;
        const email = variables.CODEBUILD_GIT_AUTHOR_EMAIL;
        const branch = variables.CODEBUILD_GIT_BRANCH;
        const text = variables.CODEBUILD_GIT_MESSAGE;
        const commit = variables.CODEBUILD_GIT_SHORT_COMMIT;
        message += `\n✉️\t${author} <${email}>: ` + '```'+ text+'```';

        const repo = variables.CODEBUILD_SOURCE_REPO_URL.replace(/\.git$/, "");
        message += `\nGitHub `;
        if (isPullRequest) {
            const link = `${repo}/pull/${pullRequest}`;
            message +=` [Pull Request #${pullRequest}](${link}) \`${branch}/${commit}\``;
        } else {
            const link = `${repo}/commit/${variables.CODEBUILD_GIT_COMMIT}`;
            message += ` [Push ${branch}/${commit}](${link})`;
        }

        const buildNumber = variables.CODEBUILD_BUILD_NUMBER;
        const buildUrl = variables.CODEBUILD_BUILD_URL;
        message += `\nAWS [CodeBuild #${buildNumber}](${buildUrl}) ${buildId}`;

        return message;
    }

    const variables = await getVariables();
    const message = getMessage(variables);
    await sendMessage(message);
}

sendNotification()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(-1);
    });
