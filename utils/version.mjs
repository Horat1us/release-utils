export const regExp = /^(\d+)\.(\d+)\.(\d+)$/;

export function update(index, current, separator = ".") {
    const version = regExp.exec(current).slice(1, 4);
    return [...version.slice(0, current), 1 + version.shift(), ...version.map(() => 0)];
}
