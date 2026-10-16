import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertDateField, assertPlainObject, assertStringField } from "../../src/validators/common.validator.js";

describe("assertPlainObject", () => {
    it("accepts a plain object", () => {
        assert.doesNotThrow(() => assertPlainObject({ a: 1 }));
        assert.doesNotThrow(() => assertPlainObject({}));
    });

    for (const [label, value] of [
        ["null", null],
        ["undefined", undefined],
        ["an array", []],
        ["a string", "hello"],
        ["a number", 42],
    ] as const) {
        it(`rejects ${label} with 400`, () => {
            assert.throws(() => assertPlainObject(value), {
                statusCode: 400,
                message: "Request body must be a JSON object",
            });
        });
    }
});

describe("assertStringField", () => {
    it("skips a missing field", () => {
        assert.doesNotThrow(() => assertStringField({}, "name", { nullable: false }));
    });

    it("accepts a string", () => {
        assert.doesNotThrow(() => assertStringField({ name: "x" }, "name", { nullable: false }));
    });

    it("accepts null only when nullable", () => {
        assert.doesNotThrow(() => assertStringField({ name: null }, "name", { nullable: true }));
        assert.throws(() => assertStringField({ name: null }, "name", { nullable: false }), {
            statusCode: 400,
            message: "name must be a string",
        });
    });

    it("rejects Prisma operator objects", () => {
        assert.throws(() => assertStringField({ name: { not: "" } }, "name", { nullable: true }), {
            statusCode: 400,
            message: "name must be a string or null",
        });
        assert.throws(() => assertStringField({ name: { set: "x" } }, "name", { nullable: false }), {
            statusCode: 400,
        });
    });

    it("rejects numbers and arrays", () => {
        assert.throws(() => assertStringField({ name: 1 }, "name", { nullable: false }), { statusCode: 400 });
        assert.throws(() => assertStringField({ name: ["a"] }, "name", { nullable: false }), { statusCode: 400 });
    });
});

describe("assertDateField", () => {
    it("accepts a valid date string", () => {
        assert.doesNotThrow(() => assertDateField({ d: "2026-01-15" }, "d", { nullable: false }));
        assert.doesNotThrow(() => assertDateField({ d: "2026-01-15T10:00:00Z" }, "d", { nullable: false }));
    });

    it("skips a missing field and allows null when nullable", () => {
        assert.doesNotThrow(() => assertDateField({}, "d", { nullable: false }));
        assert.doesNotThrow(() => assertDateField({ d: null }, "d", { nullable: true }));
    });

    it("rejects null when not nullable", () => {
        assert.throws(() => assertDateField({ d: null }, "d", { nullable: false }), {
            statusCode: 400,
            message: "d must be a valid date string",
        });
    });

    it("rejects an invalid date string", () => {
        assert.throws(() => assertDateField({ d: "not-a-date" }, "d", { nullable: false }), { statusCode: 400 });
    });

    it("rejects numbers and objects", () => {
        assert.throws(() => assertDateField({ d: 1700000000000 }, "d", { nullable: false }), { statusCode: 400 });
        assert.throws(() => assertDateField({ d: { gte: "2026-01-01" } }, "d", { nullable: true }), {
            statusCode: 400,
            message: "d must be a valid date string or null",
        });
    });
});
