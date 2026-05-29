import "server-only";

import { createHash, randomUUID } from "crypto";
import { deleteBookingCalendarEvent } from "@/lib/booking-calendar";
import { sendBookingCancelledEmails } from "@/lib/booking-email";
import { query, transaction } from "@/lib/db";

const cancellableStatuses = ["held", "confirmed", "unconfirmed"];

export type ManagedBooking = {
  id: string;
  projectName: string;
  projectSlug: string;
  hostId: string;
  hostName: string;
  hostEmail: string | null;
  guestName: string;
  guestEmail: string;
  startsAt: string;
  endsAt: string;
  status: string;
  canCancel: boolean;
  cutoffAt: string;
};

type ManagedBookingRow = {
  id: string;
  project_name: string;
  project_slug: string;
  change_cutoff_hours: number;
  host_id: string;
  host_name: string;
  host_email: string | null;
  guest_name_encrypted: string;
  guest_email_encrypted: string;
  starts_at: Date;
  ends_at: Date;
  status: string;
};

type CancelBookingRow = ManagedBookingRow & {
  calendar_id: string | null;
  google_event_id: string | null;
};

function hashManagementToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function revealStoredValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.startsWith("plain:") ? value.slice("plain:".length) : value;
}

function mapBooking(row: ManagedBookingRow): ManagedBooking {
  const cutoffAt = new Date(
    row.starts_at.getTime() - row.change_cutoff_hours * 60 * 60 * 1000,
  );

  return {
    id: row.id,
    projectName: row.project_name,
    projectSlug: row.project_slug,
    hostId: row.host_id,
    hostName: row.host_name,
    hostEmail: row.host_email,
    guestName: revealStoredValue(row.guest_name_encrypted),
    guestEmail: revealStoredValue(row.guest_email_encrypted),
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    status: row.status,
    canCancel:
      cancellableStatuses.includes(row.status) && Date.now() < cutoffAt.getTime(),
    cutoffAt: cutoffAt.toISOString(),
  };
}

async function getManagedBookingByHash(
  managementTokenHash: string,
  forUpdate = false,
) {
  const result = await query<CancelBookingRow>(
    `
      select
        b.id,
        p.name as project_name,
        p.slug as project_slug,
        p.change_cutoff_hours,
        b.host_id,
        u.display_name as host_name,
        u.email as host_email,
        b.guest_name_encrypted,
        b.guest_email_encrypted,
        b.starts_at,
        b.ends_at,
        b.status,
        b.calendar_id,
        b.google_event_id
      from bookings b
      join projects p on p.id = b.project_id
      join users u on u.id = b.host_id
      where b.management_token_hash = $1
      ${forUpdate ? "for update of b" : ""}
    `,
    [managementTokenHash],
  );

  return result.rows[0] ?? null;
}

export async function getManagedBooking(token: string) {
  if (!token) {
    return null;
  }

  const booking = await getManagedBookingByHash(hashManagementToken(token));
  return booking ? mapBooking(booking) : null;
}

export async function cancelManagedBooking(token: string) {
  if (!token) {
    return { status: "not_found" as const };
  }

  const managementTokenHash = hashManagementToken(token);
  const result = await transaction(async (client) => {
    const result = await client.query<CancelBookingRow>(
      `
        select
          b.id,
          p.name as project_name,
          p.slug as project_slug,
          p.change_cutoff_hours,
          b.host_id,
          u.display_name as host_name,
          u.email as host_email,
          b.guest_name_encrypted,
          b.guest_email_encrypted,
          b.starts_at,
          b.ends_at,
          b.status,
          b.calendar_id,
          b.google_event_id
        from bookings b
        join projects p on p.id = b.project_id
        join users u on u.id = b.host_id
        where b.management_token_hash = $1
        for update of b
      `,
      [managementTokenHash],
    );
    const current = result.rows[0];

    if (!current) {
      return null;
    }

    if (current.status === "cancelled") {
      return { booking: current, changed: false };
    }

    if (!cancellableStatuses.includes(current.status)) {
      return { booking: current, changed: false };
    }

    const cutoffAt = new Date(
      current.starts_at.getTime() - current.change_cutoff_hours * 60 * 60 * 1000,
    );

    if (Date.now() >= cutoffAt.getTime()) {
      return { booking: current, changed: false };
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
      [current.id],
    );

    await client.query(
      `
        insert into booking_status_history (
          id, booking_id, from_status, to_status, changed_by_user_id, reason
        )
        values ($1, $2, $3::booking_status, 'cancelled', null, $4)
      `,
      [randomUUID(), current.id, current.status, "Cancelled by participant"],
    );

    return { booking: { ...current, status: "cancelled" }, changed: true };
  });

  if (!result) {
    return { status: "not_found" as const };
  }

  const mapped = mapBooking(result.booking);

  if (!result.changed) {
    if (result.booking.status === "cancelled") {
      return { status: "already_cancelled" as const, booking: mapped };
    }

    return mapped.canCancel
      ? { status: "not_cancelled" as const, booking: mapped }
      : { status: "past_cutoff" as const, booking: mapped };
  }

  if (result.booking.google_event_id) {
    const calendarDelete = await deleteBookingCalendarEvent({
      hostId: result.booking.host_id,
      calendarId: result.booking.calendar_id ?? "primary",
      eventId: result.booking.google_event_id,
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
        [result.booking.id],
      );
    }
  }

  await sendBookingCancelledEmails({
    cancelledBy: "participant",
    projectName: mapped.projectName,
    projectSlug: mapped.projectSlug,
    startsAt: mapped.startsAt,
    endsAt: mapped.endsAt,
    hostName: mapped.hostName,
    hostEmail: mapped.hostEmail,
    guestName: mapped.guestName,
    guestEmail: mapped.guestEmail,
  });

  return { status: "cancelled" as const, booking: mapped };
}
