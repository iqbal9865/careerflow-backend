import { ApiError } from "../utils/ApiError.js";

interface FieldOptions {
    nullable: boolean;
}

export function assertPlainObject(data: unknown): asserts data is Record<string, unknown> {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
        throw new ApiError(400, "Request body must be a JSON object");
    }
}

// Rejects objects/arrays/numbers so Prisma never receives nested writes or filter operators
export const assertStringField = (
    data: Record<string, unknown>,
    field: string,
    { nullable }: FieldOptions
): void => {
    const value = data[field];
    if (value === undefined || (value === null && nullable)) return;
    if (typeof value !== "string") {
        throw new ApiError(400, `${field} must be a string${nullable ? " or null" : ""}`);
    }
};

export const assertDateField = (
    data: Record<string, unknown>,
    field: string,
    { nullable }: FieldOptions
): void => {
    const value = data[field];
    if (value === undefined || (value === null && nullable)) return;
    if (typeof value !== "string" || isNaN(new Date(value).getTime())) {
        throw new ApiError(400, `${field} must be a valid date string${nullable ? " or null" : ""}`);
    }
};
