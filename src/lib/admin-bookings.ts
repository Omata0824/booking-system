import "server-only";

import { hasDatabaseUrl, query } from "@/lib/db";

export type AdminBookingListItem = {
  id: string;
  projectName: string;
  projectSlug: string;
  hostName: string;
  status: string;
  statusLabel: string;
  startsAt: string;
  endsAt: string;
  guestName: string;
  guestEmail: string;
  company: string;
  note: string;
  googleMeetUrl: string | null;
  calendarSyncStatus: string;
  calendarSyncStatusLabel: string;
  createdAt: string;
};

type BookingRow = {
  id: string;
  project_name: string;
  project_slug: string;
  host_name: string;
  status: string;
  starts_at: Date;
  ends_at: Date;
  guest_name_encrypted: string;
  guest_email_encrypted: string;
  google_meet_url: string | null;
  calendar_sync_status: string;
  created_at: Date;
  company: string | null;
  note: string | null;
};

const bookingStatusLabels: Record<string, string> = {
  held: "仮押さえ",
  confirmed: "確定",
  cancelled: "キャンセル",
  rescheduled: "変更済み",
  completed: "完了",
  no_show: "不参加",
  unconfirmed: "未確定",
  failed: "失敗",
};

const calendarSyncStatusLabels: Record<string, string> = {
  not_created: "未作成",
  creating: "作成中",
  created: "作成済み",
  update_pending: "更新待ち",
  delete_pending: "削除待ち",
  error: "エラー",
};

function revealStoredValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.startsWith("plain:") ? value.slice("plain:".length) : value;
}

export async function getAdminBookings(): Promise<AdminBookingListItem[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const result = await query<BookingRow>(`
    select
      b.id,
      p.name as project_name,
      p.slug as project_slug,
      u.display_name as host_name,
      b.status,
      b.starts_at,
      b.ends_at,
      b.guest_name_encrypted,
      b.guest_email_encrypted,
      b.google_meet_url,
      b.calendar_sync_status,
      b.created_at,
      max(ba.value_encrypted) filter (where ba.field_key = 'company') as company,
      max(ba.value_encrypted) filter (where ba.field_key = 'note') as note
    from bookings b
    join projects p on p.id = b.project_id
    join users u on u.id = b.host_id
    left join booking_answers ba on ba.booking_id = b.id
    group by b.id, p.name, p.slug, u.display_name
    order by b.starts_at desc
    limit 100
  `);

  return result.rows.map((booking) => ({
    id: booking.id,
    projectName: booking.project_name,
    projectSlug: booking.project_slug,
    hostName: booking.host_name,
    status: booking.status,
    statusLabel: bookingStatusLabels[booking.status] ?? booking.status,
    startsAt: booking.starts_at.toISOString(),
    endsAt: booking.ends_at.toISOString(),
    guestName: revealStoredValue(booking.guest_name_encrypted),
    guestEmail: revealStoredValue(booking.guest_email_encrypted),
    company: revealStoredValue(booking.company),
    note: revealStoredValue(booking.note),
    googleMeetUrl: booking.google_meet_url,
    calendarSyncStatus: booking.calendar_sync_status,
    calendarSyncStatusLabel:
      calendarSyncStatusLabels[booking.calendar_sync_status] ??
      booking.calendar_sync_status,
    createdAt: booking.created_at.toISOString(),
  }));
}
