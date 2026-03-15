import type { ApplicationInput } from "../modules/application/application.types.js";
import { ApplicationStatus } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";

const validStatuses = Object.values(ApplicationStatus);

export const validateCreateApplicationInput = (data: ApplicationInput): void => {
    const { companyName, position, status } = data;

    if (!companyName || !position) {
        throw new ApiError(400, "Company name and position are required");
    }

    if (companyName.trim().length < 2) {
        throw new ApiError(400, "Company name must be at least 2 characters");
    }

    if (position.trim().length < 2) {
        throw new ApiError(400, "Position must be at least 2 characters");
    }

    if (status && !validStatuses.includes(status)) {
        throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }
};

export const validateUpdateApplicationInput = (data: Partial<ApplicationInput>): void => {
    const { companyName, position, status } = data;

    if (companyName !== undefined && companyName.trim().length < 2) {
        throw new ApiError(400, "Company name must be at least 2 characters");
    }

    if (position !== undefined && position.trim().length < 2) {
        throw new ApiError(400, "Position must be at least 2 characters");
    }

    if (status && !validStatuses.includes(status)) {
        throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }
};