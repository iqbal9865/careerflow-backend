import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { ApiError } from "../../src/utils/ApiError.js";
import { pickFields } from "../../src/utils/pickFields.js";

describe("ApiError", () => {
    it("carries statusCode and message and is an Error", () => {
        const error = new ApiError(404, "Not found");
        assert.ok(error instanceof Error);
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        assert.equal(error.message, "Not found");
        assert.ok(error.stack);
    });
});

describe("pickFields", () => {
    it("copies only allowlisted keys", () => {
        const source = { companyName: "Acme", userId: "attacker", user: { update: { role: "ADMIN" } } };
        assert.deepEqual(pickFields(source, ["companyName"] as const), { companyName: "Acme" });
    });

    it("skips undefined but keeps null", () => {
        const source: { a?: string | undefined; b: string | null } = { a: undefined, b: null };
        assert.deepEqual(pickFields(source, ["a", "b"] as const), { b: null });
    });

    it("returns an empty object when nothing matches", () => {
        const source: { a?: string } = {};
        assert.deepEqual(pickFields(source, ["a"] as const), {});
    });
});

describe("jwt helpers", () => {
    // Dummy values for this test process only
    const ACCESS = "test-access-secret";
    const REFRESH = "test-refresh-secret";
    let generateAccessToken: (userId: string) => string;
    let generateRefreshToken: (userId: string) => string;

    before(async () => {
        process.env.ACCESS_TOKEN_SECRET = ACCESS;
        process.env.REFRESH_TOKEN_SECRET = REFRESH;
        ({ generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js"));
    });

    it("signs an access token with the access secret and userId", () => {
        const payload = jwt.verify(generateAccessToken("user-1"), ACCESS) as JwtPayload;
        assert.equal(payload.userId, "user-1");
        assert.ok(payload.exp);
    });

    it("signs a refresh token with the refresh secret", () => {
        const token = generateRefreshToken("user-2");
        assert.equal((jwt.verify(token, REFRESH) as JwtPayload).userId, "user-2");
        assert.throws(() => jwt.verify(token, ACCESS));
    });

    it("gives the refresh token a later expiry than the access token", () => {
        const access = jwt.decode(generateAccessToken("u")) as JwtPayload;
        const refresh = jwt.decode(generateRefreshToken("u")) as JwtPayload;
        assert.ok(refresh.exp! > access.exp!);
    });

    it("throws when the secret is missing", () => {
        const saved = process.env.ACCESS_TOKEN_SECRET;
        delete process.env.ACCESS_TOKEN_SECRET;
        try {
            assert.throws(() => generateAccessToken("u"), { message: "ACCESS_TOKEN_SECRET is not set" });
        } finally {
            process.env.ACCESS_TOKEN_SECRET = saved;
        }
    });
});
