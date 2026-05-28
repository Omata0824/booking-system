import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";

function getAllowedAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminSession() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!session?.user || !email) {
    return { status: "unauthenticated" as const, session: null };
  }

  const allowedEmails = getAllowedAdminEmails();
  if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
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

  return result.session;
}
