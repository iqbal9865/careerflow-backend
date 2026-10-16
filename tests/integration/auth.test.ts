import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
    prisma,
    registerUser,
    request,
    startServer,
    stopServer,
    TEST_PASSWORD,
    trackUser,
    uniqueEmail,
} from "./helpers.js";

before(startServer);
after(stopServer);

describe("POST /auth/register", () => {
    it("creates a user and profile, returns tokens and no password", async () => {
        const email = uniqueEmail();
        const res = await request("POST", "/auth/register", {
            body: { fullName: "  Jane Doe  ", email: email.toUpperCase(), password: TEST_PASSWORD },
        });
        assert.equal(res.status, 201, res.body?.message);
        trackUser(res.body.data.id);

        assert.equal(res.body.message, "User registered successfully");
        assert.equal(res.body.data.email, email, "email is lowercased");
        assert.equal(res.body.data.fullName, "Jane Doe");
        assert.equal(res.body.data.role, "USER");
        assert.equal(typeof res.body.data.accessToken, "string");
        assert.equal(typeof res.body.data.refreshToken, "string");
        assert.equal("password" in res.body.data, false);

        const profile = await prisma.profile.findUnique({ where: { userId: res.body.data.id } });
        assert.ok(profile, "profile is created at registration");
    });

    it("stores a bcrypt hash, not the plain password", async () => {
        const user = await registerUser();
        const row = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
        assert.notEqual(row?.password, TEST_PASSWORD);
        assert.match(row?.password ?? "", /^\$2[aby]\$10\$/);
    });

    it("ignores a client-sent role", async () => {
        const user = await registerUser({ role: "ADMIN" });
        const row = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
        assert.equal(row?.role, "USER");
    });

    it("rejects a duplicate email with 400", async () => {
        const user = await registerUser();
        const res = await request("POST", "/auth/register", {
            body: { fullName: "Someone", email: user.email, password: TEST_PASSWORD },
        });
        assert.equal(res.status, 400);
        assert.equal(res.body.message, "User already exists");
    });

    it("rejects invalid bodies with 400 before touching the database", async () => {
        const cases = [
            { fullName: "A", email: { not: "" }, password: TEST_PASSWORD },
            { fullName: "A", email: uniqueEmail(), password: "weak" },
            { fullName: "A", email: "not-an-email", password: TEST_PASSWORD },
        ];
        for (const body of cases) {
            const res = await request("POST", "/auth/register", { body });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
        }
    });

    it("rejects a non-object JSON body with 400", async () => {
        const res = await request("POST", "/auth/register", { rawBody: "[]" });
        assert.equal(res.status, 400);
    });
});

describe("POST /auth/login", () => {
    it("returns new tokens for valid credentials (email is case-insensitive)", async () => {
        const user = await registerUser();
        const res = await request("POST", "/auth/login", {
            body: { email: user.email.toUpperCase(), password: TEST_PASSWORD },
        });
        assert.equal(res.status, 200, res.body?.message);
        assert.equal(res.body.message, "Login successful");
        assert.equal(typeof res.body.data.accessToken, "string");
        assert.equal(typeof res.body.data.refreshToken, "string");
    });

    it("allows several logins for the same user within one second", async () => {
        // Tokens are signed from { userId, iat } only, so logins in the same second
        // produce identical refresh tokens and hit the unique constraint on RefreshToken.token
        const user = await registerUser();
        for (let i = 0; i < 3; i++) {
            const res = await request("POST", "/auth/login", { body: { email: user.email, password: TEST_PASSWORD } });
            assert.equal(res.status, 200, `login #${i + 1} failed: ${String(res.body?.message).split("\n").pop()}`);
        }
    });

    it("rejects a wrong password with 400", async () => {
        const user = await registerUser();
        const res = await request("POST", "/auth/login", { body: { email: user.email, password: "Wrong0000!" } });
        assert.equal(res.status, 400);
    });

    it("rejects an unknown email with 400", async () => {
        const res = await request("POST", "/auth/login", { body: { email: uniqueEmail(), password: TEST_PASSWORD } });
        assert.equal(res.status, 400);
    });

    it("rejects a filter-operator email with 400", async () => {
        const res = await request("POST", "/auth/login", { body: { email: { contains: "@" }, password: "x" } });
        assert.equal(res.status, 400);
    });
});

