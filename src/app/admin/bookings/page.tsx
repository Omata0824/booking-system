import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getAdminBookings } from "@/lib/admin-bookings";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const cancellableStatuses = ["confirmed", "held", "unconfirmed"];

export default async function AdminBookingsPage() {
  await requireAdmin();

  const bookings = await getAdminBookings();
  const now = new Date();
  const upcomingBookings = bookings.filter(
    (booking) =>
      new Date(booking.startsAt).getTime() >= now.getTime() &&
      cancellableStatuses.includes(booking.status),
  );
  const todayKey = dayKeyFormatter.format(now);
  const todaysBookings = bookings.filter(
    (booking) => dayKeyFormatter.format(new Date(booking.startsAt)) === todayKey,
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader activeNav="bookings" />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Link className="text-sm font-medium text-slate-500 hover:text-slate-800" href="/admin">
              ← 日程調整カレンダー一覧
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">予約一覧</h1>
            <p className="mt-2 text-sm text-slate-500">
              予約、担当者、Google Calendar / Meet の同期状態を確認します。
            </p>
          </div>
          <Link
            className="rounded-xl bg-teal-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-700"
            href="/admin/projects/new"
          >
            + カレンダー作成
          </Link>
        </div>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <Stat label="今後の予約" value={`${upcomingBookings.length}`} note="確定・仮押さえを含む" />
          <Stat label="本日の予約" value={`${todaysBookings.length}`} note="Asia/Tokyo" />
          <Stat label="表示中" value={`${bookings.length}`} note="最新100件" />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-sm font-semibold text-teal-700">予約データ</p>
          </div>
          {bookings.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {bookings.map((booking) => {
                const canCancel = cancellableStatuses.includes(booking.status);

                return (
                  <article key={booking.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[220px_1fr_180px]">
                    <div>
                      <p className="text-lg font-semibold">{formatDate(booking.startsAt)}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatTime(booking.startsAt)} - {formatTime(booking.endsAt)}
                      </p>
                      <span className="mt-3 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                        {booking.statusLabel}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-semibold">{booking.guestName}</h2>
                      <p className="mt-1 text-sm text-slate-500">{booking.guestEmail}</p>
                      {booking.company && (
                        <p className="mt-1 text-sm text-slate-500">{booking.company}</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {booking.projectName}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          担当: {booking.hostName}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          Calendar: {booking.calendarSyncStatusLabel}
                        </span>
                      </div>
                      {booking.note && (
                        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                          {booking.note}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 text-sm font-semibold text-teal-700">
                      <Link
                        className="rounded-lg border border-slate-200 px-3 py-2 text-center hover:bg-slate-50"
                        href={`/book/${booking.projectSlug}`}
                      >
                        予約ページ
                      </Link>
                      {booking.googleMeetUrl ? (
                        <a
                          className="rounded-lg border border-slate-200 px-3 py-2 text-center hover:bg-slate-50"
                          href={booking.googleMeetUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Meetを開く
                        </a>
                      ) : (
                        <span className="rounded-lg border border-slate-200 px-3 py-2 text-center text-slate-400">
                          Meet未作成
                        </span>
                      )}
                      {canCancel ? (
                        <form action="/admin/bookings/cancel" method="post">
                          <input name="bookingId" type="hidden" value={booking.id} />
                          <ConfirmSubmitButton
                            className="w-full rounded-lg border border-red-200 px-3 py-2 text-red-700 hover:bg-red-50"
                            confirmMessage="この予約をキャンセルしますか？Google Calendarの予定も削除を試みます。"
                            formMethod="post"
                          >
                            予約をキャンセル
                          </ConfirmSubmitButton>
                        </form>
                      ) : (
                        <span className="rounded-lg border border-slate-200 px-3 py-2 text-center text-slate-400">
                          キャンセル不可
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <p className="font-semibold text-slate-700">予約はまだありません</p>
              <p className="mt-2 text-sm text-slate-500">
                公開ページから予約が入ると、ここに表示されます。
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso));
}
