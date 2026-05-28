import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

type DbGlobal = typeof globalThis & {
  pgPool?: Pool;
  pgConnectionString?: string;
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

export function getPool() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error("DATABASE_URL or HYPERDRIVE binding is not set.");
  }

  const globalForDb = globalThis as DbGlobal;

  if (
    !globalForDb.pgPool ||
    globalForDb.pgConnectionString !== connectionString
  ) {
    globalForDb.pgPool = new Pool({ connectionString });
    globalForDb.pgConnectionString = connectionString;
  }

  return globalForDb.pgPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getPool().query<T>(text, values);
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
) {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
