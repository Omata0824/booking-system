import { auth } from "@/auth";
import {
  createMeetEvent,
  fetchFreeBusy,
  GoogleCalendarError,
} from "@/lib/google-calendar";

type EventRequest = {
  start?: string;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.accessToken || session.error === "RefreshTokenError") {
    return Response.json(
      { error: "Google にログインし直してください。" },
      { status: 401 },
    );
  }

  const body = (await request.json()) as EventRequest;
  const startDate = body.start ? new Date(body.start) : null;

  if (!startDate || Number.isNaN(startDate.getTime())) {
    return Response.json(
      { error: "有効な開始日時を指定してください。" },
      { status: 400 },
    );
  }

  if (startDate.getTime() <= Date.now()) {
    return Response.json(
      { error: "未来の日時を指定してください。" },
      { status: 400 },
    );
  }

  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  try {
    const freeBusy = await fetchFreeBusy(session.accessToken, start, end);
    const busy = freeBusy.calendars.primary?.busy ?? [];

    if (busy.length > 0) {
      return Response.json(
        { error: "この時間帯にはすでに予定があります。" },
        { status: 409 },
      );
    }

    const event = await createMeetEvent(session.accessToken, start, end);
    return Response.json({
      eventId: event.id,
      calendarUrl: event.htmlLink,
      meetUrl: event.hangoutLink,
      conferenceStatus:
        event.conferenceData?.createRequest?.status?.statusCode ?? "unknown",
    });
  } catch (error) {
    if (error instanceof GoogleCalendarError) {
      return Response.json(
        { error: "Google Calendar の予定作成に失敗しました。" },
        { status: error.status },
      );
    }
    throw error;
  }
}
