import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma, registerUser, request, startServer, stopServer, type TestUser } from "./helpers.js";

before(startServer);
after(stopServer);

const DAY = 24 * 60 * 60 * 1000;

const createTask = async (user: TestUser, body: Record<string, unknown> = {}) => {
    const res = await request("POST", "/tasks", {
        token: user.accessToken,
        body: { title: "Apply to Acme", deadline: new Date(Date.now() + DAY).toISOString(), ...body },
    });
    assert.equal(res.status, 201, res.body?.message);
    return res.body.data;
};

const setStatus = (user: TestUser, id: string, status: string) =>
    request("PUT", `/tasks/${id}/status`, { token: user.accessToken, body: { status } });

describe("POST /tasks", () => {
    it("creates a PENDING task owned by the caller", async () => {
        const user = await registerUser();
        const res = await request("POST", "/tasks", {
            token: user.accessToken,
            body: { title: "Update CV", description: "Add the new project", deadline: "2026-10-20" },
        });
        assert.equal(res.status, 201, res.body?.message);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.userId, user.id);
        assert.equal(res.body.data.status, "PENDING");
        assert.equal(res.body.data.completedAt, null);
        assert.equal(res.body.data.deadline, "2026-10-20T00:00:00.000Z");
    });

    it("ignores client-sent server fields and nested user writes", async () => {
        const user = await registerUser();
        const victim = await registerUser();
        const forcedId = randomUUID();
        const res = await request("POST", "/tasks", {
            token: user.accessToken,
            body: {
                title: "Sneaky",
                deadline: "2026-10-20",
                id: forcedId,
                userId: victim.id,
                completedAt: "2020-01-01",
                user: { update: { role: "ADMIN" } },
            },
        });
        assert.equal(res.status, 201, res.body?.message);
        assert.equal(res.body.data.userId, user.id);
        assert.notEqual(res.body.data.id, forcedId);
        assert.equal(res.body.data.completedAt, null);

        const row = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
        assert.equal(row?.role, "USER");
    });

    it("rejects invalid bodies and a preset status with 400", async () => {
        const user = await registerUser();
        const cases = [
            { title: "No deadline" },
            { title: "Done already", deadline: "2026-10-20", status: "DONE" },
            { title: { set: "x" }, deadline: "2026-10-20" },
        ];
        for (const body of cases) {
            const res = await request("POST", "/tasks", { token: user.accessToken, body });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
        }
    });

    it("requires authentication", async () => {
        const res = await request("POST", "/tasks", { body: { title: "x", deadline: "2026-10-20" } });
        assert.equal(res.status, 401);
    });
});

describe("GET /tasks", () => {
    it("lists only the caller's tasks, soonest deadline first, with filters", async () => {
        const user = await registerUser();
        const other = await registerUser();
        await createTask(user, { title: "Later", deadline: "2026-12-01" });
        const soon = await createTask(user, { title: "Soon", deadline: "2026-11-01" });
        await createTask(other, { title: "Not mine", deadline: "2026-11-15" });
        await setStatus(user, soon.id, "REVIEW");

        const all = await request("GET", "/tasks", { token: user.accessToken });
        assert.equal(all.status, 200);
        assert.deepEqual(all.body.data.map((t: any) => t.title), ["Soon", "Later"]);

        const inReview = await request("GET", "/tasks?status=REVIEW", { token: user.accessToken });
        assert.deepEqual(inReview.body.data.map((t: any) => t.title), ["Soon"]);

        const ranged = await request("GET", "/tasks?from=2026-11-15&to=2026-12-31", { token: user.accessToken });
        assert.deepEqual(ranged.body.data.map((t: any) => t.title), ["Later"]);
    });

    // Express 5's simple query parser turns status[not]=x into a literal "status[not]" key (ignored),
    // so repeated params are the only way to get a non-string here
    it("rejects repeated, unknown and invalid query params with 400", async () => {
        const user = await registerUser();
        for (const qs of ["status=PENDING&status=DONE", "status=LATER", "from=nope", "from=2026-12-01&to=2026-11-01"]) {
            const res = await request("GET", `/tasks?${qs}`, { token: user.accessToken });
            assert.equal(res.status, 400, qs);
            assert.equal(res.body.success, false);
        }
    });
});

