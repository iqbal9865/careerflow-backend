import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../../src/middlewares/auth.middleware.js";
import { validateRegisterMiddleware, validateRefreshTokenMiddleware } from "../../src/middlewares/validate.middleware.js";
import { validateCreateApplicationMiddleware } from "../../src/middlewares/application.middleware.js";
import { validateUpdateProfileMiddleware } from "../../src/middlewares/profile.middleware.js";

// Minimal fakes for req/res/next; enough for middleware that only reads headers/body
const fakeRes = () => {
    const res = {
        statusCode: 200,
        body: undefined as unknown,
        status(code: number) {
            res.statusCode = code;
            return res;
        },
        json(payload: unknown) {
            res.body = payload;
            return res;
        },
    };
    return res;
};

const run = (
    middleware: (req: Request, res: Response, next: NextFunction) => unknown,
    req: Partial<Request> & Record<string, unknown>
) => {
    const res = fakeRes();
    let nextCalled = false;
    middleware(req as Request, res as unknown as Response, () => {
        nextCalled = true;
    });
    return { res, nextCalled, req };
};

describe("authMiddleware", () => {
    const SECRET = "unit-test-access-secret";
    let saved: string | undefined;

    before(() => {
        saved = process.env.ACCESS_TOKEN_SECRET;
        process.env.ACCESS_TOKEN_SECRET = SECRET;
    });
    after(() => {
        if (saved === undefined) delete process.env.ACCESS_TOKEN_SECRET;
        else process.env.ACCESS_TOKEN_SECRET = saved;
    });

    it("sets req.userId and calls next for a valid token", () => {
        const token = jwt.sign({ userId: "user-1" }, SECRET);
        const { res, nextCalled, req } = run(authMiddleware, { headers: { authorization: `Bearer ${token}` } });
        assert.equal(nextCalled, true);
        assert.equal(req.userId, "user-1");
        assert.equal(res.body, undefined);
    });

    it("returns 401 when the header is missing", () => {
        const { res, nextCalled } = run(authMiddleware, { headers: {} });
        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 401);
    });

    it("returns 401 when the scheme is not Bearer", () => {
        const token = jwt.sign({ userId: "user-1" }, SECRET);
        const { res, nextCalled } = run(authMiddleware, { headers: { authorization: `Basic ${token}` } });
        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 401);
    });

    it("returns 401 for a token signed with another secret", () => {
        const token = jwt.sign({ userId: "user-1" }, "other-secret");
        const { res, nextCalled } = run(authMiddleware, { headers: { authorization: `Bearer ${token}` } });
        assert.equal(nextCalled, false);
        assert.deepEqual(res.body, { message: "Invalid or expired token" });
    });

    it("returns 401 for an expired token", () => {
        const token = jwt.sign({ userId: "user-1", exp: Math.floor(Date.now() / 1000) - 10 }, SECRET);
        const { res, nextCalled } = run(authMiddleware, { headers: { authorization: `Bearer ${token}` } });
        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 401);
    });

    it("returns 401 for 'Bearer ' with no token", () => {
        const { res, nextCalled } = run(authMiddleware, { headers: { authorization: "Bearer " } });
        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 401);
    });

    it("returns 500 when the secret is not configured", () => {
        delete process.env.ACCESS_TOKEN_SECRET;
        try {
            const token = jwt.sign({ userId: "user-1" }, SECRET);
            const { res, nextCalled } = run(authMiddleware, { headers: { authorization: `Bearer ${token}` } });
            assert.equal(nextCalled, false);
            assert.equal(res.statusCode, 500);
        } finally {
            process.env.ACCESS_TOKEN_SECRET = SECRET;
        }
    });
});

describe("validation middleware wrappers", () => {
    const cases = [
        { name: "validateRegisterMiddleware", mw: validateRegisterMiddleware, valid: { fullName: "Jane", email: "j@x.co", password: "Passw0rd!" } },
        { name: "validateRefreshTokenMiddleware", mw: validateRefreshTokenMiddleware, valid: { refreshToken: "abc" } },
        { name: "validateCreateApplicationMiddleware", mw: validateCreateApplicationMiddleware, valid: { companyName: "Acme", position: "Dev" } },
        { name: "validateUpdateProfileMiddleware", mw: validateUpdateProfileMiddleware, valid: { city: "Dhaka" } },
    ];

    for (const { name, mw, valid } of cases) {
        it(`${name} calls next for a valid body`, () => {
            const { res, nextCalled } = run(mw, { body: valid });
            assert.equal(nextCalled, true);
            assert.equal(res.body, undefined);
        });

        it(`${name} returns 400 { success: false, message } for an invalid body`, () => {
            const { res, nextCalled } = run(mw, { body: null });
            assert.equal(nextCalled, false);
            assert.equal(res.statusCode, 400);
            assert.deepEqual(res.body, { success: false, message: "Request body must be a JSON object" });
        });
    }

    it("treats an undefined body (no Content-Type) as invalid", () => {
        const { res, nextCalled } = run(validateCreateApplicationMiddleware, { body: undefined });
        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 400);
    });
});
