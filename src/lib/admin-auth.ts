import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasDatabaseUrl, query } from "@/lib/db";

export type AdminUserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "member";
  status: "invited" | "active" | "disabled";
};

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "member";
  status: "invited" | "active" | "disabled";
};

const defaultOwnerEmails = ["ryohei0824@gmail.com"];

function getAllowedAdminEmails() {
  return [
    ...defaultOwnerEmails,
    ...(process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ];
}

function isOwnerEmail(email: string) {
  return getAllowedAdminEmails().includes(email.toLowerCase());
}

function mapUser(row: UserRow): AdminUserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
  };
}

export async function getCurrentAdminUser(): Promise<AdminUserRecord | null> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!session?.user || !email || !hasDatabaseUrl()) {
    return null;
  }

  const result = await query<UserRow>(
    `
      select id, email, display_name, role, status
      from users
      where email = $1
      limit 1
    `,
    [email],
  );
  const user = result.rows[0];

  if (!user) {
    return null;
  }

  if (isOwnerEmail(email) && (user.role !== "admin" || user.status !== "active")) {
    await query(
      `
        update users
        set role = 'admin', status = 'active', updated_at = CURRENT_TIMESTAMP
        where id = $1
      `,
      [user.id],
    );

    return { ...mapUser(user), role: "admin", status: "active" };
  }

  return mapUser(user);
}

export async function getAdminSession() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!session?.user || !email) {
    return { status: "unauthenticated" as const, session: null };
  }

  if (!hasDatabaseUrl()) {
    return isOwnerEmail(email)
      ? { status: "authorized" as const, session }
      : { status: "unauthorized" as const, session };
  }

  const user = await getCurrentAdminUser();
  if (!user || user.status === "disabled") {
    return { status: "unauthorized" as const, session };
  }

  if (user.status === "invited") {
    return { status: "pending" as const, session };
  }

  if (user.role !== "admin") {
    return { status: "unauthorized" as const, session };
  }

  return { status: "authorized" as const, session };
}

export async function requireAdmin() {
  const result = await getAdminSession();

  if (result.status === "unauthenticated") {
    redirect("/admin/login");
  }

  if (result.status === "unauthorized") {
    redirect("/admin/unauthorized");
  }

  if (result.status === "pending") {
    redirect("/admin/pending");
  }

  return result.session;
}

export async function requireActiveMember() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!session?.user || !email) {
    redirect("/admin/login");
  }

  if (!hasDatabaseUrl()) {
    return {
      id: "local",
      email,
      displayName: session.user.name ?? email,
      role: isOwnerEmail(email) ? "admin" : "member",
      status: "active",
    } satisfies AdminUserRecord;
  }

  const user = await getCurrentAdminUser();

  if (!user || user.status === "disabled") {
    redirect("/admin/unauthorized");
  }

  if (user.status === "invited") {
    redirect("/admin/pending");
  }

  return user;
}
