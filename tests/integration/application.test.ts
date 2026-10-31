import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma, registerUser, request, startServer, stopServer, type TestUser } from "./helpers.js";

before(startServer);
after(stopServer);

const createApplication = async (user: TestUser, body: Record<string, unknown> = {}) => {
    const res = await request("POST", "/applications", {
        token: user.accessToken,
        body: { companyName: "Acme", position: "Backend Engineer", ...body },
    });
    assert.equal(res.status, 201, res.body?.message);
    return res.body.data;
};

describe("POST /applications", () => {
    it("creates an application owned by the caller", async () => {
        const user = await registerUser();
        const res = await request("POST", "/applications", {
            token: user.accessToken,
            body: { companyName: "Acme", position: "Backend Engineer", location: "Remote", appliedAt: "2026-10-01T00:00:00.000Z" },
        });
        assert.equal(res.status, 201, res.body?.message);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.userId, user.id);
        assert.equal(res.body.data.companyName, "Acme");
        assert.equal(res.body.data.location, "Remote");
    });

    it("ignores a client-sent userId, id and nested user write", async () => {
        const user = await registerUser();
        const victim = await registerUser();
        const forcedId = randomUUID();
        const app = await createApplication(user, {
            id: forcedId,
            userId: victim.id,
            user: { update: { role: "ADMIN" } },
        });
        assert.equal(app.userId, user.id);
        assert.notEqual(app.id, forcedId);

        const row = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
        assert.equal(row?.role, "USER");
    });

    it("rejects invalid bodies with 400 and { success: false }", async () => {
        const user = await registerUser();
        const cases = [
            { companyName: "Acme" },
            { companyName: "Acme", position: "Dev", status: "NOT_A_STATUS" },
            { companyName: "Acme", position: "Dev", notes: { set: "x" } },
        ];
        for (const body of cases) {
            const res = await request("POST", "/applications", { token: user.accessToken, body });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
        }
    });

    it("handles a date-only appliedAt without a 500 or leaking internals", async () => {
        // The validator accepts "2026-10-01" but Prisma requires a full ISO DateTime
        const user = await registerUser();
        const res = await request("POST", "/applications", {
            token: user.accessToken,
            body: { companyName: "Acme", position: "Dev", appliedAt: "2026-10-01" },
        });
        assert.notEqual(res.status, 500, `server error: ${String(res.body?.message).split("\n").pop()}`);
        assert.equal(String(res.body?.message ?? "").includes("prisma"), false, "response leaks Prisma internals");
    });

    it("requires authentication", async () => {
        const res = await request("POST", "/applications", { body: { companyName: "Acme", position: "Dev" } });
        assert.equal(res.status, 401);
    });
});

describe("GET /applications", () => {
    it("returns only the caller's applications, newest appliedAt first", async () => {
        const user = await registerUser();
        const other = await registerUser();
        await createApplication(user, { companyName: "Older", appliedAt: "2026-01-01T00:00:00.000Z" });
        await createApplication(user, { companyName: "Newer", appliedAt: "2026-06-01T00:00:00.000Z" });
        await createApplication(other, { companyName: "NotMine" });

        const res = await request("GET", "/applications", { token: user.accessToken });
        assert.equal(res.status, 200, res.body?.message);
        assert.deepEqual(
            res.body.data.map((a: { companyName: string }) => a.companyName),
            ["Newer", "Older"]
        );
    });

    it("returns an empty list for a new user", async () => {
        const user = await registerUser();
        const res = await request("GET", "/applications", { token: user.accessToken });
        assert.deepEqual(res.body, { success: true, data: [] });
    });
});

describe("GET /applications/:id", () => {
    it("returns the caller's application", async () => {
        const user = await registerUser();
        const app = await createApplication(user);
        const res = await request("GET", `/applications/${app.id}`, { token: user.accessToken });
        assert.equal(res.status, 200, res.body?.message);
        assert.equal(res.body.data.id, app.id);
    });

    it("returns 403 for another user's application", async () => {
        const owner = await registerUser();
        const intruder = await registerUser();
        const app = await createApplication(owner);
        const res = await request("GET", `/applications/${app.id}`, { token: intruder.accessToken });
        assert.equal(res.status, 403);
        assert.deepEqual(res.body, { success: false, message: "Forbidden" });
    });

    it("returns 404 for a missing application", async () => {
        const user = await registerUser();
        const res = await request("GET", `/applications/${randomUUID()}`, { token: user.accessToken });
        assert.equal(res.status, 404);
        assert.equal(res.body.success, false);
    });
});

describe("PUT /applications/:id", () => {
    it("partially updates the caller's application", async () => {
        const user = await registerUser();
        const app = await createApplication(user, { location: "Remote" });
        const res = await request("PUT", `/applications/${app.id}`, {
            token: user.accessToken,
            body: { notes: "Called back" },
        });
        assert.equal(res.status, 200, res.body?.message);
        assert.equal(res.body.data.notes, "Called back");
        assert.equal(res.body.data.location, "Remote", "unsent fields are untouched");
    });

    it("cannot move the application to another user", async () => {
        const user = await registerUser();
        const victim = await registerUser();
        const app = await createApplication(user);
        const res = await request("PUT", `/applications/${app.id}`, {
            token: user.accessToken,
            body: { userId: victim.id, notes: "x" },
        });
        assert.equal(res.status, 200, res.body?.message);
        assert.equal(res.body.data.userId, user.id);
    });

    it("returns 403 for another user's application and leaves it unchanged", async () => {
        const owner = await registerUser();
        const intruder = await registerUser();
        const app = await createApplication(owner, { notes: "original" });
        const res = await request("PUT", `/applications/${app.id}`, {
            token: intruder.accessToken,
            body: { notes: "hacked" },
        });
        assert.equal(res.status, 403);

        const row = await prisma.application.findUnique({ where: { id: app.id } });
        assert.equal(row?.notes, "original");
    });

    it("returns 404 for a missing application", async () => {
        const user = await registerUser();
        const res = await request("PUT", `/applications/${randomUUID()}`, {
            token: user.accessToken,
            body: { notes: "x" },
        });
        assert.equal(res.status, 404);
    });

    it("rejects invalid values with 400", async () => {
        const user = await registerUser();
        const app = await createApplication(user);
        const res = await request("PUT", `/applications/${app.id}`, {
            token: user.accessToken,
            body: { companyName: null },
        });
        assert.equal(res.status, 400);
    });
});

describe("DELETE /applications/:id", () => {
    it("returns 403 for another user's application and does not delete it", async () => {
        const owner = await registerUser();
        const intruder = await registerUser();
        const app = await createApplication(owner);
        const res = await request("DELETE", `/applications/${app.id}`, { token: intruder.accessToken });
        assert.equal(res.status, 403);
        assert.ok(await prisma.application.findUnique({ where: { id: app.id } }));
    });

    it("deletes the caller's application, then returns 404", async () => {
        const user = await registerUser();
        const app = await createApplication(user);
        const res = await request("DELETE", `/applications/${app.id}`, { token: user.accessToken });
        assert.equal(res.status, 200, res.body?.message);
        assert.deepEqual(res.body, { success: true, message: "Application deleted successfully" });

        const again = await request("DELETE", `/applications/${app.id}`, { token: user.accessToken });
        assert.equal(again.status, 404);
    });
});
