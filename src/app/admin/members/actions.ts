"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";

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
}
