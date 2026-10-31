import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, registerUser, request, startServer, stopServer } from "./helpers.js";

before(startServer);
after(stopServer);

describe("GET /profile", () => {
    it("returns the user's profile with fullName and email, never the password", async () => {
        const user = await registerUser();
        const res = await request("GET", "/profile", { token: user.accessToken });
        assert.equal(res.status, 200, res.body?.message);
        assert.equal(res.body.profile.userId, user.id);
        assert.deepEqual(res.body.profile.user, { fullName: user.fullName, email: user.email });
        assert.equal(JSON.stringify(res.body).includes("password"), false);
    });

    it("requires authentication", async () => {
        const res = await request("GET", "/profile");
        assert.equal(res.status, 401);
    });
});

describe("PUT /profile", () => {
    it("updates allowed fields and they persist", async () => {
        const user = await registerUser();
        const res = await request("PUT", "/profile", {
            token: user.accessToken,
            body: { bio: "Backend developer who likes APIs", city: "Dhaka", githubUrl: "https://github.com/jane" },
        });
        assert.equal(res.status, 200, res.body?.message);
        assert.equal(res.body.profile.bio, "Backend developer who likes APIs");

        const after = await request("GET", "/profile", { token: user.accessToken });
        assert.equal(after.body.profile.city, "Dhaka");
        assert.equal(after.body.profile.githubUrl, "https://github.com/jane");
    });

    it("clears a field with null", async () => {
        const user = await registerUser();
        await request("PUT", "/profile", { token: user.accessToken, body: { city: "Dhaka" } });
        const res = await request("PUT", "/profile", { token: user.accessToken, body: { city: null } });
        assert.equal(res.status, 200, res.body?.message);
        assert.equal(res.body.profile.city, null);
    });

    it("ignores userId, nested user writes, and name/email changes", async () => {
        const user = await registerUser();
        const victim = await registerUser();
        const res = await request("PUT", "/profile", {
            token: user.accessToken,
            body: {
                city: "Dhaka",
                userId: victim.id,
                user: { update: { role: "ADMIN", fullName: "Hacked" } },
                fullName: "Hacked",
                email: "hacked@example.com",
            },
        });
        assert.equal(res.status, 200, res.body?.message);
        assert.equal(res.body.profile.userId, user.id);

        const row = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, fullName: true, email: true },
        });
        assert.deepEqual(row, { role: "USER", fullName: user.fullName, email: user.email });

        const victimProfile = await prisma.profile.findUnique({ where: { userId: victim.id } });
        assert.equal(victimProfile?.city, null, "another user's profile is untouched");
    });

    it("rejects invalid values with 400 and { success: false }", async () => {
        const user = await registerUser();
        for (const body of [{ bio: "short" }, { bio: { set: "x" } }, { linkedinUrl: "https://evil.example" }]) {
            const res = await request("PUT", "/profile", { token: user.accessToken, body });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
        }
    });

    it("requires authentication", async () => {
        const res = await request("PUT", "/profile", { body: { city: "Dhaka" } });
        assert.equal(res.status, 401);
    });
});
