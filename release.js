#!/usr/bin/env node --no-warnings --experimental-modules --es-module-specifier-resolution=node
import * as file from "./utils/file";
import * as git from "./utils/git";
import * as version from "./utils/version";

const releaseTypes = ['major', 'minor', 'patch'];
const releaseArg = process.argv[2];

const section = releaseTypes.findIndex((t) => t === releaseArg);
if (section === -1) {
    console.error(`Invalid Release Type: ` + releaseTypes.join(', '));
    process.exit(-1);
}

let replacer = version.update.bind(undefined, section);
let newVersion = file.update(replacer);
if (newVersion === false) {
    try {
        newVersion = git.read();
    } catch (error) {
        if (error.status) {
            console.error(error.toString());
            process.exit(-2);
        }
        throw error;
    }

    if (newVersion === false) {
        console.error(`No file or git tag to update!`);
        process.exit(-3);
    }

    newVersion = replacer(newVersion);
} else {
    git.commit(newVersion);
}
git.tag(newVersion);
