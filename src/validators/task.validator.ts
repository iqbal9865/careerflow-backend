import { TaskStatus } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { assertDateField, assertPlainObject, assertStringField } from "./common.validator.js";

const validStatuses: string[] = Object.values(TaskStatus);

const validateTaskFieldTypes = (data: Record<string, unknown>): void => {
    assertStringField(data, "title", { nullable: false });
    assertStringField(data, "description", { nullable: true });
    assertDateField(data, "deadline", { nullable: false });
};

export const validateCreateTaskInput = (data: unknown): void => {
    assertPlainObject(data);
    validateTaskFieldTypes(data);
    const { title, deadline } = data;

    if (typeof title !== "string" || !title.trim() || deadline === undefined) {
        throw new ApiError(400, "Title and deadline are required");
    }

    if (title.trim().length < 2) {
        throw new ApiError(400, "Title must be at least 2 characters");
    }

    // Status always starts as PENDING; it changes only through PUT /tasks/:id/status
    if (data.status !== undefined) {
        throw new ApiError(400, "Status cannot be set on create. New tasks start as PENDING");
    }
};

export const validateUpdateTaskInput = (data: unknown): void => {
    assertPlainObject(data);
    validateTaskFieldTypes(data);
    const { title } = data;

    if (typeof title === "string" && title.trim().length < 2) {
        throw new ApiError(400, "Title must be at least 2 characters");
    }

    if (data.status !== undefined) {
        throw new ApiError(400, "Use PUT /tasks/:id/status to change the status");
    }
};

export const validateUpdateTaskStatusInput = (data: unknown): void => {
    assertPlainObject(data);
    const { status } = data;

    if (typeof status !== "string" || !validStatuses.includes(status)) {
        throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }
};

export const validateListTasksQuery = (query: unknown): void => {
    assertPlainObject(query);
    const { status, from, to } = query;

    // Repeated or bracketed query params (?status=a&status=b, ?status[x]=y) arrive as arrays/objects
    if (status !== undefined && (typeof status !== "string" || !validStatuses.includes(status))) {
        throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }
    assertDateField(query, "from", { nullable: false });
    assertDateField(query, "to", { nullable: false });

    if (typeof from === "string" && typeof to === "string" && new Date(from) > new Date(to)) {
        throw new ApiError(400, "from must be before to");
    }
};
