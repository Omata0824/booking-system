import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { transaction } from "@/lib/db";

const assignmentModeByFormValue: Record<string, string> = {
  round_robin: "round_robin",
  priority: "priority",
  random: "random",
  ROUND_ROBIN: "round_robin",
  PRIORITY: "priority",
  RANDOM: "random",
};

function redirectTo(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

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

  const formData = await request.formData();
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
    return redirectTo(request, `/admin/projects/${currentSlug}?error=invalid`);
  }

  if (
    weekdayValues.length === 0 ||
    availabilities.some((availability) => availability === null)
  ) {
    return redirectTo(request, `/admin/projects/${currentSlug}?error=availability`);
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
  revalidatePath(`/admin/projects/${slug}`);
  revalidatePath(`/book/${currentSlug}`);
  revalidatePath(`/book/${slug}`);

  return redirectTo(request, `/admin/projects/${slug}?saved=1&t=${Date.now()}`);
}
