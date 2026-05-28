"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { query, transaction } from "@/lib/db";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function approveMember(formData: FormData) {
  await requireAdmin();

  const userId = getText(formData, "userId");
  if (!userId) {
    throw new Error("User id is required.");
  }

  await query(
    `
      update users
      set status = 'active', updated_at = CURRENT_TIMESTAMP
      where id = $1
    `,
    [userId],
  );

  revalidatePath("/admin/members");
  revalidatePath("/admin/projects/new");
  redirect("/admin/members");
}

export async function disableMember(formData: FormData) {
  await requireAdmin();

  const userId = getText(formData, "userId");
  if (!userId) {
    throw new Error("User id is required.");
  }

  await query(
    `
      update users
      set status = 'disabled', updated_at = CURRENT_TIMESTAMP
      where id = $1 and email <> 'ryohei0824@gmail.com'
    `,
    [userId],
  );

  revalidatePath("/admin/members");
  redirect("/admin/members");
}

export async function activateMember(formData: FormData) {
  await requireAdmin();

  const userId = getText(formData, "userId");
  if (!userId) {
    throw new Error("User id is required.");
  }

  await query(
    `
      update users
      set status = 'active', updated_at = CURRENT_TIMESTAMP
      where id = $1
    `,
    [userId],
  );

  revalidatePath("/admin/members");
  revalidatePath("/admin/projects/new");
  redirect("/admin/members");
}

export async function updateMemberRole(formData: FormData) {
  await requireAdmin();

  const userId = getText(formData, "userId");
  const role = getText(formData, "role");
  if (!userId || !["admin", "member"].includes(role)) {
    throw new Error("Role update is invalid.");
  }

  await query(
    `
      update users
      set role = $2::user_role, updated_at = CURRENT_TIMESTAMP
      where id = $1 and email <> 'ryohei0824@gmail.com'
    `,
    [userId, role],
  );

  revalidatePath("/admin/members");
  redirect("/admin/members");
}

export async function deleteMember(formData: FormData) {
  await requireAdmin();

  const userId = getText(formData, "userId");
  if (!userId) {
    throw new Error("User id is required.");
  }

  await transaction(async (client) => {
    const userResult = await client.query<{ email: string }>(
      "select email from users where id = $1 limit 1",
      [userId],
    );
    const user = userResult.rows[0];

    if (!user || user.email === "ryohei0824@gmail.com") {
      return;
    }

    const bookingResult = await client.query<{ count: string }>(
      "select count(*)::text as count from bookings where host_id = $1",
      [userId],
    );
    const bookingCount = Number(bookingResult.rows[0]?.count ?? 0);

    if (bookingCount > 0) {
      await client.query("delete from project_hosts where user_id = $1", [
        userId,
      ]);
      await client.query("delete from user_availabilities where user_id = $1", [
        userId,
      ]);
      await client.query("delete from google_accounts where user_id = $1", [
        userId,
      ]);
      await client.query(
        `
          update users
          set status = 'disabled', updated_at = CURRENT_TIMESTAMP
          where id = $1
        `,
        [userId],
      );
      return;
    }

    await client.query("delete from project_hosts where user_id = $1", [userId]);
    await client.query("delete from users where id = $1", [userId]);
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin/projects/new");
  revalidatePath("/admin");
  redirect("/admin/members");
}
