import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getManagedBooking } from "@/lib/booking-management";

export const dynamic = "force-dynamic";

const activeStatuses = ["held", "confirmed", "unconfirmed"];

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;
  const booking = await getManagedBooking(token);

  if (!booking) {
    notFound();
  }

  const alreadyCancelled = booking.status === "cancelled" || status === "cancelled";
  const pastCutoff = !booking.canCancel && activeStatuses.includes(booking.status);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader variant="public" />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-9">
          <p className="text-sm font-semibold text-teal-700">予約の確認・キャンセル</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {booking.projectName}
          </h1>

          {alreadyCancelled ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              この予約はキャンセル済みです。
            </div>
          ) : status === "past_cutoff" || pastCutoff ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              参加者によるキャンセル受付期限を過ぎています。変更が必要な場合は主催者へご連絡ください。
            </div>
          ) : null}

          <dl className="mt-7 grid gap-4 text-sm sm:grid-cols-2">
            <InfoTerm label="日時" value={`${formatDate(booking.startsAt)} ${formatTimeRange(booking.startsAt, booking.endsAt)}`} />
            <InfoTerm label="担当者" value={booking.hostName} />
            <InfoTerm label="お名前" value={booking.guestName} />
            <InfoTerm label="メール" value={booking.guestEmail} />
          </dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href={`/book/${booking.projectSlug}`}
            >
              予約ページを開く
            </Link>
            {booking.canCancel && !alreadyCancelled ? (
              <form action={`/manage/${token}/cancel`} method="post">
                <button
                  className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                  type="submit"
                >
                  この予約をキャンセルする
                </button>
              </form>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

function InfoTerm({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

function formatTimeRange(startIso: string, endIso: string) {
  return `${formatTime(startIso)} - ${formatTime(endIso)}`;
}

function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso));
}
