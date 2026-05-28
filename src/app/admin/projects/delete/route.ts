import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function POST(request: NextRequest) {
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

  const formData = await request.formData();
  const projectId = getText(formData, "projectId");

  if (!projectId) {
    return redirectTo(request, "/admin");
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

  return redirectTo(request, "/admin");
}
