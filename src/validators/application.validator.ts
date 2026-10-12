import { ApplicationStatus } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { assertDateField, assertPlainObject, assertStringField } from "./common.validator.js";

const validStatuses: string[] = Object.values(ApplicationStatus);

const validateApplicationFieldTypes = (data: Record<string, unknown>): void => {
    assertStringField(data, "companyName", { nullable: false });
    assertStringField(data, "position", { nullable: false });
    for (const field of ["location", "salaryRange", "jobUrl", "source", "notes"]) {
        assertStringField(data, field, { nullable: true });
    }
    assertDateField(data, "appliedAt", { nullable: false });
    assertDateField(data, "followUpAt", { nullable: true });

    const { status } = data;
    if (status !== undefined && (typeof status !== "string" || !validStatuses.includes(status))) {
        throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }
};

export const validateCreateApplicationInput = (data: unknown): void => {
    assertPlainObject(data);
    validateApplicationFieldTypes(data);
    const { companyName, position } = data;

    if (typeof companyName !== "string" || typeof position !== "string" || !companyName || !position) {
        throw new ApiError(400, "Company name and position are required");
    }

    if (companyName.trim().length < 2) {
        throw new ApiError(400, "Company name must be at least 2 characters");
    }

    if (position.trim().length < 2) {
        throw new ApiError(400, "Position must be at least 2 characters");
    }
};

export const validateUpdateApplicationInput = (data: unknown): void => {
    assertPlainObject(data);
    validateApplicationFieldTypes(data);
    const { companyName, position } = data;

    if (typeof companyName === "string" && companyName.trim().length < 2) {
        throw new ApiError(400, "Company name must be at least 2 characters");
    }

    if (typeof position === "string" && position.trim().length < 2) {
        throw new ApiError(400, "Position must be at least 2 characters");
    }
};