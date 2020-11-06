#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import {promisify} from "util";

const readFile = promisify(fs.readFile);

const sendNotification = async () => {

    const getVariables = async () => {
        const variables = await readFile(path.resolve("./env.json"), "utf8");
        return JSON.parse(variables);
    }

    function validateResponse(response) {
        if (response.data.ok) {
            return Promise.resolve(response.data.result);
        }
        console.error(`Telegram Request to "${response.config.url}" failed: ${response.data.description}`);
        return Promise.reject(new Error(response.data.description));
    }

    async function sendMessage(message) {
        const url = new URL(`/bot${encodeURIComponent(process.env.BOT_API_KEY)}/sendMessage`, 'https://api.telegram.org/');
        url.searchParams.append('chat_id', process.env.CHAT_ID);
        url.searchParams.append("parse_mode", 'Markdown');
        url.searchParams.append('text', message);

        return await axios.post(url.toString())
            .then(response => validateResponse(response));
    }

    /**
     * @param {string} authToken
     * @param {string} commitSha
     * @param {string} repoOwner
     * @param {string} repoName
     */
    const getCommitInfo = async (authToken, commitSha, repoOwner, repoName) => {
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/commits/${commitSha}`;

        const auth = Buffer.from(authToken, "utf-8");

        const config = {
            headers: {
                "Authorization": "Basic " + auth.toString("base64"),
            }
        };

        return await axios.get(url, config)
            .then(response => response.data);
    }

    /**
     * @param {Object<string, string>} variables
     */
    async function getMessage(variables) {
        const project = (variables.CODEBUILD_PROJECT || "").split(":")[0];
        const icon = variables.CODEBUILD_BUILD_SUCCEEDING ? `✅` : "🛑";

        let message = `${icon}\t**Project ${project}** `;

        const commitId = variables.CODEBUILD_RESOLVED_SOURCE_VERSION;
        const githubToken = process.env.GITHUB_AUTH_TOKEN;
        const repoOwner = process.env.REPO_OWNER;
        const repoName = process.env.REPO_NAME;

        if (commitId && githubToken && repoOwner && repoName) {
            const response = await getCommitInfo(githubToken, commitId, repoOwner, repoName);

            const author = response?.author?.login;
            const url = response?.html_url;
            const commitMessage = response.commit.message;

            message += `\n[Commit](${url}). Author: ${author}.\nMessage: "${commitMessage}"`;
        }

        const buildNumber = variables.CODEBUILD_BUILD_NUMBER;
        const buildUrl = variables.CODEBUILD_BUILD_URL;
        message += `\nAWS [CodeBuild #${buildNumber}](${buildUrl})`;

        return message;
    }

    const variables = await getVariables();
    const message = await getMessage(variables);
    await sendMessage(message);
}

sendNotification()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(-1);
    });
