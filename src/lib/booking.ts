import "server-only";

import { createHash, randomUUID } from "crypto";
import {
  createBookingCalendarEvent,
  getHostCalendarBusyPeriods,
} from "@/lib/booking-calendar";
import { hasDatabaseUrl, query, transaction } from "@/lib/db";
import { mockProject } from "@/lib/mock-data";

const timezone = "Asia/Tokyo";
const jstOffsetMinutes = 9 * 60;
const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
const blockingStatuses = ["held", "confirmed", "unconfirmed"];

export type BookingSlot = {
  startIso: string;
  endIso: string;
  label: string;
  availableHostCount: number;
};

export type BookingDay = {
  dateKey: string;
  dayNumber: number;
  weekday: string;
  monthLabel: string;
  slots: BookingSlot[];
};

export type BookingPageProject = {
  id: string;
  name: string;
  slug: string;
  description: string;
  durationMinutes: number;
  color: string;
  hosts: string[];
  timezone: string;
  days: BookingDay[];
};

export type BookingResult = {
  bookingId: string;
  projectName: string;
  startsAt: string;
  endsAt: string;
  hostName: string;
  guestName: string;
  googleMeetUrl?: string | null;
  calendarSyncStatus?: string;
};

type JstDateParts = {
  year: number;
  month: number;
  day: number;
};

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  booking_window_days: number;
  minimum_lead_hours: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  main_color: string | null;
  is_active: boolean;
};

type AvailabilityRow = {
  weekday: number;
  start_minute: number;
  end_minute: number;
};

type HostRow = {
  user_id: string;
  display_name: string;
};

type BusyRow = {
  host_id: string;
  starts_at: Date;
  ends_at: Date;
};

type FormFieldRow = {
  id: string;
  key: string;
  label: string;
};

function getJstDateParts(date: Date): JstDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function addDays(parts: JstDateParts, days: number): JstDateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function toDateKey(parts: JstDateParts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getWeekday(parts: JstDateParts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function createDateFromJst(parts: JstDateParts, minuteOfDay: number) {
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 0, minuteOfDay - jstOffsetMinutes),
  );
}

function formatMinute(minute: number) {
  const hour = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function overlaps(start: Date, end: Date, busy: { starts_at: Date; ends_at: Date }) {
  return busy.starts_at < end && busy.ends_at > start;
}

function mockBookingPage(slug: string): BookingPageProject {
  const today = getJstDateParts(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const parts = addDays(today, index + 1);
    const weekday = getWeekday(parts);
    const isClosed = weekday === 0;
    const startMinute = 10 * 60;
    const endMinute = weekday === 6 ? 17 * 60 : 20 * 60;
    const slots = isClosed
      ? []
      : Array.from(
          { length: Math.max(0, Math.floor((endMinute - startMinute) / 60)) },
          (_, slotIndex) => {
            const start = startMinute + slotIndex * 60;
            const end = start + 60;
            return {
              startIso: createDateFromJst(parts, start).toISOString(),
              endIso: createDateFromJst(parts, end).toISOString(),
              label: `${formatMinute(start)} - ${formatMinute(end)}`,
              availableHostCount: 1,
            };
          },
        );

    return {
      dateKey: toDateKey(parts),
      dayNumber: parts.day,
      weekday: dayNames[weekday],
      monthLabel: `${parts.year}年${parts.month}月`,
      slots,
    };
  });

  return {
    id: "mock",
    name: mockProject.name,
    slug,
    description: mockProject.description,
    durationMinutes: mockProject.durationMinutes,
    color: mockProject.color,
    hosts: mockProject.hosts,
    timezone,
    days,
  };
}

