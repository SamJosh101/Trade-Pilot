import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env";

// Prisma 7 removed the built-in connection engine — PrismaClient now must be
// constructed with an explicit driver adapter. This is the node-postgres
// (`pg`) adapter, matching the `postgresql` datasource in schema.prisma.
// The Prisma CLI (migrate/studio) instead reads its connection from
// prisma.config.ts — the two are separate processes with separate config.
const adapter = new PrismaPg({ connectionString: env.databaseUrl });

// Single shared Prisma instance for the whole app.
// Prevents exhausting the Postgres connection pool with multiple clients.
const prisma = new PrismaClient({ adapter });

export default prisma;
