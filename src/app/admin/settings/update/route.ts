import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { transaction } from "@/lib/db";

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

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return redirectTo(request, "/admin/login");
  }

  const user = await getCurrentAdminUser();

  if (!user || user.status === "disabled") {
    return redirectTo(request, "/admin/unauthorized");
  }

  if (user.status === "invited") {
    return redirectTo(request, "/admin/pending");
  }

  const formData = await request.formData();
  const displayName = getText(formData, "displayName");
  const timezone = getText(formData, "timezone") || "Asia/Tokyo";
  const weekdays = [
    ...new Set(
      formData
        .getAll("availabilityWeekdays")
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
    ),
  ];

  if (!displayName || weekdays.length === 0) {
    return redirectTo(request, "/admin/settings?error=invalid");
  }

  const availabilities = weekdays.map((weekday) => {
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

  if (availabilities.some((availability) => availability === null)) {
    return redirectTo(request, "/admin/settings?error=invalid");
  }

  await transaction(async (client) => {
    await client.query(
      `
        update users
        set display_name = $2, timezone = $3, updated_at = CURRENT_TIMESTAMP
        where id = $1
      `,
      [user.id, displayName, timezone],
    );

    await client.query("delete from user_availabilities where user_id = $1", [
      user.id,
    ]);

    for (const availability of availabilities) {
      if (!availability) {
        continue;
      }

      await client.query(
        `
          insert into user_availabilities (
            id, user_id, weekday, start_minute, end_minute
          )
          values ($1, $2, $3, $4, $5)
        `,
        [
          randomUUID(),
          user.id,
          availability.weekday,
          availability.startMinute,
          availability.endMinute,
        ],
      );
    }
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/members");

  return redirectTo(request, `/admin/settings?saved=1&t=${Date.now()}`);
}
