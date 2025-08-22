#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import axios from "axios";

const parseArguments = () => {
    const args = process.argv.slice(2);
    const parsed = {};
    
    for (const arg of args) {
        if (arg.startsWith('--release-type=')) {
            parsed.releaseType = arg.split('=')[1];
        }
    }
    
    return parsed;
};

const validateReleaseType = (releaseType) => {
    const validTypes = ['android', 'ios', 'web', 'backend', 'internal'];
    return validTypes.includes(releaseType);
};

const getReleaseTypeEmoji = (releaseType) => {
    const emojiMap = {
        'android': '🤖 [Mobile Android]',
        'ios': '🍎 [Mobile iOS]',
        'web': '🌐 [Web]',
        'backend': '⚙️ [Backend]',
        'internal': '🔧 [Internal]'
    };
    return emojiMap[releaseType] || '';
};

const sendNotification = async () => {
    const args = parseArguments();
    let releaseType = args.releaseType;
    
    if (!releaseType) {
        console.warn('Warning: --release-type argument is available. Usage: --release-type=android|ios|web|backend|internal');
    } else if (!validateReleaseType(releaseType)) {
        throw new Error(`Error: Invalid release type "${releaseType}". Valid types: android, ios, web, backend, internal`);
    }

    const getVariables = async () => {
        const environment = await fs.promises.readFile(path.resolve("./env.json"), "utf8");

        const variables = JSON.parse(environment);

        try {
            await fs.promises.access(path.resolve("./meta.json"), fs.constants.F_OK)

            const meta = await fs.promises.readFile(path.resolve("./meta.json"), "utf8");

            variables.META_VERSION = JSON.parse(meta).version;
        } catch (err) {}

        return variables;
    }

    function validateResponse(response) {
        if (response.data.ok) {
            return Promise.resolve(response.data.result);
        }
        console.error(`Telegram Request to "${response.config.url}" failed: ${response.data.description}`);
        return Promise.reject(new Error(response.data.description));
    }

    async function sendMessage(message) {
        const apiKey = process.env.BOT_API_KEY || "";
        const url = `https://api.telegram.org/bot${apiKey.trim()}/sendMessage`;

        return await axios.post(url.toString(), {
            "chat_id": process.env.CHAT_ID,
            "parse_mode": "Markdown",
            "text": message,
        })
            .then(response => validateResponse(response));
    }

    /**
     * @param {string} authToken
     * @param {string} commitSha
     * @param {string} repoOwner
     * @param {string} repoName
     */
    const getCommitInfo = (authToken, commitSha, repoOwner, repoName) => {
        const url = "https://api.github.com/repos/" + encodeURIComponent(repoOwner) + "/" + encodeURIComponent(repoName)
            +"/git/commits/" + encodeURIComponent(commitSha);

        const auth = Buffer.from(authToken, "utf-8");

        const config = {
            headers: {
                "Authorization": "Basic " + auth.toString("base64"),
            }
        };

        return axios.get(url, config)
            .then(response => response.data);
    }

    /**
     * @param {"aws" | "github"} source
     * @param {Object<string, string>} [variables]
     * @param {string} [releaseType]
     */
    async function getMessage(source, variables, releaseType) {
        let project,
            isSucceed,
            commitId,
            githubToken,
            repoOwner,
            repoName,
            url,
            author,
            commitMessage,
            buildNumber,
            buildUrl;

        switch (source) {
            case "aws":
                isSucceed = variables.CODEBUILD_BUILD_SUCCEEDING === "1";
                project = (variables.CODEBUILD_PROJECT || "").split(":")[0];

                commitId = variables.CODEBUILD_RESOLVED_SOURCE_VERSION;
                githubToken = process.env.GITHUB_AUTH_TOKEN;
                repoOwner = process.env.REPO_OWNER;
                repoName = process.env.REPO_NAME;
                if (commitId && githubToken && repoOwner && repoName) {
                    const response = await getCommitInfo(githubToken, commitId, repoOwner, repoName);

                    url = response.html_url;
                    author = response.author.name;
                    commitMessage = response.message;
                } else if (variables.CODEBUILD_GIT_MESSAGE && variables.CODEBUILD_GIT_AUTHOR) {
                    commitMessage = variables.CODEBUILD_GIT_MESSAGE;
                    author = variables.CODEBUILD_GIT_AUTHOR;
                }

                buildNumber = variables.CODEBUILD_BUILD_NUMBER;
                buildUrl = variables.CODEBUILD_BUILD_URL;
                break;

            case "github":
                isSucceed = !Number(process.env.FAILURE);
                project = process.env.GITHUB_REPOSITORY;
                url = process.env.GIT_COMMIT_URL;
                author = process.env.GIT_COMMIT_AUTHOR;
                commitMessage = process.env.GIT_COMMIT_MESSAGE;
                break;
        }

        const releaseTypeEmoji = releaseType ? getReleaseTypeEmoji(releaseType) : '';
        let message = `${isSucceed ? "✅" : "🛑"}\t**Project ${project}**. ${releaseTypeEmoji}`;

        if (variables && variables.META_VERSION) {
            message += `\nVersion: ${variables.META_VERSION}.`;
        }

        if (author && commitMessage) {
            author = author.replace(/([-\\`*_{}[\]+!|])/g, "\\$1");
            commitMessage = commitMessage.replace(/([\\`*_{}[\]+!|])/g, "\\$1");
            message += "\n[Commit]";
            if (url) {
                message += `(${url})`;
            }
            message += `. Author: ${author}.\nMessage: "${commitMessage}".`;
        }

        if (buildNumber && buildUrl) {
            message += `\nAWS [CodeBuild #${buildNumber}](${buildUrl}).`;
        }

        return message;
    }

    if (process.env.GIT_COMMIT_MESSAGE
        && process.env.GIT_COMMIT_AUTHOR
        && process.env.GIT_COMMIT_URL
        && process.env.GITHUB_REPOSITORY) {

        const message = await getMessage("github", undefined, releaseType);
        return await sendMessage(message);
    }

    const variables = await getVariables();
    const message = await getMessage("aws", variables, releaseType);
    await sendMessage(message);
}

sendNotification()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(-1);
    });
