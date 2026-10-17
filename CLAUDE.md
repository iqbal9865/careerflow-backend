# CLAUDE.md

Guidance for AI coding agents working in this repository.

## Project overview

CareerFlow Backend is a REST API for tracking job applications. Users register, keep a profile, and create, read, update and delete their own job applications. They can also keep a to-do list of tasks with deadlines and track their progress. It has four feature modules: `auth`, `profile`, `application` and `task`.

## Technology stack

- **Runtime:** Node.js, ESM (`"type": "module"`)
- **Language:** TypeScript 5.9 with strict settings (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `module`/`moduleResolution: nodenext`)
- **Framework:** Express 5
- **ORM:** Prisma 7 with the `@prisma/adapter-pg` driver adapter on PostgreSQL
- **Auth:** `jsonwebtoken` (access and refresh tokens) and `bcrypt`
- **Dev runner:** `tsx watch`
- **Config:** `dotenv`. Prisma CLI settings live in `prisma.config.ts`, not in `schema.prisma`.

## Architecture

The code follows a modular MVC layout. A request goes through these steps:

```
server.ts (mounts routers under /api/v1)
  → <module>.route.ts       defines endpoints and chains middlewares
  → middlewares/*.ts        authMiddleware and validation middleware
  → <module>.controller.ts  reads req, calls the service, shapes the HTTP response
  → <module>.service.ts     business logic and all Prisma access; throws ApiError
  → lib/prisma.ts           shared PrismaClient
```

- `src/app.ts` creates the Express app and applies `cors()` and `express.json()`.
- `src/server.ts` loads env vars with `import "dotenv/config"`, mounts routes, adds a 404 fallback and calls `listen`. New routers are mounted here.

## Folder and module conventions

```
src/
  modules/<feature>/
    <feature>.route.ts        Express Router, default export
    <feature>.controller.ts   named exports: <action><Feature>Controller
    <feature>.service.ts      named exports: <action><Feature>Service
    <feature>.types.ts        <Feature>Input / <Feature>Output interfaces
  middlewares/<feature>.middleware.ts   validate<Action><Feature>Middleware wrappers
  validators/<feature>.validator.ts     validate<Action><Feature>Input functions (pure; they throw ApiError)
  utils/        ApiError.ts, jwt.ts
  lib/prisma.ts the PrismaClient singleton to import
  types/express.d.ts   augments Express.Request with userId
```

- Files are named `<feature>.<layer>.ts` in lowercase. Folder names are singular (`application`), while the route path is plural (`/applications`).
- **Relative imports must use the `.js` extension** (for example `import { prisma } from "../../lib/prisma.js"`), as `nodenext` ESM requires.
- **Use `import type` for type-only imports**, because `verbatimModuleSyntax` is on.
- Use named exports for controllers, services and validators. Use a default export for routers and `app`.
- Adding a feature means creating a new `src/modules/<feature>/` folder with all four files, a validator and a middleware wrapper, then mounting the router in `server.ts`.

## Database and Prisma conventions

- The schema is in `prisma/schema.prisma` and migrations are in `prisma/migrations/`. The datasource URL comes from `DATABASE_URL` through `prisma.config.ts`.
- Models are `User`, `RefreshToken`, `Profile`, `Skill`, `Application` and `Task`. Enums are `Role`, `ApplicationStatus`, `TaskStatus` and `Gender`.
- Model conventions:
  - Every primary key is `String @id @default(uuid())`.
  - Every model has `createdAt DateTime @default(now())`. Mutable models also have `updatedAt DateTime @updatedAt`.
  - Foreign keys are named `<relation>Id`, and every relation uses `onDelete: Cascade`.
  - Optional fields are nullable (`String?`).
- A `Profile` is created automatically when a user registers, so the user-to-profile relation is 1:1 (`userId @unique`).
- `Skill` exists in the schema, but no API uses it yet.
- **Import Prisma only from `src/lib/prisma.ts`.** Never create another `PrismaClient`.
- `lib/prisma.ts` logs queries only when `NODE_ENV=development`. Otherwise it logs warnings and errors only.
- Import enums and types from `@prisma/client`, for example `import { ApplicationStatus } from "@prisma/client"`.
- Schema changes:
  1. Edit `schema.prisma`.
  2. Run `npx prisma migrate dev --name <descriptive_name>`. This also regenerates the client.
  3. Never hand-edit an existing applied migration.
- `npm install` runs `prisma generate` through `postinstall`. Run `npm run prisma:generate` after pulling schema changes.
- **Writes go through an explicit field allowlist.** Each service that writes client data declares a `<FEATURE>_WRITABLE_FIELDS` constant (`as const satisfies readonly (keyof <Feature>Input)[]`) and passes `pickFields(data, <FEATURE>_WRITABLE_FIELDS)` (`src/utils/pickFields.ts`) to Prisma.
  - Never put `id`, `userId`, relation fields (`user`, `skills`) or timestamps in an allowlist.
  - Values the server controls (such as `userId` from `req.userId`) are added explicitly after the picked fields.
  - Never pass `req.body` or a spread of it to `create`/`update`/`upsert`, and never use a request value in a `where` without first checking its type.
