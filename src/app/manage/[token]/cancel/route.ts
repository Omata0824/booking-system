import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { cancelManagedBooking } from "@/lib/booking-management";

function redirectTo(request: NextRequest, token: string, status: string) {
  const url = new URL(`/manage/${token}`, request.url);
  url.searchParams.set("status", status);
  url.searchParams.set("t", String(Date.now()));
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const result = await cancelManagedBooking(token);

  if ("booking" in result && result.booking) {
    revalidatePath(`/book/${result.booking.projectSlug}`);
  }
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return redirectTo(request, token, result.status);
}
