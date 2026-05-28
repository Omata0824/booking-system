import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireActiveMember } from "@/lib/admin-auth";
import { getMemberSettings } from "@/lib/admin-members";
import { updateMySettings } from "./actions";

export const dynamic = "force-dynamic";

const weekdays = [
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
  { value: 6, label: "土" },
  { value: 0, label: "日" },
];

export default async function AdminSettingsPage() {
  const user = await requireActiveMember();
  const settings = await getMemberSettings(user.id);
  const selectedWeekdays = new Set(
    settings?.availabilities.map((item) => item.weekday) ?? [1, 2, 3, 4, 5],
  );
  const availabilityByWeekday = new Map(
    settings?.availabilities.map((item) => [item.weekday, item]) ?? [],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader activeNav="settings" />
      <main className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-6">
          <Link className="text-sm font-medium text-slate-500 hover:text-slate-800" href="/admin">
            ← 管理画面
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">自分の設定</h1>
          <p className="mt-2 text-sm text-slate-500">
            予約担当者として表示される名前と、基本の稼働時間を設定します。
          </p>
        </div>

        <form action={updateMySettings} className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">プロフィール</h2>
            <div className="mt-5 grid gap-5">
              <label className="text-sm font-medium text-slate-700">
                表示名
                <input
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  defaultValue={settings?.displayName ?? user.displayName}
                  maxLength={120}
                  name="displayName"
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                メールアドレス
                <input
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal text-slate-500"
                  disabled
                  defaultValue={settings?.email ?? user.email}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                タイムゾーン
                <select
                  className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  defaultValue={settings?.timezone ?? "Asia/Tokyo"}
                  name="timezone"
                >
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </label>
            </div>

            <h2 className="mt-8 text-lg font-semibold">基本の稼働時間</h2>
            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-slate-700">曜日ごとの稼働時間</legend>
              <div className="mt-3 grid gap-3">
                {weekdays.map((weekday) => (
                  <label
                    key={weekday.value}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm sm:grid-cols-[80px_1fr_1fr]"
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <input
                        defaultChecked={selectedWeekdays.has(weekday.value)}
                        name="availabilityWeekdays"
                        type="checkbox"
                        value={weekday.value}
                      />
                      {weekday.label}
                    </span>
                    <span>
                      <span className="mb-1 block text-xs text-slate-500">開始</span>
                      <input
                        className="block w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        defaultValue={formatMinute(
                          availabilityByWeekday.get(weekday.value)?.startMinute ?? 10 * 60,
                        )}
                        name={`availabilityStart_${weekday.value}`}
                        type="time"
                      />
                    </span>
                    <span>
                      <span className="mb-1 block text-xs text-slate-500">終了</span>
                      <input
                        className="block w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        defaultValue={formatMinute(
                          availabilityByWeekday.get(weekday.value)?.endMinute ?? 20 * 60,
                        )}
                        name={`availabilityEnd_${weekday.value}`}
                        type="time"
                      />
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              className="mt-7 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
              type="submit"
            >
              設定を保存
            </button>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">アカウント状態</p>
              <dl className="mt-4 space-y-3 text-sm">
                <Info label="権限" value={user.role === "admin" ? "管理者" : "スタッフ"} />
                <Info label="状態" value="有効" />
                <Info
                  label="Google"
                  value={settings?.hasGoogleAccount ? "連携済み" : "未連携"}
                />
              </dl>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">反映範囲</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                ここで保存した稼働時間はスタッフ本人の基本設定です。予約ページごとの受付時間は、各カレンダー設定と組み合わせて使います。
              </p>
            </section>
          </aside>
        </form>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function formatMinute(minute: number) {
  const hour = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