- When returning `User` data, always use an explicit `select` (for example `{ id, fullName, email }`) so `password` can never leak.

## API conventions

- The base path is `/api/v1/<resource>`, with plural resource names.
- Current endpoints:
  - `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`. All are public, and refresh and logout take `refreshToken` (a non-empty string) in the body.
  - `PUT /auth/name` (protected) changes `fullName`. `PUT /auth/email` (protected) changes the email and requires `currentPassword`.
  - `GET` and `PUT /profile` (protected). `GET` also returns `user: { fullName, email }`. Name and email are login/account data: change them only through `/auth`, never through `PUT /profile`.
  - `POST` and `GET /applications`, and `GET`, `PUT` and `DELETE /applications/:id` (all protected)
  - Tasks (all protected):
    - `POST /tasks` takes `title`, `deadline` and an optional `description`. New tasks always start as `PENDING`, and sending `status` returns 400.
    - `GET /tasks` lists the user's tasks, soonest deadline first. Optional filters: `?status=` and a deadline range with `?from=` / `?to=`.
    - `GET /tasks/stats` returns `total`, `byStatus`, `overdue`, `completedOnTime`, `completedLate`, `completionRate` and `onTimeRate` (percentages, 0-100). It takes the same `from`/`to` filters.
    - `GET`, `PUT` and `DELETE /tasks/:id`. `PUT` edits `title`, `description` and `deadline` only, and returns 409 for a `DONE` task.
    - `PUT /tasks/:id/status` with `{ status }`. The only allowed moves are `PENDING → REVIEW` (sets `completedAt`), `REVIEW → DONE` (sets `reviewedAt`) and `REVIEW → PENDING` (clears `completedAt`). Any other move returns 409.
    - `/tasks/stats` is registered before `/tasks/:id` so `stats` isn't read as an id.
- REST verbs:
  - `POST` creates and returns `201`.
  - `GET`, `PUT` and `DELETE` return `200`.
  - Updates use `PUT` with partial-update semantics.
- **Response shape** (follow the `application` module, the most consistent one):
  - Success: `{ success: true, data: ... }`. Deletes return `{ success: true, message }` instead.
  - Error: `{ success: false, message }`
  - `auth` and `profile` currently return different shapes (`{ message, data }` and `{ profile }`). Don't change existing response shapes unless asked, because clients may depend on them.
- Path params are UUID strings, read as `const { id } = req.params as { id: string }`.

## Authentication and authorization

- On login or register, the server issues a short-lived access token (`ACCESS_TOKEN_SECRET`, default `15m`) and a refresh token (`REFRESH_TOKEN_SECRET`, default `30d`). Refresh tokens are stored in the `RefreshToken` table.
  - `/auth/refresh` checks that the token exists in the database and verifies its signature, then issues a new access token. It doesn't rotate the refresh token.
  - `/auth/logout` deletes the refresh token row.
- `authMiddleware` (`src/middlewares/auth.middleware.ts`) reads `Authorization: Bearer <token>`, verifies it and sets `req.userId`. Protected routes list it first in the middleware chain.
- Controllers on protected routes read `req.userId!`. The type comes from `src/types/express.d.ts`, so don't redeclare a local `AuthenticatedRequest` interface.
- **Ownership is enforced in the service layer.**
  - The pattern: fetch by id, throw `ApiError(404)` if the record is missing, throw `ApiError(403, "Forbidden")` if `record.userId !== userId`, then mutate.
  - Every query on user-owned data must be scoped to `userId`.
- Roles: `USER` and `ADMIN`. A user becomes `ADMIN` at registration if their email equals `ADMIN_EMAIL`. There is no role-based middleware yet.
- Passwords are hashed with `bcrypt` (10 salt rounds). Emails are lowercased and trimmed before storage and lookup.
- Changing login data (email, password) must require the current password. A wrong current password returns **400**, not 401, so clients don't treat it as an expired session.

## Validation and error handling

- Validation is hand-written. There is no Zod or Joi.
  - Pure functions in `src/validators/` take `data: unknown` and throw `new ApiError(400, "...")`.
  - A middleware in `src/middlewares/` wraps each validator in try/catch and returns `{ success: false, message }`.
  - Every request that has a body must have validation middleware on its route.
  - Use the same pattern for new validators.
