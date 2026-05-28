import "server-only";

import { hasDatabaseUrl, query } from "@/lib/db";

export type MemberListItem = {
  id: string;
  email: string;
  displayName: string;
  imageUrl: string | null;
  role: "admin" | "member";
  status: "invited" | "active" | "disabled";
  projectCount: number;
  assignedBookingCount: number;
  hasGoogleAccount: boolean;
  createdAt: string;
};

export type MemberSettings = {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  role: "admin" | "member";
  status: "invited" | "active" | "disabled";
  hasGoogleAccount: boolean;
  availabilities: Array<{
    weekday: number;
    startMinute: number;
    endMinute: number;
  }>;
};

type MemberRow = {
  id: string;
  email: string;
  display_name: string;
  image_url: string | null;
  role: "admin" | "member";
  status: "invited" | "active" | "disabled";
  project_count: string;
  assigned_booking_count: string;
  google_account_count: string;
  created_at: Date;
};

type SettingsRow = {
  id: string;
  email: string;
  display_name: string;
  timezone: string;
  role: "admin" | "member";
  status: "invited" | "active" | "disabled";
  google_account_count: string;
};

type AvailabilityRow = {
  weekday: number;
  start_minute: number;
  end_minute: number;
};

export async function getMembers(): Promise<MemberListItem[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const result = await query<MemberRow>(`
    select
      u.id,
      u.email,
      u.display_name,
      u.image_url,
      u.role,
      u.status,
      count(distinct ph.project_id)::text as project_count,
      count(distinct b.id)::text as assigned_booking_count,
      count(distinct ga.id)::text as google_account_count,
      u.created_at
    from users u
    left join project_hosts ph on ph.user_id = u.id and ph.is_active = true
    left join bookings b on b.host_id = u.id
    left join google_accounts ga on ga.user_id = u.id
    group by u.id
    having not (
      u.status = 'disabled'
      and count(distinct ph.project_id) = 0
    )
    order by
      case u.status
        when 'invited' then 0
        when 'active' then 1
        else 2
      end,
      case u.role when 'admin' then 0 else 1 end,
      u.display_name asc
  `);

  return result.rows.map((member) => ({
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    imageUrl: member.image_url,
    role: member.role,
    status: member.status,
    projectCount: Number(member.project_count),
    assignedBookingCount: Number(member.assigned_booking_count),
    hasGoogleAccount: Number(member.google_account_count) > 0,
    createdAt: member.created_at.toISOString(),
  }));
}

export async function getMemberSettings(userId: string): Promise<MemberSettings | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const userResult = await query<SettingsRow>(
    `
      select
        u.id,
        u.email,
        u.display_name,
        u.timezone,
        u.role,
        u.status,
        count(ga.id)::text as google_account_count
      from users u
      left join google_accounts ga on ga.user_id = u.id
      where u.id = $1
      group by u.id
      limit 1
    `,
    [userId],
  );
  const user = userResult.rows[0];

  if (!user) {
    return null;
  }

  const availabilityResult = await query<AvailabilityRow>(
    `
      select weekday, start_minute, end_minute
      from user_availabilities
      where user_id = $1
      order by weekday asc, start_minute asc
    `,
    [userId],
  );

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    timezone: user.timezone,
    role: user.role,
    status: user.status,
    hasGoogleAccount: Number(user.google_account_count) > 0,
    availabilities: availabilityResult.rows.map((availability) => ({
      weekday: availability.weekday,
      startMinute: availability.start_minute,
      endMinute: availability.end_minute,
    })),
  };
}
