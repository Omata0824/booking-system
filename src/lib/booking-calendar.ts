import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  createMeetEventForBooking,
  GoogleCalendarError,
} from "@/lib/google-calendar";
import {
  getGoogleAccountTokensForUser,
  updateGoogleAccountTokens,
} from "@/lib/google-account-store";

type AuthEnv = {
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
};

export type BookingCalendarEventResult =
  | {
      status: "created";
      eventId: string;
      meetUrl: string | null;
      calendarUrl: string | null;
    }
  | { status: "not_connected" | "error"; error?: string };

async function getAuthEnv(): Promise<AuthEnv> {
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    return process.env;
  }

  try {
    const context = await getCloudflareContext({ async: true });
    return context.env as AuthEnv;
  } catch {
    return process.env;
  }
}

async function refreshAccessToken(refreshToken: string) {
  const env = await getAuthEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.AUTH_GOOGLE_ID ?? "",
      client_secret: env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!response.ok || !data.access_token || !data.expires_in) {
    throw new Error("Google access token refresh failed.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function createBookingCalendarEvent(params: {
  hostId: string;
  projectName: string;
  guestName: string;
  guestEmail: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<BookingCalendarEventResult> {
  const tokens = await getGoogleAccountTokensForUser(params.hostId);

  if (!tokens?.refreshToken) {
    return { status: "not_connected" };
  }

  try {
    const shouldRefresh =
      !tokens.accessToken ||
      !tokens.expiresAt ||
      tokens.expiresAt.getTime() <= Date.now() + 60 * 1000;
    const activeTokens = shouldRefresh
      ? await refreshAccessToken(tokens.refreshToken)
      : {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        };

    if (!activeTokens.accessToken) {
      return { status: "not_connected" };
    }

    if (shouldRefresh) {
      await updateGoogleAccountTokens({
        userId: params.hostId,
        accessToken: activeTokens.accessToken,
        refreshToken: activeTokens.refreshToken,
        expiresAt: activeTokens.expiresAt ?? new Date(Date.now() + 3600 * 1000),
      });
    }

    const event = await createMeetEventForBooking(activeTokens.accessToken, {
      summary: `${params.projectName} - ${params.guestName}様`,
      description: [
        "予約システムから自動作成された予定です。",
        "",
        `予約者: ${params.guestName}`,
        `メール: ${params.guestEmail}`,
      ].join("\n"),
      start: params.startsAt.toISOString(),
      end: params.endsAt.toISOString(),
      guestEmail: params.guestEmail,
      guestName: params.guestName,
    });

    return {
      status: "created",
      eventId: event.id,
      meetUrl: event.hangoutLink ?? null,
      calendarUrl: event.htmlLink ?? null,
    };
  } catch (error) {
    if (error instanceof GoogleCalendarError) {
      console.error("Google Calendar event creation failed.", error.message);
      return { status: "error", error: error.message };
    }

    console.error("Google Calendar event creation failed.", error);
    return { status: "error" };
  }
}
