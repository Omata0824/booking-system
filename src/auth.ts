import { getCloudflareContext } from "@opennextjs/cloudflare";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: "RefreshTokenError";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: "RefreshTokenError";
  }
}

type AuthEnv = {
  AUTH_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
};

async function getAuthEnv(): Promise<AuthEnv> {
  if (
    process.env.AUTH_SECRET &&
    process.env.AUTH_GOOGLE_ID &&
    process.env.AUTH_GOOGLE_SECRET
  ) {
    return process.env;
  }

  try {
    const context = await getCloudflareContext({ async: true });
    return context.env as AuthEnv;
  } catch {
    return process.env;
  }
}

async function refreshAccessToken(token: {
  refreshToken?: string;
  [key: string]: unknown;
}) {
  if (!token.refreshToken) {
    return { ...token, error: "RefreshTokenError" as const };
  }

  try {
    const env = await getAuthEnv();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.AUTH_GOOGLE_ID ?? "",
        client_secret: env.AUTH_GOOGLE_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });
    const refreshed = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
    };

    if (!response.ok || !refreshed.access_token || !refreshed.expires_in) {
      throw new Error("Google token refresh failed.");
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshed.expires_in),
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" as const };
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth(async () => {
  const env = await getAuthEnv();

  return {
    secret: env.AUTH_SECRET,
    trustHost: true,
    providers: [
      Google({
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
        authorization: {
          params: {
            access_type: "offline",
            prompt: "consent",
            scope:
              "openid email profile https://www.googleapis.com/auth/calendar",
          },
        },
      }),
    ],
    callbacks: {
      async jwt({ token, account }) {
        if (account) {
          return {
            ...token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
          };
        }

        if (token.expiresAt && Date.now() < (token.expiresAt - 60) * 1000) {
          return token;
        }

        return refreshAccessToken(token);
      },
      async session({ session, token }) {
        session.accessToken = token.accessToken;
        session.error = token.error;
        return session;
      },
    },
  };
});
