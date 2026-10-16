// Shared setup for integration tests. Runs against the local database from .env,
// so it never clears tables: every user it creates gets a unique itest-* email
// and is deleted by id in cleanup (cascade removes profile, applications, tokens).
import "dotenv/config";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import app from "../../src/app.js";
import authRoutes from "../../src/modules/auth/auth.route.js";
import profileRoutes from "../../src/modules/profile/profile.route.js";
import applicationRoutes from "../../src/modules/application/application.route.js";
import { prisma } from "../../src/lib/prisma.js";

// Same mounting as server.ts, without listen() on the real port
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/applications", applicationRoutes);
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

export { prisma };

export const TEST_PASSWORD = "Passw0rd!";
const runId = randomUUID().slice(0, 8);
const createdUserIds = new Set<string>();
let server: Server | undefined;
let baseUrl = "";
let emailCounter = 0;

export const uniqueEmail = (): string => `itest-${runId}-${++emailCounter}@careerflow.test`;

export const startServer = async (): Promise<void> => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
};

export const stopServer = async (): Promise<void> => {
    if (createdUserIds.size > 0) {
        await prisma.user.deleteMany({ where: { id: { in: [...createdUserIds] } } });
    }
    await prisma.$disconnect();
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
};

export interface ApiResponse {
    status: number;
    body: any;
}

export const request = async (
    method: string,
    path: string,
    options: { body?: unknown; token?: string; rawBody?: string } = {}
): Promise<ApiResponse> => {
    const headers: Record<string, string> = {};
    if (options.body !== undefined || options.rawBody !== undefined) headers["Content-Type"] = "application/json";
    if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

    const init: RequestInit = { method, headers };
    if (options.rawBody !== undefined) init.body = options.rawBody;
    else if (options.body !== undefined) init.body = JSON.stringify(options.body);

    const res = await fetch(`${baseUrl}${path}`, init);
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
};

export interface TestUser {
    id: string;
    email: string;
    fullName: string;
    accessToken: string;
    refreshToken: string;
}

export const registerUser = async (overrides: Record<string, unknown> = {}): Promise<TestUser> => {
    const email = uniqueEmail();
    const res = await request("POST", "/auth/register", {
        body: { fullName: "Integration Tester", email, password: TEST_PASSWORD, ...overrides },
    });
    if (res.status !== 201) throw new Error(`register failed with ${res.status}: ${res.body?.message}`);
    createdUserIds.add(res.body.data.id);
    return { ...res.body.data };
};

// For users created outside registerUser (e.g. a raw register call in a test)
export const trackUser = (id: string): void => {
    createdUserIds.add(id);
};
