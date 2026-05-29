import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession, getCurrentAdminUser } from "@/lib/admin-auth";
import { deleteBookingCalendarEvent } from "@/lib/booking-calendar";
import { query, transaction } from "@/lib/db";

function redirectTo(request: NextRequest, path = "/admin/bookings") {
  const url = new URL(path, request.url);
  url.searchParams.set("t", String(Date.now()));
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function ensureAdmin(request: NextRequest) {
  const session = await getAdminSession();

  if (session.status === "unauthenticated") {
    return redirectTo(request, "/admin/login");
  }

  if (session.status === "pending") {
    return redirectTo(request, "/admin/pending");
  }

  if (session.status === "unauthorized") {
    return redirectTo(request, "/admin/unauthorized");
  }

  return null;
}

export async function POST(request: NextRequest) {
  const authRedirect = await ensureAdmin(request);
  if (authRedirect) {
    return authRedirect;
  }

  const user = await getCurrentAdminUser();
  const formData = await request.formData();
  const bookingId = getText(formData, "bookingId");

  if (!bookingId || !user) {
    return redirectTo(request);
  }

  const booking = await transaction(async (client) => {
    const bookingResult = await client.query<{
      id: string;
      host_id: string;
      status: string;
      calendar_id: string | null;
      google_event_id: string | null;
    }>(
      `
        select id, host_id, status, calendar_id, google_event_id
        from bookings
        where id = $1
        for update
      `,
      [bookingId],
    );
    const current = bookingResult.rows[0];

    if (!current || !["held", "confirmed", "unconfirmed"].includes(current.status)) {
      return null;
    }

    await client.query(
      `
        update bookings
        set
          status = 'cancelled',
          cancelled_at = CURRENT_TIMESTAMP,
          calendar_sync_status = case
            when google_event_id is null then calendar_sync_status
            else 'delete_pending'::calendar_sync_status
          end,
          updated_at = CURRENT_TIMESTAMP
        where id = $1
      `,
      [bookingId],
    );

    await client.query(
      `
        insert into booking_status_history (
          id, booking_id, from_status, to_status, changed_by_user_id, reason
        )
        values ($1, $2, $3::booking_status, 'cancelled', $4, $5)
      `,
      [
        randomUUID(),
        bookingId,
        current.status,
        user.id,
        "管理画面からキャンセル",
      ],
    );

    return current;
  });

  if (booking?.google_event_id) {
    const calendarDelete = await deleteBookingCalendarEvent({
      hostId: booking.host_id,
      calendarId: booking.calendar_id ?? "primary",
      eventId: booking.google_event_id,
    });

    if (calendarDelete.status === "deleted") {
      await query(
        `
          update bookings
          set
            google_event_id = null,
            google_meet_url = null,
            calendar_sync_status = 'not_created',
            updated_at = CURRENT_TIMESTAMP
          where id = $1
        `,
        [booking.id],
      );
    }
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return redirectTo(request);
}