export async function getBookingPageProject(
  slug: string,
): Promise<BookingPageProject | null> {
  if (!hasDatabaseUrl()) {
    return mockBookingPage(slug);
  }

  const projectResult = await query<ProjectRow>(
    `
      select id, name, slug, description, duration_minutes, booking_window_days,
        minimum_lead_hours, buffer_before_minutes, buffer_after_minutes,
        main_color, is_active
      from projects
      where slug = $1
    `,
    [slug],
  );
  const project = projectResult.rows[0];

  if (!project || !project.is_active) {
    return null;
  }

  const hostsResult = await query<HostRow>(
    `
      select ph.user_id, u.display_name
      from project_hosts ph
      join users u on u.id = ph.user_id
      where ph.project_id = $1 and ph.is_active = true
      order by ph.priority asc nulls last, u.display_name asc
    `,
    [project.id],
  );
  const hosts = hostsResult.rows;

  if (hosts.length === 0) {
    return null;
  }

  const availabilityResult = await query<AvailabilityRow>(
    `
      select weekday, start_minute, end_minute
      from project_availabilities
      where project_id = $1
      order by weekday asc, start_minute asc
    `,
    [project.id],
  );
  const now = new Date();
  const earliestStart = new Date(
    now.getTime() + project.minimum_lead_hours * 60 * 60 * 1000,
  );
  const today = getJstDateParts(now);
  const daysToGenerate = Math.min(project.booking_window_days, 21);
  const rangeEnd = createDateFromJst(addDays(today, daysToGenerate + 1), 0);
  const bookingsResult = await query<BusyRow>(
    `
      select host_id, starts_at, ends_at
      from bookings
      where project_id = $1
        and status = any($2::booking_status[])
        and starts_at < $3
        and ends_at > $4
    `,
    [project.id, blockingStatuses, rangeEnd, now],
  );
  const bookings = bookingsResult.rows;
  const googleBusyByHost = await getHostCalendarBusyPeriods(
    hosts.map((host) => host.user_id),
    now,
    rangeEnd,
  );

  const days = Array.from({ length: daysToGenerate }, (_, index) => {
    const parts = addDays(today, index);
    const weekday = getWeekday(parts);
    const availability = availabilityResult.rows.filter(
      (item) => item.weekday === weekday,
    );

    const slots = availability.flatMap((item) => {
      const entries: BookingSlot[] = [];
      for (
        let minute = item.start_minute;
        minute + project.duration_minutes <= item.end_minute;
        minute += project.duration_minutes
      ) {
        const start = createDateFromJst(parts, minute);
        const end = createDateFromJst(parts, minute + project.duration_minutes);

        if (start < earliestStart) {
          continue;
        }

        const availableHostCount = hosts.filter(
          (host) => {
            const googleBusy = googleBusyByHost.get(host.user_id) ?? [];
            return (
              !bookings.some(
              (booking) => booking.host_id === host.user_id && overlaps(start, end, booking),
              ) && !googleBusy.some((busy) => overlaps(start, end, busy))
            );
          },
        ).length;

        if (availableHostCount === 0) {
          continue;
        }

        entries.push({
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          label: `${formatMinute(minute)} - ${formatMinute(minute + project.duration_minutes)}`,
          availableHostCount,
        });
      }
      return entries;
    });

    return {
      dateKey: toDateKey(parts),
      dayNumber: parts.day,
      weekday: dayNames[weekday],
      monthLabel: `${parts.year}年${parts.month}月`,
      slots,
    };
  });

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description ?? "",
    durationMinutes: project.duration_minutes,
    color: project.main_color ?? "#2257d6",
    hosts: hosts.map((host) => host.display_name),
    timezone,
    days,
  };
}

