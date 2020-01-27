import { execSync } from "child_process";
import * as version from "./version";

export function read() {
    const lastTag = execSync('git describe --tags $(git rev-list --tags --max-count=1)', { stdio: "pipe" })
        .toString()
        .trim();
    return version.regExp.test(lastTag) && lastTag || false;
}

export function commit(version) {
    execSync(`git commit -am 'Release ${version}'`, { stdio: "inherit" });
}

export function tag(version) {
    execSync(`git tag ${version}`);
    console.log(`git tag ${version}`);
}
