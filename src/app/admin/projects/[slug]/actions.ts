"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { query, transaction } from "@/lib/db";

const assignmentModeByFormValue: Record<string, string> = {
  round_robin: "round_robin",
  priority: "priority",
  random: "random",
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

function parseAvailabilities(formData: FormData, weekdays: number[]) {
  return weekdays.map((weekday) => {
    const startMinute = parseTimeToMinute(
      getText(formData, `availabilityStart_${weekday}`),
    );
    const endMinute = parseTimeToMinute(
      getText(formData, `availabilityEnd_${weekday}`),
    );

    if (startMinute === null || endMinute === null || startMinute >= endMinute) {
      return null;
    }

    return { weekday, startMinute, endMinute };
  });
}

export async function updateProject(formData: FormData) {
  await requireAdmin();

  const projectId = getText(formData, "projectId");
  const currentSlug = getText(formData, "currentSlug");
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
  const availabilities = parseAvailabilities(formData, weekdayValues);

  if (!projectId || !currentSlug || !name || !slug || hostIds.length === 0) {
    throw new Error("Project id, name, slug, and hosts are required.");
  }

  if (weekdayValues.length === 0) {
    throw new Error("At least one availability weekday is required.");
  }

  if (availabilities.some((availability) => availability === null)) {
    throw new Error("Availability time range is invalid.");
  }

  const assignmentMode =
    assignmentModeByFormValue[getText(formData, "assignmentMode")] ??
    "round_robin";
  const durationMinutes = getInteger(formData, "durationMinutes", 30);
  const bufferMinutes = getInteger(formData, "bufferMinutes", 10);
  const isActive = getText(formData, "isActive") === "on";

  await transaction(async (client) => {
    await client.query(
      `
        update projects
        set
          name = $2,
          slug = $3,
          description = $4,
          assignment_mode = $5,
          duration_minutes = $6,
          buffer_before_minutes = $7,
          buffer_after_minutes = $7,
          main_color = $8,
          is_active = $9,
          updated_at = CURRENT_TIMESTAMP
        where id = $1
      `,
      [
        projectId,
        name,
        slug,
        getText(formData, "description") || null,
        assignmentMode,
        durationMinutes,
        bufferMinutes,
        getText(formData, "mainColor") || "#0d9488",
        isActive,
      ],
    );

    await client.query("delete from project_hosts where project_id = $1", [
      projectId,
    ]);
    for (const [index, userId] of hostIds.entries()) {
      await client.query(
        `
          insert into project_hosts (id, project_id, user_id, priority, is_active)
          values ($1, $2, $3, $4, true)
        `,
        [randomUUID(), projectId, userId, index + 1],
      );
    }

    await client.query(
      "delete from project_availabilities where project_id = $1",
      [projectId],
    );
    for (const availability of availabilities) {
      if (!availability) {
        continue;
      }

      await client.query(
        `
          insert into project_availabilities (
            id, project_id, weekday, start_minute, end_minute
          )
          values ($1, $2, $3, $4, $5)
        `,
        [
          randomUUID(),
          projectId,
          availability.weekday,
          availability.startMinute,
          availability.endMinute,
        ],
      );
    }
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/projects/${currentSlug}`);
  revalidatePath(`/book/${currentSlug}`);
  revalidatePath(`/book/${slug}`);
  redirect(`/admin/projects/${slug}`);
}

export async function deleteProject(formData: FormData) {
  await requireAdmin();

  const projectId = getText(formData, "projectId");
  const currentSlug = getText(formData, "currentSlug");

  if (!projectId || !currentSlug) {
    throw new Error("Project id is required.");
  }

  const bookingResult = await query<{ count: string }>(
    "select count(*)::text as count from bookings where project_id = $1",
    [projectId],
  );
  const bookingCount = Number(bookingResult.rows[0]?.count ?? 0);

  if (bookingCount > 0) {
    await query(
      `
        update projects
        set is_active = false, updated_at = CURRENT_TIMESTAMP
        where id = $1
      `,
      [projectId],
    );
  } else {
    await query("delete from projects where id = $1", [projectId]);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/projects/${currentSlug}`);
  revalidatePath(`/book/${currentSlug}`);
  redirect("/admin");
}
