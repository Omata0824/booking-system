import "server-only";

import { hasDatabaseUrl, query } from "@/lib/db";

export type AdminProjectDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  assignmentMode: string;
  durationMinutes: number;
  bufferMinutes: number;
  mainColor: string;
  isActive: boolean;
  hostIds: string[];
  availabilityWeekdays: number[];
  availabilityStart: string;
  availabilityEnd: string;
  availabilities: Array<{
    weekday: number;
    start: string;
    end: string;
  }>;
  bookingsCount: number;
};

type ProjectDetailRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  assignment_mode: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  main_color: string | null;
  is_active: boolean;
  bookings_count: string;
};

type ProjectHostRow = {
  user_id: string;
};

type ProjectAvailabilityRow = {
  weekday: number;
  start_minute: number;
  end_minute: number;
};

function formatMinute(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export async function getAdminProjectDetail(
  slug: string,
): Promise<AdminProjectDetail | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const projectResult = await query<ProjectDetailRow>(
    `
      select
        p.id,
        p.name,
        p.slug,
        p.description,
        p.assignment_mode,
        p.duration_minutes,
        p.buffer_before_minutes,
        p.buffer_after_minutes,
        p.main_color,
        p.is_active,
        count(b.id)::text as bookings_count
      from projects p
      left join bookings b on b.project_id = p.id
      where p.slug = $1
      group by p.id
    `,
    [slug],
  );
  const project = projectResult.rows[0];

  if (!project) {
    return null;
  }

  const hostsResult = await query<ProjectHostRow>(
    `
      select user_id
      from project_hosts
      where project_id = $1 and is_active = true
      order by priority asc nulls last
    `,
    [project.id],
  );
  const availabilityResult = await query<ProjectAvailabilityRow>(
    `
      select weekday, start_minute, end_minute
      from project_availabilities
      where project_id = $1
      order by weekday asc, start_minute asc
    `,
    [project.id],
  );
  const firstAvailability = availabilityResult.rows[0];

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description ?? "",
    assignmentMode: project.assignment_mode,
    durationMinutes: project.duration_minutes,
    bufferMinutes: project.buffer_before_minutes,
    mainColor: project.main_color ?? "#0d9488",
    isActive: project.is_active,
    hostIds: hostsResult.rows.map((host) => host.user_id),
    availabilityWeekdays: availabilityResult.rows.map((item) => item.weekday),
    availabilityStart: firstAvailability
      ? formatMinute(firstAvailability.start_minute)
      : "10:00",
    availabilityEnd: firstAvailability
      ? formatMinute(firstAvailability.end_minute)
      : "20:00",
    availabilities: availabilityResult.rows.map((item) => ({
      weekday: item.weekday,
      start: formatMinute(item.start_minute),
      end: formatMinute(item.end_minute),
    })),
    bookingsCount: Number(project.bookings_count),
  };
}
