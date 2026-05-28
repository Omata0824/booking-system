import { auth } from "@/auth";
import { fetchFreeBusy, GoogleCalendarError } from "@/lib/google-calendar";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken || session.error === "RefreshTokenError") {
    return Response.json(
      { error: "Google にログインし直してください。" },
      { status: 401 },
    );
  }

  const timeMin = new Date();
  const timeMax = new Date(timeMin.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    const availability = await fetchFreeBusy(
      session.accessToken,
      timeMin.toISOString(),
      timeMax.toISOString(),
    );
    return Response.json(availability);
  } catch (error) {
    if (error instanceof GoogleCalendarError) {
      return Response.json(
        { error: "Google Calendar の空き時間取得に失敗しました。" },
        { status: error.status },
      );
    }
    throw error;
  }
}
