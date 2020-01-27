#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const releaseTypes = ['major', 'minor', 'patch'];
const releaseArg = process.argv[2];
const versionPart = releaseTypes.findIndex((t) => t === releaseArg);
if (versionPart === -1) {
    console.error(`Invalid Release Type: ` + releaseTypes.join(', '));
    process.exit(-1);
}

let file = path.join(process.cwd(), 'meta.json');
if (!fs.existsSync(file)) {
    file = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync('./package.json')) {
        console.error(`No 'meta.json' or 'package.json' file found!`);
        process.exit(-2)
    }
}

const meta = JSON.parse(fs.readFileSync(file));
if (
    ('object' !== typeof meta) || !('version' in meta)
    || !('string' === typeof meta.version) || !meta.version.match(/^(?:\d+\.){2}\d+$/)
) {
    console.error(`No version found in '${file}'`);
    process.exit(-3);
}

const parts = meta.version
    .split('.')
    .map((part) => parseInt(part, 10));
parts[versionPart]++;
meta.version = parts.join('.');

fs.writeFileSync(file, JSON.stringify(meta, undefined, 2));

[`git tag ${meta.version}`, `git commit -m 'Meta ${releaseArg}' '${file}'`]
    .forEach((command) => exec(command, (error) => {
        if (error) {
            console.error(error.toString());
            process.exit(-4);
        }
    }));


