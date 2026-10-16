import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApplicationStatus } from "@prisma/client";
import {
    validateCreateApplicationInput,
    validateUpdateApplicationInput,
} from "../../src/validators/application.validator.js";

const validCreate = { companyName: "Acme", position: "Backend Engineer" };

describe("validateCreateApplicationInput", () => {
    it("accepts the minimum required fields", () => {
        assert.doesNotThrow(() => validateCreateApplicationInput(validCreate));
    });

    it("accepts all optional fields", () => {
        assert.doesNotThrow(() =>
            validateCreateApplicationInput({
                ...validCreate,
                location: "Remote",
                salaryRange: null,
                jobUrl: "https://acme.example/jobs/1",
                source: "LinkedIn",
                notes: null,
                appliedAt: "2026-10-01",
                followUpAt: null,
                status: Object.values(ApplicationStatus)[0],
            })
        );
    });

    it("rejects missing required fields", () => {
        assert.throws(() => validateCreateApplicationInput({ companyName: "Acme" }), {
            statusCode: 400,
            message: "Company name and position are required",
        });
    });

    it("rejects too-short company name and position", () => {
        assert.throws(() => validateCreateApplicationInput({ ...validCreate, companyName: " A " }), {
            statusCode: 400,
            message: "Company name must be at least 2 characters",
        });
        assert.throws(() => validateCreateApplicationInput({ ...validCreate, position: "X" }), {
            statusCode: 400,
            message: "Position must be at least 2 characters",
        });
    });

    it("rejects an unknown status", () => {
        assert.throws(() => validateCreateApplicationInput({ ...validCreate, status: "HIRED_TWICE" }), {
            statusCode: 400,
        });
    });

    it("rejects a non-string status", () => {
        assert.throws(() => validateCreateApplicationInput({ ...validCreate, status: { not: "" } }), {
            statusCode: 400,
        });
    });

    it("rejects nested writes and filter operators in string fields", () => {
        assert.throws(() => validateCreateApplicationInput({ ...validCreate, notes: { set: "x" } }), {
            statusCode: 400,
            message: "notes must be a string or null",
        });
        assert.throws(() => validateCreateApplicationInput({ ...validCreate, companyName: { not: "" } }), {
            statusCode: 400,
            message: "companyName must be a string",
        });
    });

    it("rejects null for non-nullable appliedAt and invalid dates", () => {
        assert.throws(() => validateCreateApplicationInput({ ...validCreate, appliedAt: null }), { statusCode: 400 });
        assert.throws(() => validateCreateApplicationInput({ ...validCreate, followUpAt: "soon" }), { statusCode: 400 });
    });

    it("ignores unknown fields such as userId (the service allowlist drops them)", () => {
        assert.doesNotThrow(() => validateCreateApplicationInput({ ...validCreate, userId: "someone-else" }));
    });
});

describe("validateUpdateApplicationInput", () => {
    it("accepts an empty partial update", () => {
        assert.doesNotThrow(() => validateUpdateApplicationInput({}));
    });

    it("accepts a single valid field", () => {
        assert.doesNotThrow(() => validateUpdateApplicationInput({ notes: "Called back" }));
    });

    it("rejects too-short values only when sent", () => {
        assert.throws(() => validateUpdateApplicationInput({ position: "X" }), {
            statusCode: 400,
            message: "Position must be at least 2 characters",
        });
    });

    it("rejects null for non-nullable fields", () => {
        assert.throws(() => validateUpdateApplicationInput({ companyName: null }), { statusCode: 400 });
    });

    it("rejects a non-object body", () => {
        assert.throws(() => validateUpdateApplicationInput("x"), { statusCode: 400 });
    });
});
