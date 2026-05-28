import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { query, transaction } from "@/lib/db";

function redirectTo(request: NextRequest, path = "/admin/members") {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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
  const operation = getText(formData, "operation");
  const userId = getText(formData, "userId");

  if (!userId) {
    return redirectTo(request);
  }

  if (operation === "approve" || operation === "activate") {
    await query(
      `
        update users
        set status = 'active', updated_at = CURRENT_TIMESTAMP
        where id = $1
      `,
      [userId],
    );
  }

  if (operation === "disable") {
    await query(
      `
        update users
        set status = 'disabled', updated_at = CURRENT_TIMESTAMP
        where id = $1 and email <> 'ryohei0824@gmail.com'
      `,
      [userId],
    );
  }

  if (operation === "role") {
    const role = getText(formData, "role");
    if (["admin", "member"].includes(role)) {
      await query(
        `
          update users
          set role = $2::user_role, updated_at = CURRENT_TIMESTAMP
          where id = $1 and email <> 'ryohei0824@gmail.com'
        `,
        [userId, role],
      );
    }
  }

  if (operation === "delete") {
    await transaction(async (client) => {
      const userResult = await client.query<{ email: string }>(
        "select email from users where id = $1 limit 1",
        [userId],
      );
      const user = userResult.rows[0];

      if (!user || user.email === "ryohei0824@gmail.com") {
        return;
      }

      const ownerResult = await client.query<{ id: string }>(
        "select id from users where email = 'ryohei0824@gmail.com' limit 1",
      );
      const owner = ownerResult.rows[0];

      if (owner) {
        await client.query(
          "update bookings set host_id = $2, updated_at = CURRENT_TIMESTAMP where host_id = $1",
          [userId, owner.id],
        );
        await client.query(
          "update booking_status_history set changed_by_user_id = $2 where changed_by_user_id = $1",
          [userId, owner.id],
        );
      }

      await client.query("delete from project_hosts where user_id = $1", [userId]);
      await client.query("delete from user_availabilities where user_id = $1", [
        userId,
      ]);
      await client.query("delete from google_accounts where user_id = $1", [
        userId,
      ]);
      await client.query("delete from users where id = $1", [userId]);
    });
  }

  return redirectTo(request);
}
