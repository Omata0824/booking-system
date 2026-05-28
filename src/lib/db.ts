import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Client, type QueryResultRow } from "pg";

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

function createClient() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error("DATABASE_URL or HYPERDRIVE binding is not set.");
  }

  return new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  });
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  const client = createClient();

  try {
    await client.connect();
    return await client.query<T>(text, values);
  } finally {
    await client.end();
  }
}

export async function transaction<T>(
  callback: (client: Client) => Promise<T>,
) {
  const client = createClient();

  try {
    await client.connect();
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}
