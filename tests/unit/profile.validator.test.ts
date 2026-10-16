import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Gender } from "@prisma/client";
import { validateUpdateProfileInput } from "../../src/validators/profile.validator.js";

describe("validateUpdateProfileInput", () => {
    it("accepts an empty update", () => {
        assert.doesNotThrow(() => validateUpdateProfileInput({}));
    });

    it("accepts valid values for every field", () => {
        assert.doesNotThrow(() =>
            validateUpdateProfileInput({
                bio: "Backend developer who likes APIs",
                avatarUrl: "https://cdn.example/avatar.png",
                dateOfBirth: "1995-05-20",
                city: "Dhaka",
                country: "Bangladesh",
                portfolioUrl: "https://jane.dev",
                linkedinUrl: "https://linkedin.com/in/jane",
                githubUrl: "https://github.com/jane",
                phoneNumber: "+880 1700-000000",
                gender: Object.values(Gender)[0],
            })
        );
    });

    it("accepts null to clear nullable fields", () => {
        assert.doesNotThrow(() =>
            validateUpdateProfileInput({ bio: null, city: null, dateOfBirth: null, gender: null })
        );
    });

    it("rejects nested writes and filter operators", () => {
        assert.throws(() => validateUpdateProfileInput({ bio: { set: "hacked" } }), {
            statusCode: 400,
            message: "bio must be a string or null",
        });
    });

    it("rejects a short bio", () => {
        assert.throws(() => validateUpdateProfileInput({ bio: "short" }), {
            statusCode: 400,
            message: "Bio must be at least 10 characters",
        });
    });

    it("rejects non-https URLs", () => {
        assert.throws(() => validateUpdateProfileInput({ avatarUrl: "http://x.example/a.png" }), { statusCode: 400 });
        assert.throws(() => validateUpdateProfileInput({ portfolioUrl: "jane.dev" }), { statusCode: 400 });
        assert.throws(() => validateUpdateProfileInput({ linkedinUrl: "https://evil.example" }), {
            statusCode: 400,
            message: "Invalid LinkedIn URL",
        });
        assert.throws(() => validateUpdateProfileInput({ githubUrl: "https://gitlab.com/jane" }), {
            statusCode: 400,
            message: "Invalid GitHub URL",
        });
    });

    it("rejects invalid and future dates of birth", () => {
        assert.throws(() => validateUpdateProfileInput({ dateOfBirth: "yesterday-ish" }), {
            statusCode: 400,
            message: "Invalid date of birth",
        });
        assert.throws(() => validateUpdateProfileInput({ dateOfBirth: { lt: "2000-01-01" } }), {
            statusCode: 400,
            message: "Invalid date of birth",
        });
        const nextYear = `${new Date().getFullYear() + 1}-01-01`;
        assert.throws(() => validateUpdateProfileInput({ dateOfBirth: nextYear }), {
            statusCode: 400,
            message: "Date of birth must be in the past",
        });
    });

    it("rejects short city and country", () => {
        assert.throws(() => validateUpdateProfileInput({ city: "D" }), { statusCode: 400 });
        assert.throws(() => validateUpdateProfileInput({ country: "B" }), { statusCode: 400 });
    });

    it("rejects an invalid phone number", () => {
        assert.throws(() => validateUpdateProfileInput({ phoneNumber: "call me" }), {
            statusCode: 400,
            message: "Invalid phone number format",
        });
    });

    it("rejects an unknown or non-string gender", () => {
        assert.throws(() => validateUpdateProfileInput({ gender: "UNKNOWN_VALUE" }), { statusCode: 400 });
        assert.throws(() => validateUpdateProfileInput({ gender: 1 }), { statusCode: 400 });
    });
});
