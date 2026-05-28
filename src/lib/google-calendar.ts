type TimePeriod = {
  start: string;
  end: string;
};

export type FreeBusyResponse = {
  timeMin: string;
  timeMax: string;
  calendars: Record<string, { busy: TimePeriod[]; errors?: unknown[] }>;
};

export class GoogleCalendarError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function calendarRequest<T>(
  accessToken: string,
  url: string,
  init: RequestInit,
) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new GoogleCalendarError(detail || response.statusText, response.status);
  }

  return (await response.json()) as T;
}

export function fetchFreeBusy(
  accessToken: string,
  timeMin: string,
  timeMax: string,
) {
  return calendarRequest<FreeBusyResponse>(
    accessToken,
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: "Asia/Tokyo",
        items: [{ id: "primary" }],
      }),
    },
  );
}

export function createMeetEvent(
  accessToken: string,
  start: string,
  end: string,
) {
  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  );
  url.searchParams.set("conferenceDataVersion", "1");
  url.searchParams.set("sendUpdates", "none");

  return calendarRequest<{
    id: string;
    htmlLink?: string;
    hangoutLink?: string;
    conferenceData?: {
      createRequest?: { status?: { statusCode?: string } };
    };
  }>(accessToken, url.toString(), {
    method: "POST",
    body: JSON.stringify({
      summary: "予約システム PoC 面談",
      description: "Google Calendar / Google Meet 連携検証で作成された予定です。",
      start: { dateTime: start, timeZone: "Asia/Tokyo" },
      end: { dateTime: end, timeZone: "Asia/Tokyo" },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }),
  });
}
