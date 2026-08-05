import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved the database connection out of schema.prisma.
// The Prisma CLI (generate, migrate, studio) reads the connection from here.
// The app itself (src/config/prisma.ts) still reads DATABASE_URL directly
// via dotenv, since the running app and the CLI are separate processes.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
