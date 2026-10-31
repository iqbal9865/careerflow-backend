
export const pickFields = <T extends object, K extends keyof T>(
    source: T,
    allowedKeys: readonly K[]
): Partial<Pick<T, K>> => {
    const result: Partial<Pick<T, K>> = {};
    for (const key of allowedKeys) {
        if (source[key] !== undefined) result[key] = source[key];
    }
    return result;
};
