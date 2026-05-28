import { redirect } from "next/navigation";
import { handlers } from "@/auth";

export function GET() {
  redirect("/admin/login");
}

export const POST = handlers.POST;
