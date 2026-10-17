import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    validateCreateTaskInput,
    validateUpdateTaskInput,
    validateUpdateTaskStatusInput,
    validateListTasksQuery,
} from "../../src/validators/task.validator.js";

const validCreate = { title: "Write cover letter", deadline: "2026-10-20" };

describe("validateCreateTaskInput", () => {
    it("accepts the required fields with an optional description", () => {
        assert.doesNotThrow(() => validateCreateTaskInput(validCreate));
        assert.doesNotThrow(() => validateCreateTaskInput({ ...validCreate, description: null }));
        assert.doesNotThrow(() => validateCreateTaskInput({ ...validCreate, description: "For Acme" }));
    });

    it("rejects missing title or deadline", () => {
        for (const body of [{ title: "Write" }, { deadline: "2026-10-20" }, { title: "   ", deadline: "2026-10-20" }]) {
            assert.throws(() => validateCreateTaskInput(body), {
                statusCode: 400,
                message: "Title and deadline are required",
            });
        }
    });

    it("rejects a too-short title", () => {
        assert.throws(() => validateCreateTaskInput({ ...validCreate, title: " A " }), {
            statusCode: 400,
            message: "Title must be at least 2 characters",
        });
    });

    it("rejects a status on create", () => {
        assert.throws(() => validateCreateTaskInput({ ...validCreate, status: "DONE" }), { statusCode: 400 });
    });

    it("rejects non-string fields and invalid dates", () => {
        const cases = [
            { ...validCreate, title: { set: "x" } },
            { ...validCreate, description: 42 },
            { ...validCreate, deadline: "not a date" },
            { ...validCreate, deadline: null },
        ];
        for (const body of cases) {
            assert.throws(() => validateCreateTaskInput(body), { statusCode: 400 });
        }
    });

    it("rejects a non-object body", () => {
        for (const body of [null, [], "x"]) {
            assert.throws(() => validateCreateTaskInput(body), { statusCode: 400 });
        }
    });
});

describe("validateUpdateTaskInput", () => {
    it("accepts an empty or partial body", () => {
        assert.doesNotThrow(() => validateUpdateTaskInput({}));
        assert.doesNotThrow(() => validateUpdateTaskInput({ deadline: "2026-11-01T09:00:00.000Z" }));
    });

    it("rejects a status change through the generic update", () => {
        assert.throws(() => validateUpdateTaskInput({ status: "DONE" }), {
            statusCode: 400,
            message: "Use PUT /tasks/:id/status to change the status",
        });
    });

    it("rejects a too-short title and a null deadline", () => {
        assert.throws(() => validateUpdateTaskInput({ title: "A" }), { statusCode: 400 });
        assert.throws(() => validateUpdateTaskInput({ deadline: null }), { statusCode: 400 });
    });
});

describe("validateUpdateTaskStatusInput", () => {
    it("accepts every TaskStatus value", () => {
        for (const status of ["PENDING", "REVIEW", "DONE"]) {
            assert.doesNotThrow(() => validateUpdateTaskStatusInput({ status }));
        }
    });

    it("rejects missing, unknown and non-string statuses", () => {
        for (const body of [{}, { status: "FINISHED" }, { status: ["DONE"] }, { status: { not: "" } }]) {
            assert.throws(() => validateUpdateTaskStatusInput(body), { statusCode: 400 });
        }
    });
});

describe("validateListTasksQuery", () => {
    it("accepts an empty query and valid filters", () => {
        assert.doesNotThrow(() => validateListTasksQuery({}));
        assert.doesNotThrow(() => validateListTasksQuery({ status: "PENDING", from: "2026-10-01", to: "2026-10-31" }));
    });

    it("rejects arrays, objects, bad dates and an inverted range", () => {
        const cases = [
            { status: ["PENDING", "DONE"] },
            { status: "LATER" },
            { from: { gt: "x" } },
            { to: "nope" },
            { from: "2026-10-31", to: "2026-10-01" },
        ];
        for (const query of cases) {
            assert.throws(() => validateListTasksQuery(query), { statusCode: 400 });
        }
    });
});
