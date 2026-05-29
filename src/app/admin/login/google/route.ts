import { signIn } from "@/auth";

export function GET() {
  return signIn("google", { redirectTo: "/admin" });
}

export const POST = GET;
