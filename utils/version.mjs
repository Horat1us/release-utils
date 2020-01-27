export const regExp = /^(\d+)\.(\d+)\.(\d+)$/;

export function update(index, current, separator = ".") {
    const version = regExp.exec(current).slice(1, 4).map((i) => parseInt(i, 10));
    return [
        ...version.splice(0, index),
        version.shift() + 1,
        ...version.fill(0),
    ]
        .join(separator);
}
