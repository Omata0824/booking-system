import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AssignmentMode } from "@/generated/prisma/enums";
import { getProjectHostOptions } from "@/lib/projects";
import { createProject } from "./actions";

const weekdays = [
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
  { value: 6, label: "土" },
  { value: 0, label: "日" },
];

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const hosts = await getProjectHostOptions();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link className="text-sm font-medium text-slate-500 hover:text-slate-800" href="/admin">
              ← 日程調整カレンダー一覧
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">日程調整カレンダー作成</h1>
            <p className="mt-2 text-sm text-slate-500">
              お客さんに共有する予約ページの基本設定、担当者、受付時間を設定します。
            </p>
          </div>
          <Link
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            href="/admin"
          >
            キャンセル
          </Link>
        </div>

        <form action={createProject} className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeader
                number="1"
                title="基本情報"
                description="一覧と公開ページに表示される内容です。"
              />
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  カレンダー名
                  <input
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    defaultValue="Webデザインコース 無料相談会"
                    maxLength={160}
                    name="name"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  公開URL
                  <div className="mt-2 flex rounded-xl border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                    <span className="px-3 py-2.5 font-normal text-slate-400">/book/</span>
                    <input
                      className="min-w-0 flex-1 rounded-r-xl py-2.5 pr-3 font-normal outline-none"
                      defaultValue="web-design-new"
                      maxLength={120}
                      name="slug"
                      pattern="[a-z0-9-]+"
                      required
                    />
                  </div>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  所要時間
                  <select
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    defaultValue="30"
                    name="durationMinutes"
                  >
                    <option value="30">30分</option>
                    <option value="45">45分</option>
                    <option value="60">60分</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  メインカラー
                  <input
                    className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 py-1"
                    defaultValue="#0d9488"
                    name="mainColor"
                    type="color"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  説明文
                  <textarea
                    className="mt-2 block min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    defaultValue="未経験からWebデザイナーを目指す方向けの無料相談会です。学習内容や受講スケジュールについて担当者がオンラインでご案内します。"
                    name="description"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeader
                number="2"
                title="参加者と割り当て"
                description="空いている担当者の中から予約を割り当てます。"
              />
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <fieldset>
                  <legend className="text-sm font-medium text-slate-700">担当者</legend>
                  <div className="mt-3 space-y-3">
                    {hosts.length > 0 ? (
                      hosts.map((host, index) => (
                        <label
                          key={host.id}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        >
                          <input
                            className="mt-1"
                            defaultChecked={index < 3}
                            name="hostIds"
                            type="checkbox"
                            value={host.id}
                          />
                          <span>
                            <span className="block font-semibold">{host.displayName}</span>
                            <span className="block text-xs text-slate-500">{host.email}</span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                        DB接続後、seed済みホストが表示されます。
                      </p>
                    )}
                  </div>
                </fieldset>

                <div className="space-y-5">
                  <label className="text-sm font-medium text-slate-700">
                    参加ルール
                    <select
                      className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      defaultValue={AssignmentMode.ROUND_ROBIN}
                      name="assignmentMode"
                    >
                      <option value={AssignmentMode.ROUND_ROBIN}>誰か1人が参加</option>
                      <option value={AssignmentMode.PRIORITY}>優先度順</option>
                      <option value={AssignmentMode.RANDOM}>ランダム</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    前後バッファ
                    <select
                      className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      defaultValue="10"
                      name="bufferMinutes"
                    >
                      <option value="0">なし</option>
                      <option value="10">前後10分</option>
                      <option value="15">前後15分</option>
                    </select>
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeader
                number="3"
                title="受付時間"
                description="公開ページのカレンダーに表示する曜日と時間帯です。"
              />
              <fieldset className="mt-6">
                <legend className="text-sm font-medium text-slate-700">受付曜日</legend>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {weekdays.map((weekday) => (
                    <label
                      key={weekday.value}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5"
                    >
                      <input
                        defaultChecked={weekday.value >= 1 && weekday.value <= 5}
                        name="availabilityWeekdays"
                        type="checkbox"
                        value={weekday.value}
                      />
                      {weekday.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  受付開始
                  <input
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    defaultValue="10:00"
                    name="availabilityStart"
                    required
                    type="time"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  受付終了
                  <input
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    defaultValue="20:00"
                    name="availabilityEnd"
                    required
                    type="time"
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">公開ページプレビュー</p>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  オンライン面談
                </span>
                <h2 className="mt-4 text-xl font-semibold">Webデザインコース 無料相談会</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  所要時間、担当者、受付時間を保存すると公開ページのカレンダーに反映されます。
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs text-slate-500">所要時間</p>
                    <p className="mt-1 font-semibold">30分</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs text-slate-500">実施方法</p>
                    <p className="mt-1 font-semibold">Google Meet</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">予約フォーム項目</p>
              <div className="mt-4 space-y-2 text-sm">
                {["氏名（必須）", "メールアドレス（必須）", "電話番号", "相談内容"].map((field) => (
                  <div key={field} className="rounded-xl border border-slate-200 px-3 py-2">
                    {field}
                  </div>
                ))}
              </div>
            </section>

            <button
              className="w-full rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              type="submit"
            >
              保存して一覧へ戻る
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}

function SectionHeader({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
        {number}
      </span>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
