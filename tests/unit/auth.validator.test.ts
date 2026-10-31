import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    validateLoginInput,
    validateRefreshTokenInput,
    validateRegisterInput,
    validateUpdateEmailInput,
    validateUpdateNameInput,
} from "../../src/validators/auth.validator.js";

const validRegister = { fullName: "Jane Doe", email: "jane@example.com", password: "Passw0rd!" };

describe("validateRegisterInput", () => {
    it("accepts valid input", () => {
        assert.doesNotThrow(() => validateRegisterInput(validRegister));
    });

    it("rejects a non-object body", () => {
        assert.throws(() => validateRegisterInput(null), { statusCode: 400 });
        assert.throws(() => validateRegisterInput([]), { statusCode: 400 });
    });

    it("rejects missing fields", () => {
        assert.throws(() => validateRegisterInput({ email: "a@b.co", password: "Passw0rd!" }), {
            statusCode: 400,
            message: "Missing required fields",
        });
    });

    it("rejects non-string fields with 400 instead of crashing", () => {
        assert.throws(() => validateRegisterInput({ ...validRegister, email: { not: "" } }), {
            statusCode: 400,
            message: "Full name, email and password must be strings",
        });
        assert.throws(() => validateRegisterInput({ ...validRegister, password: 12345678 }), {
            statusCode: 400,
        });
    });

    it("rejects an invalid email", () => {
        assert.throws(() => validateRegisterInput({ ...validRegister, email: "not-an-email" }), {
            statusCode: 400,
            message: "Invalid email format",
        });
    });

    it("rejects a short password", () => {
        assert.throws(() => validateRegisterInput({ ...validRegister, password: "Pa1!" }), {
            statusCode: 400,
            message: "Password must be at least 8 characters long",
        });
    });

    for (const password of ["password1!", "PASSWORD1!", "Password!!", "Password12"]) {
        it(`rejects a weak password (${password})`, () => {
            assert.throws(() => validateRegisterInput({ ...validRegister, password }), {
                statusCode: 400,
                message: "Password must include uppercase, lowercase, number, and special character",
            });
        });
    }
});

describe("validateLoginInput", () => {
    it("accepts valid input", () => {
        assert.doesNotThrow(() => validateLoginInput({ email: "jane@example.com", password: "anything" }));
    });

    it("rejects missing fields", () => {
        assert.throws(() => validateLoginInput({ email: "jane@example.com" }), {
            statusCode: 400,
            message: "Email and password are required",
        });
    });

    it("rejects non-string fields", () => {
        assert.throws(() => validateLoginInput({ email: { not: "" }, password: "x" }), {
            statusCode: 400,
            message: "Email and password must be strings",
        });
    });

    it("rejects an invalid email", () => {
        assert.throws(() => validateLoginInput({ email: "jane", password: "x" }), {
            statusCode: 400,
            message: "Invalid email format",
        });
    });
});

describe("validateRefreshTokenInput", () => {
    it("accepts a non-empty string", () => {
        assert.doesNotThrow(() => validateRefreshTokenInput({ refreshToken: "abc.def.ghi" }));
    });

    for (const [label, value] of [["missing", undefined], ["null", null], ["empty", ""]] as const) {
        it(`rejects a ${label} token`, () => {
            assert.throws(() => validateRefreshTokenInput({ refreshToken: value }), {
                statusCode: 400,
                message: "Refresh token required",
            });
        });
    }

    it("rejects a Prisma filter object", () => {
        assert.throws(() => validateRefreshTokenInput({ refreshToken: { not: "" } }), {
            statusCode: 400,
            message: "Refresh token must be a string",
        });
    });
});

describe("validateUpdateNameInput", () => {
    it("accepts a valid name", () => {
        assert.doesNotThrow(() => validateUpdateNameInput({ fullName: "Jane" }));
    });

    it("rejects missing, blank or non-string names", () => {
        for (const fullName of [undefined, "", "   ", 42, { set: "x" }]) {
            assert.throws(() => validateUpdateNameInput({ fullName }), {
                statusCode: 400,
                message: "Full name is required",
            });
        }
    });

    it("rejects a one-character name", () => {
        assert.throws(() => validateUpdateNameInput({ fullName: " J " }), {
            statusCode: 400,
            message: "Full name must be at least 2 characters",
        });
    });
});

describe("validateUpdateEmailInput", () => {
    it("accepts valid input, trimming the email", () => {
        assert.doesNotThrow(() => validateUpdateEmailInput({ newEmail: "  new@example.com ", currentPassword: "x" }));
    });

    it("rejects a missing current password", () => {
        assert.throws(() => validateUpdateEmailInput({ newEmail: "new@example.com" }), {
            statusCode: 400,
            message: "New email and current password are required",
        });
    });

    it("rejects non-string fields", () => {
        assert.throws(() => validateUpdateEmailInput({ newEmail: { set: "x" }, currentPassword: "x" }), {
            statusCode: 400,
        });
    });

    it("rejects an invalid email", () => {
        assert.throws(() => validateUpdateEmailInput({ newEmail: "bad", currentPassword: "x" }), {
            statusCode: 400,
            message: "Invalid email format",
        });
    });
});
