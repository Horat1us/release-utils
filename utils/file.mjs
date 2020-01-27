import fs from "fs";
import path from "path";

import * as version from "./version";

export function update(replacer) {
    let file = path.join(process.cwd(), 'meta.json');
    if (!fs.existsSync(file)) {
        file = path.join(process.cwd(), 'package.json');
        if (!fs.existsSync(file)) {
            return false;
        }
    }
    const meta = JSON.parse(fs.readFileSync(file));
    if (
        ('object' !== typeof meta) || !('version' in meta)
        || !('string' === typeof meta.version) || !version.regExp.test(meta.version)
    ) {
        console.warn(`skip ${file}`);
        return false;
    }
    meta.version = replacer(meta.version);

    fs.writeFileSync(file, JSON.stringify(meta, undefined, 2));
    console.log(`update ${file}`);

    return meta.version;
}