describe("GET/PUT/DELETE /tasks/:id ownership", () => {
    it("returns 404 for unknown ids and 403 for another user's task", async () => {
        const owner = await registerUser();
        const intruder = await registerUser();
        const task = await createTask(owner);

        const missing = await request("GET", `/tasks/${randomUUID()}`, { token: owner.accessToken });
        assert.equal(missing.status, 404);

        for (const [method, path, body] of [
            ["GET", `/tasks/${task.id}`, undefined],
            ["PUT", `/tasks/${task.id}`, { title: "Hijacked" }],
            ["PUT", `/tasks/${task.id}/status`, { status: "REVIEW" }],
            ["DELETE", `/tasks/${task.id}`, undefined],
        ] as const) {
            const res = await request(method, path, { token: intruder.accessToken, body });
            assert.equal(res.status, 403, `${method} ${path}`);
        }

        const row = await prisma.task.findUnique({ where: { id: task.id } });
        assert.equal(row?.title, task.title);
        assert.equal(row?.status, "PENDING");
    });

    it("updates fields, rejects a status change, and deletes", async () => {
        const user = await registerUser();
        const task = await createTask(user);

        const updated = await request("PUT", `/tasks/${task.id}`, {
            token: user.accessToken,
            body: { title: "Renamed", description: null, deadline: "2026-11-05" },
        });
        assert.equal(updated.status, 200, updated.body?.message);
        assert.equal(updated.body.data.title, "Renamed");
        assert.equal(updated.body.data.deadline, "2026-11-05T00:00:00.000Z");

        const statusViaPut = await request("PUT", `/tasks/${task.id}`, { token: user.accessToken, body: { status: "DONE" } });
        assert.equal(statusViaPut.status, 400);

        const deleted = await request("DELETE", `/tasks/${task.id}`, { token: user.accessToken });
        assert.equal(deleted.status, 200);
        assert.deepEqual(deleted.body, { success: true, message: "Task deleted successfully" });
        assert.equal(await prisma.task.findUnique({ where: { id: task.id } }), null);
    });
});

describe("PUT /tasks/:id/status workflow", () => {
    it("moves PENDING -> REVIEW -> DONE and stamps the times", async () => {
        const user = await registerUser();
        const task = await createTask(user);

        const review = await setStatus(user, task.id, "REVIEW");
        assert.equal(review.status, 200, review.body?.message);
        assert.equal(review.body.data.status, "REVIEW");
        assert.notEqual(review.body.data.completedAt, null);

        const done = await setStatus(user, task.id, "DONE");
        assert.equal(done.status, 200, done.body?.message);
        assert.equal(done.body.data.status, "DONE");
        assert.notEqual(done.body.data.reviewedAt, null);
    });

    it("sends a reviewed task back to PENDING and clears completedAt", async () => {
        const user = await registerUser();
        const task = await createTask(user);
        await setStatus(user, task.id, "REVIEW");

        const back = await setStatus(user, task.id, "PENDING");
        assert.equal(back.status, 200, back.body?.message);
        assert.equal(back.body.data.status, "PENDING");
        assert.equal(back.body.data.completedAt, null);
    });

    it("rejects skipped, repeated and post-DONE transitions with 409", async () => {
        const user = await registerUser();
        const task = await createTask(user);

        assert.equal((await setStatus(user, task.id, "DONE")).status, 409);
        assert.equal((await setStatus(user, task.id, "PENDING")).status, 409);

        await setStatus(user, task.id, "REVIEW");
        await setStatus(user, task.id, "DONE");
        assert.equal((await setStatus(user, task.id, "REVIEW")).status, 409);
        assert.equal((await setStatus(user, task.id, "PENDING")).status, 409);

        const edit = await request("PUT", `/tasks/${task.id}`, { token: user.accessToken, body: { title: "Rewrite history" } });
        assert.equal(edit.status, 409);
    });
});

describe("GET /tasks/stats", () => {
    it("summarises the caller's tasks", async () => {
        const user = await registerUser();
        const other = await registerUser();
        const past = new Date(Date.now() - DAY).toISOString();

        // Overdue: PENDING with a passed deadline
        await createTask(user, { title: "Overdue", deadline: past });
        // Late: finished after its deadline
        const late = await createTask(user, { title: "Late", deadline: past });
        await setStatus(user, late.id, "REVIEW");
        // On time and reviewed
        const onTime = await createTask(user, { title: "On time" });
        await setStatus(user, onTime.id, "REVIEW");
        await setStatus(user, onTime.id, "DONE");
        // Another user's task must not count
        await createTask(other);

        const res = await request("GET", "/tasks/stats", { token: user.accessToken });
        assert.equal(res.status, 200, res.body?.message);
        assert.deepEqual(res.body.data, {
            total: 3,
            byStatus: { PENDING: 1, REVIEW: 1, DONE: 1 },
            overdue: 1,
            completedOnTime: 1,
            completedLate: 1,
            completionRate: 33,
            onTimeRate: 50,
        });
    });

    it("returns zeros for a user with no tasks", async () => {
        const user = await registerUser();
        const res = await request("GET", "/tasks/stats", { token: user.accessToken });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.total, 0);
        assert.equal(res.body.data.completionRate, 0);
        assert.equal(res.body.data.onTimeRate, 0);
    });
});
