import "server-only";

import { randomUUID } from "crypto";
import { query, transaction } from "@/lib/db";

type StoredGoogleAccountRow = {
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: Date | null;
};

const defaultOwnerEmails = ["ryohei0824@gmail.com"];

function getOwnerEmails() {
  return [
    ...defaultOwnerEmails,
    ...(process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ];
}

function isOwnerEmail(email: string) {
  return getOwnerEmails().includes(email.toLowerCase());
}

function storeToken(value: string | null | undefined) {
  return value ? `plain:${value}` : null;
}

function revealToken(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.startsWith("plain:") ? value.slice("plain:".length) : value;
}

export async function saveGoogleAccount(params: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  providerAccountId?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scopes?: string | null;
}) {
  if (!params.email || !params.providerAccountId) {
    return;
  }

  const email = params.email.toLowerCase();
  const isOwner = isOwnerEmail(email);
  const now = new Date();
  const tokenExpiresAt = params.expiresAt
    ? new Date(params.expiresAt * 1000)
    : null;

  try {
    await transaction(async (client) => {
      const userResult = await client.query<{ id: string }>(
        `
          insert into users (
            id, email, display_name, image_url, role, status, updated_at
          )
          values (
            $1,
            $2,
            $3,
            $4,
            case when $6 then 'admin'::user_role else 'member'::user_role end,
            case when $6 then 'active'::user_status else 'invited'::user_status end,
            $5
          )
          on conflict (email) do update
          set
            display_name = excluded.display_name,
            image_url = excluded.image_url,
            role = case when $6 then 'admin'::user_role else users.role end,
            status = case when $6 then 'active'::user_status else users.status end,
            updated_at = excluded.updated_at
          returning id
        `,
        [
          randomUUID(),
          email,
          params.name || email,
          params.image || null,
          now,
          isOwner,
        ],
      );
      const userId = userResult.rows[0].id;

      const existingResult = await client.query<StoredGoogleAccountRow>(
        `
          select access_token_encrypted, refresh_token_encrypted, token_expires_at
          from google_accounts
          where provider = 'google' and provider_account_id = $1
        `,
        [params.providerAccountId],
      );
      const existing = existingResult.rows[0];

      await client.query(
        `
          insert into google_accounts (
            id, user_id, provider, provider_account_id,
            access_token_encrypted, refresh_token_encrypted, token_expires_at,
            granted_scopes, updated_at
          )
          values ($1, $2, 'google', $3, $4, $5, $6, $7, $8)
          on conflict (provider, provider_account_id) do update
          set
            user_id = excluded.user_id,
            access_token_encrypted = coalesce(excluded.access_token_encrypted, google_accounts.access_token_encrypted),
            refresh_token_encrypted = coalesce(excluded.refresh_token_encrypted, google_accounts.refresh_token_encrypted),
            token_expires_at = coalesce(excluded.token_expires_at, google_accounts.token_expires_at),
            granted_scopes = coalesce(excluded.granted_scopes, google_accounts.granted_scopes),
            updated_at = excluded.updated_at
        `,
        [
          randomUUID(),
          userId,
          params.providerAccountId,
          storeToken(params.accessToken) ?? existing?.access_token_encrypted ?? null,
          storeToken(params.refreshToken) ?? existing?.refresh_token_encrypted ?? null,
          tokenExpiresAt ?? existing?.token_expires_at ?? null,
          params.scopes || null,
          now,
        ],
      );
    });
  } catch (error) {
    console.error("Failed to save Google account.", error);
  }
}

export async function getGoogleAccountTokensForUser(userId: string) {
  const result = await query<StoredGoogleAccountRow>(
    `
      select access_token_encrypted, refresh_token_encrypted, token_expires_at
      from google_accounts
      where user_id = $1 and provider = 'google'
      order by updated_at desc
      limit 1
    `,
    [userId],
  );
  const account = result.rows[0];

  if (!account) {
    return null;
  }

  return {
    accessToken: revealToken(account.access_token_encrypted),
    refreshToken: revealToken(account.refresh_token_encrypted),
    expiresAt: account.token_expires_at,
  };
}

export async function updateGoogleAccountTokens(params: {
  userId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: Date;
}) {
  await query(
    `
      update google_accounts
      set
        access_token_encrypted = $2,
        refresh_token_encrypted = coalesce($3, refresh_token_encrypted),
        token_expires_at = $4,
        updated_at = CURRENT_TIMESTAMP
      where user_id = $1 and provider = 'google'
    `,
    [
      params.userId,
      storeToken(params.accessToken),
      storeToken(params.refreshToken),
      params.expiresAt,
    ],
  );
}
