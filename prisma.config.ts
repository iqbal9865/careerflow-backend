// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";
import process from "process";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    ...(process.env.DATABASE_URL && { url: process.env.DATABASE_URL }),
  },
});