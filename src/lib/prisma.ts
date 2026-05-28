import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
  prismaPool?: Pool;
  prismaConnectionString?: string;
};

type CloudflareContextWithHyperdrive = {
  env?: {
    HYPERDRIVE?: {
      connectionString?: string;
    };
  };
};

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  try {
    const context = getCloudflareContext() as CloudflareContextWithHyperdrive;
    return context.env?.HYPERDRIVE?.connectionString;
  } catch {
    return undefined;
  }
}

export function hasDatabaseUrl() {
  return Boolean(getDatabaseUrl());
}

export function getPrisma() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const globalForPrisma = globalThis as PrismaGlobal;

  if (
    !globalForPrisma.prisma ||
    globalForPrisma.prismaConnectionString !== connectionString
  ) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    globalForPrisma.prismaPool = pool;
    globalForPrisma.prisma = new PrismaClient({ adapter });
    globalForPrisma.prismaConnectionString = connectionString;
  }

  return globalForPrisma.prisma;
}
