"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { transaction } from "@/lib/db";

const assignmentModeByFormValue: Record<string, string> = {
  ROUND_ROBIN: "round_robin",
  PRIORITY: "priority",
  RANDOM: "random",
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getInteger(formData: FormData, key: string, fallback: number) {
  const value = Number.parseInt(getText(formData, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseTimeToMinute(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export async function createProject(formData: FormData) {
  const name = getText(formData, "name");
  const slug = normalizeSlug(getText(formData, "slug"));
  const hostIds = [
    ...new Set(formData.getAll("hostIds").map(String).filter(Boolean)),
  ];
  const weekdayValues = [
    ...new Set(
      formData
        .getAll("availabilityWeekdays")
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
    ),
  ];
  const startMinute = parseTimeToMinute(getText(formData, "availabilityStart"));
  const endMinute = parseTimeToMinute(getText(formData, "availabilityEnd"));

  if (!name || !slug || hostIds.length === 0 || weekdayValues.length === 0) {
    throw new Error("Project name, slug, hosts, and availability are required.");
  }

  if (startMinute === null || endMinute === null || startMinute >= endMinute) {
    throw new Error("Availability time range is invalid.");
  }

  const requestedAssignmentMode = getText(formData, "assignmentMode");
  const assignmentMode =
    assignmentModeByFormValue[requestedAssignmentMode] ?? "round_robin";
  const durationMinutes = getInteger(formData, "durationMinutes", 30);
  const bufferMinutes = getInteger(formData, "bufferMinutes", 10);

  await transaction(async (client) => {
    const projectResult = await client.query<{ id: string }>(
      `
        insert into projects (
          name, slug, description, assignment_mode, duration_minutes,
          booking_window_days, minimum_lead_hours, change_cutoff_hours,
          buffer_before_minutes, buffer_after_minutes, per_host_daily_limit,
          project_daily_limit, reminder_one_hour_enabled, is_active, main_color
        )
        values (
          $1, $2, $3, $4, $5,
          30, 24, 24,
          $6, $6, 6,
          18, true, true, $7
        )
        returning id
      `,
      [
        name,
        slug,
        getText(formData, "description") || null,
        assignmentMode,
        durationMinutes,
        bufferMinutes,
        getText(formData, "mainColor") || "#2257d6",
      ],
    );
    const projectId = projectResult.rows[0].id;

    for (const [index, userId] of hostIds.entries()) {
      await client.query(
        `
          insert into project_hosts (project_id, user_id, priority, is_active)
          values ($1, $2, $3, true)
        `,
        [projectId, userId, index + 1],
      );
    }

    for (const weekday of weekdayValues) {
      await client.query(
        `
          insert into project_availabilities (
            project_id, weekday, start_minute, end_minute
          )
          values ($1, $2, $3, $4)
        `,
        [projectId, weekday, startMinute, endMinute],
      );
    }

    const fields = [
      { key: "name", label: "Name", type: "text", isRequired: true },
      { key: "email", label: "Email", type: "email", isRequired: true },
      { key: "phone", label: "Phone", type: "tel", isRequired: false },
      { key: "note", label: "Message", type: "textarea", isRequired: false },
    ];

    for (const [index, field] of fields.entries()) {
      await client.query(
        `
          insert into form_fields (
            project_id, key, label, type, is_required, sort_order
          )
          values ($1, $2, $3, $4, $5, $6)
        `,
        [
          projectId,
          field.key,
          field.label,
          field.type,
          field.isRequired,
          index + 1,
        ],
      );
    }
  });

  revalidatePath("/admin");
  redirect("/admin");
}