export async function createBooking(params: {
  projectId: string;
  startIso: string;
  guestName: string;
  guestEmail: string;
  company?: string;
  comment?: string;
}): Promise<BookingResult> {
  const start = new Date(params.startIso);

  if (Number.isNaN(start.getTime())) {
    throw new Error("日時を正しく選択してください。");
  }

  const booking = await transaction(async (client) => {
    const projectResult = await client.query<ProjectRow>(
      `
        select id, name, slug, description, duration_minutes, booking_window_days,
          minimum_lead_hours, buffer_before_minutes, buffer_after_minutes,
          main_color, is_active
        from projects
        where id = $1
      `,
      [params.projectId],
    );
    const project = projectResult.rows[0];

    if (!project || !project.is_active) {
      throw new Error("この予約ページは現在利用できません。");
    }

    const hostsResult = await client.query<HostRow>(
      `
        select ph.user_id, u.display_name
        from project_hosts ph
        join users u on u.id = ph.user_id
        where ph.project_id = $1 and ph.is_active = true
        order by ph.priority asc nulls last, u.display_name asc
      `,
      [project.id],
    );
    const hosts = hostsResult.rows;

    if (hosts.length === 0) {
      throw new Error("この予約ページは現在利用できません。");
    }

    const end = new Date(start.getTime() + project.duration_minutes * 60 * 1000);
    const conflictResult = await client.query<{ host_id: string }>(
      `
        select host_id
        from bookings
        where project_id = $1
          and status = any($2::booking_status[])
          and starts_at < $3
          and ends_at > $4
      `,
      [project.id, blockingStatuses, end, start],
    );
    const googleBusyByHost = await getHostCalendarBusyPeriods(
      hosts.map((candidate) => candidate.user_id),
      start,
      end,
    );
    const host = hosts.find(
      (candidate) => {
        const googleBusy = googleBusyByHost.get(candidate.user_id) ?? [];
        return (
          !conflictResult.rows.some(
            (booking) => booking.host_id === candidate.user_id,
          ) && !googleBusy.some((busy) => overlaps(start, end, busy))
        );
      },
    );

    if (!host) {
      throw new Error("選択した時間は埋まりました。別の時間を選択してください。");
    }

    const bookingResult = await client.query<{
      id: string;
      starts_at: Date;
      ends_at: Date;
    }>(
      `
        insert into bookings (
          id, project_id, host_id, status, starts_at, ends_at,
          blocked_starts_at, blocked_ends_at, timezone,
          guest_name_encrypted, guest_email_encrypted, guest_email_lookup_hash,
          management_token_hash, idempotency_key, calendar_sync_status,
          updated_at
        )
        values (
          $1, $2, $3, 'confirmed', $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, 'not_created',
          CURRENT_TIMESTAMP
        )
        returning id, starts_at, ends_at
      `,
      [
        randomUUID(),
        project.id,
        host.user_id,
        start,
        end,
        new Date(start.getTime() - project.buffer_before_minutes * 60 * 1000),
        new Date(end.getTime() + project.buffer_after_minutes * 60 * 1000),
        timezone,
        `plain:${params.guestName}`,
        `plain:${params.guestEmail}`,
        createHash("sha256").update(params.guestEmail.toLowerCase()).digest("hex"),
        createHash("sha256").update(randomUUID()).digest("hex"),
        randomUUID(),
      ],
    );
    const booking = bookingResult.rows[0];
    const fieldsResult = await client.query<FormFieldRow>(
      `
        select id, key, label
        from form_fields
        where project_id = $1
      `,
      [project.id],
    );
    const answers = [
      ["company", "会社名", params.company ?? ""],
      ["name", "氏名", params.guestName],
      ["email", "メールアドレス", params.guestEmail],
      ["note", "相談内容", params.comment ?? ""],
    ];

    for (const [key, label, value] of answers) {
      const field = fieldsResult.rows.find((item) => item.key === key);
      if (!field || !value) {
        continue;
      }

      await client.query(
        `
          insert into booking_answers (
            id, booking_id, form_field_id, field_key, field_label, value_encrypted
          )
          values ($1, $2, $3, $4, $5, $6)
        `,
        [randomUUID(), booking.id, field.id, field.key, label, `plain:${value}`],
      );
    }

    return {
      bookingId: booking.id,
      hostId: host.user_id,
      projectName: project.name,
      startsAt: booking.starts_at.toISOString(),
      endsAt: booking.ends_at.toISOString(),
      hostName: host.display_name,
      guestName: params.guestName,
    };
  });

  const calendarEvent = await createBookingCalendarEvent({
    hostId: booking.hostId,
    projectName: booking.projectName,
    guestName: params.guestName,
    guestEmail: params.guestEmail,
    startsAt: new Date(booking.startsAt),
    endsAt: new Date(booking.endsAt),
  });

  if (calendarEvent.status === "created") {
    await query(
      `
        update bookings
        set
          google_event_id = $2,
          google_meet_url = $3,
          calendar_id = 'primary',
          calendar_sync_status = 'created',
          updated_at = CURRENT_TIMESTAMP
        where id = $1
      `,
      [booking.bookingId, calendarEvent.eventId, calendarEvent.meetUrl],
    );
  } else if (calendarEvent.status === "error") {
    await query(
      `
        update bookings
        set calendar_sync_status = 'error', updated_at = CURRENT_TIMESTAMP
        where id = $1
      `,
      [booking.bookingId],
    );
  }

  return {
    bookingId: booking.bookingId,
    projectName: booking.projectName,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    hostName: booking.hostName,
    guestName: booking.guestName,
    googleMeetUrl:
      calendarEvent.status === "created" ? calendarEvent.meetUrl : null,
    calendarSyncStatus: calendarEvent.status,
  };
}
