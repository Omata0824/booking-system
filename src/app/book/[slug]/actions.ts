"use server";

import { headers } from "next/headers";
import { createBooking, type BookingResult } from "@/lib/booking";

export type BookingActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; booking: BookingResult };

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function getRequestBaseUrl() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

  if (!host) {
    return undefined;
  }

  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

export async function submitBooking(
  _previousState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const projectId = getText(formData, "projectId");
  const startIso = getText(formData, "startIso");
  const guestName = getText(formData, "guestName");
  const guestEmail = getText(formData, "guestEmail");

  if (!projectId || !startIso || !guestName || !guestEmail) {
    return {
      status: "error",
      message: "日時、氏名、メールアドレスを入力してください。",
    };
  }

  try {
    const booking = await createBooking({
      projectId,
      startIso,
      guestName,
      guestEmail,
      company: getText(formData, "company"),
      comment: getText(formData, "comment"),
      baseUrl: await getRequestBaseUrl(),
    });

    return { status: "success", booking };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "予約の保存に失敗しました。時間を変えてもう一度お試しください。",
    };
  }
}
