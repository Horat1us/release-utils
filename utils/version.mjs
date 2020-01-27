export const regExp = /^(\d+)\.(\d+)\.(\d+)$/;
export function update(index, current, separator = ".") {
    const next = regExp.exec(current).slice(1, 4);
    next[index]++;
    return next.join(separator);
}