- **Check the type of every field, not just its presence.** Start with `assertPlainObject(data)`, then use `assertStringField` / `assertDateField` from `src/validators/common.validator.ts` (`{ nullable: true }` for nullable columns). This stops objects such as `{ "set": ... }` or `{ "not": "" }` from reaching Prisma as nested writes or filter operators.
- For create validators, check required fields. For update validators, check only the fields that are `!== undefined`.
- Validate enums against `Object.values(<PrismaEnum>)`, after checking the value is a string.
- Unknown fields are ignored (the service allowlist drops them), not rejected.
- `ApiError(statusCode, message)` (`src/utils/ApiError.ts`) is the only error type for expected failures. Throw it from services and validators.
- **There is no global error-handling middleware.** Each controller wraps its body in try/catch and responds with `error.statusCode || 500` and `error.message`. New controllers must do the same, or you can add a central handler if asked.
- Express 5 forwards rejected promises from async handlers to `next`, but no error handler is registered, so always catch errors in the controller.

## Commands

Run all commands from the repository root.

| Purpose | Command |
|---|---|
| Install (also runs `prisma generate`) | `npm install` |
| Dev server with watch, port `PORT` or 5000 | `npm run dev` |
| Type-check (**run this after every change**) | `npx tsc --noEmit` |
| Build | `npm run build` |
| Create or apply a migration | `npx prisma migrate dev --name <name>` |
| Regenerate the Prisma client | `npm run prisma:generate` |
| Prisma GUI | `npx prisma studio` |

- **Tests:** none are set up yet. `npm test` is a placeholder that exits with code 1. Don't claim tests pass. If you add tests, ask which framework to use first (Vitest suits this ESM and TypeScript setup).
- **Linting and formatting:** there is no ESLint or Prettier config. `tsc` is the only static check. Match the formatting of the surrounding code: double quotes and semicolons are most common, indentation varies by file (2 or 4 spaces), so follow the file you're editing.
- `npm start` currently runs `tsx watch` (the same as `dev`), not the compiled build. `tsconfig.json` has no `outDir`, so `npm run build` writes `.js` files next to the sources. Prefer `tsc --noEmit` for checks.

## Environment variables

`PORT`, `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `ADMIN_EMAIL`, `NODE_ENV` (optional; `development` turns on Prisma query logging)

`.env` is git-ignored and must never be read, printed, or committed (see rule 1). The README mentions a `.env.example` file, but it doesn't exist yet. If one is added, it must contain variable names only, with no real values.

## Rules for AI agents

1. **Never read, print, or commit secret files.** This covers `.env`, `.env.*`, and any file holding credentials or keys (for example `*.pem`, `*.key`, service-account JSON). Don't open them, `cat` them, or add them to git, even to "check" a value. If you need to know which variables exist, use the variable list in this file or ask the user.
   - **Never log or print `DATABASE_URL`, access or refresh tokens, JWT secrets, or password hashes.** This applies to `console.log`, Prisma query logging, error messages and API responses.
   - Before committing, make sure no secret file or value is staged.
2. Keep the layers separate:
   - No Prisma calls in controllers or middleware.
   - No `req`/`res` in services.
   - Validation belongs in `validators/`.
3. Every query or mutation on user-owned data must check ownership by `userId`. Never trust a `userId` from the request body. Take it only from `req.userId`.
4. **Don't pass `req.body` straight into Prisma `create`/`update`.** Use the allowlist pattern described under "Database and Prisma conventions". Otherwise a client can overwrite `userId`, or use nested writes such as `user: { update: { role: "ADMIN" } }`.
5. Don't return the `password` field, or refresh tokens other than the ones just issued, in any response.
6. Use `.js` extensions on relative imports and `import type` for types. Keep `npx tsc --noEmit` passing with zero errors.
7. Schema changes go through a new Prisma migration. Never edit applied migrations or reset the database without asking.
8. Don't add dependencies (validation libraries, test frameworks, linters) without asking.
9. Don't change existing response shapes or status codes unless the task requires it, and tell the user when you do.
10. `README.md` is UTF-16 encoded. Keep that encoding if you edit it, or ask before converting it to UTF-8.
11. Keep changes small and in the style of the surrounding code. Don't refactor unrelated modules.

## Known issues (don't copy these patterns)

- Login returns different messages for an unknown email ("Invalid credentials") and a wrong password ("Wrong password"), which lets attackers find out which emails are registered.
- `PUT /auth/email` changes the email in one step, without verifying the new address, and there is no password-change endpoint yet. OTP email verification is planned for both but postponed, because no email provider is set up yet. Agreed design:
  - For an email change, send the OTP to the **new** address and a notice to the old one.
  - Store codes hashed, with a short expiry and an attempt limit.
  - Revoke all refresh tokens after the change.
  - Don't build this until the user provides an email provider.
- `GET /applications` has no pagination or filtering. It returns all of the user's applications, newest first.