describe("POST /auth/refresh and /auth/logout", () => {
    it("issues a working access token from a stored refresh token", async () => {
        const user = await registerUser();
        const res = await request("POST", "/auth/refresh", { body: { refreshToken: user.refreshToken } });
        assert.equal(res.status, 200, res.body?.message);
        const profile = await request("GET", "/profile", { token: res.body.accessToken });
        assert.equal(profile.status, 200);
    });

    it("rejects an unknown refresh token with 403", async () => {
        const forged = jwt.sign({ userId: "x" }, "not-the-secret");
        const res = await request("POST", "/auth/refresh", { body: { refreshToken: forged } });
        assert.equal(res.status, 403);
    });

    it("rejects a filter-operator refresh token with 400", async () => {
        const res = await request("POST", "/auth/refresh", { body: { refreshToken: { not: "" } } });
        assert.equal(res.status, 400);
    });

    it("logout deletes the token so it can no longer refresh", async () => {
        const user = await registerUser();
        const logout = await request("POST", "/auth/logout", { body: { refreshToken: user.refreshToken } });
        assert.equal(logout.status, 200);
        assert.equal(logout.body.message, "Logout successful");

        const refresh = await request("POST", "/auth/refresh", { body: { refreshToken: user.refreshToken } });
        assert.equal(refresh.status, 403);
    });

    it("logout with { not: \"\" } is rejected and deletes nothing", async () => {
        const user = await registerUser();
        const res = await request("POST", "/auth/logout", { body: { refreshToken: { not: "" } } });
        assert.equal(res.status, 400);

        const stillStored = await prisma.refreshToken.findUnique({ where: { token: user.refreshToken } });
        assert.ok(stillStored, "other users' refresh tokens survive");
    });
});

describe("PUT /auth/name", () => {
    it("updates the name and returns only id, fullName, email", async () => {
        const user = await registerUser();
        const res = await request("PUT", "/auth/name", { token: user.accessToken, body: { fullName: "  New Name " } });
        assert.equal(res.status, 200, res.body?.message);
        assert.deepEqual(res.body.data, { id: user.id, fullName: "New Name", email: user.email });
    });

    it("requires authentication", async () => {
        const res = await request("PUT", "/auth/name", { body: { fullName: "New Name" } });
        assert.equal(res.status, 401);
    });

    it("rejects an invalid name with 400", async () => {
        const user = await registerUser();
        const res = await request("PUT", "/auth/name", { token: user.accessToken, body: { fullName: { set: "x" } } });
        assert.equal(res.status, 400);
    });
});

describe("PUT /auth/email", () => {
    it("changes the email when the current password is right, and login works with it", async () => {
        const user = await registerUser();
        const newEmail = uniqueEmail();
        const res = await request("PUT", "/auth/email", {
            token: user.accessToken,
            body: { newEmail: newEmail.toUpperCase(), currentPassword: TEST_PASSWORD },
        });
        assert.equal(res.status, 200, res.body?.message);
        assert.deepEqual(res.body.data, { id: user.id, fullName: user.fullName, email: newEmail });

        const oldLogin = await request("POST", "/auth/login", { body: { email: user.email, password: TEST_PASSWORD } });
        assert.equal(oldLogin.status, 400);
        const newLogin = await request("POST", "/auth/login", { body: { email: newEmail, password: TEST_PASSWORD } });
        assert.equal(newLogin.status, 200);
    });

    it("returns 400 (not 401) for a wrong current password", async () => {
        const user = await registerUser();
        const res = await request("PUT", "/auth/email", {
            token: user.accessToken,
            body: { newEmail: uniqueEmail(), currentPassword: "Wrong0000!" },
        });
        assert.equal(res.status, 400);
        assert.equal(res.body.message, "Current password is incorrect");
    });

    it("rejects the same email with 400", async () => {
        const user = await registerUser();
        const res = await request("PUT", "/auth/email", {
            token: user.accessToken,
            body: { newEmail: user.email, currentPassword: TEST_PASSWORD },
        });
        assert.equal(res.status, 400);
    });

    it("rejects an email used by another account with 409", async () => {
        const user = await registerUser();
        const other = await registerUser();
        const res = await request("PUT", "/auth/email", {
            token: user.accessToken,
            body: { newEmail: other.email, currentPassword: TEST_PASSWORD },
        });
        assert.equal(res.status, 409);
    });
});

describe("authMiddleware on a real route", () => {
    it("rejects missing, malformed, forged and expired tokens with 401", async () => {
        const user = await registerUser();
        const secret = process.env.ACCESS_TOKEN_SECRET!;
        const expired = jwt.sign({ userId: user.id, exp: Math.floor(Date.now() / 1000) - 60 }, secret);
        const forged = jwt.sign({ userId: user.id }, "not-the-secret");

        assert.equal((await request("GET", "/profile")).status, 401);
        assert.equal((await request("GET", "/profile", { token: "garbage" })).status, 401);
        assert.equal((await request("GET", "/profile", { token: forged })).status, 401);
        assert.equal((await request("GET", "/profile", { token: expired })).status, 401);
    });
});
