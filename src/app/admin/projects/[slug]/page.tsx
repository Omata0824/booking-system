import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getAdminProjectDetail } from "@/lib/admin-projects";
import { requireAdmin } from "@/lib/admin-auth";
import { getProjectHostOptions } from "@/lib/projects";
import { updateProject } from "./actions";

const weekdays = [
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
  { value: 6, label: "土" },
  { value: 0, label: "日" },
];

const assignmentModes = [
  { value: "round_robin", label: "誰か1人が参加" },
  { value: "priority", label: "優先度順" },
  { value: "random", label: "ランダム" },
];

export const dynamic = "force-dynamic";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();

  const { slug } = await params;
  const [project, hosts] = await Promise.all([
    getAdminProjectDetail(slug),
    getProjectHostOptions(),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader activeNav="projects" />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Link className="text-sm font-medium text-slate-500 hover:text-slate-800" href="/admin">
              ← 日程調整カレンダー一覧
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{project.name}</h1>
            <p className="mt-2 text-sm text-slate-500">
              公開ページの基本情報、担当者、受付時間を編集します。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href={`/book/${project.slug}`}
            >
              公開ページ
            </Link>
            <Link
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href="/admin/bookings"
            >
              予約一覧
            </Link>
          </div>
        </div>

        <form action={updateProject} className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <input name="projectId" type="hidden" value={project.id} />
          <input name="currentSlug" type="hidden" value={project.slug} />

          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeader title="基本情報" description="予約ページに表示される内容です。" />
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  カレンダー名
                  <input
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    defaultValue={project.name}
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
                      defaultValue={project.slug}
                      maxLength={120}
                      name="slug"
                      pattern="[a-z0-9-]+"
                      required
                    />
                  </div>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  公開状態
                  <span className="mt-2 flex h-11 items-center gap-3 rounded-xl border border-slate-300 px-3 font-normal">
                    <input defaultChecked={project.isActive} name="isActive" type="checkbox" />
                    公開する
                  </span>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  所要時間
                  <select
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    defaultValue={project.durationMinutes}
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
                    defaultValue={project.mainColor}
                    name="mainColor"
                    type="color"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  説明文
                  <textarea
                    className="mt-2 block min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    defaultValue={project.description}
                    name="description"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeader title="担当者と受付ルール" description="予約を受ける担当者を設定します。" />
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <fieldset>
                  <legend className="text-sm font-medium text-slate-700">担当者</legend>
                  <div className="mt-3 space-y-3">
                    {hosts.map((host) => (
                      <label
                        key={host.id}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      >
                        <input
                          className="mt-1"
                          defaultChecked={project.hostIds.includes(host.id)}
                          name="hostIds"
                          type="checkbox"
                          value={host.id}
                        />
                        <span>
                          <span className="block font-semibold">{host.displayName}</span>
                          <span className="block text-xs text-slate-500">{host.email}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="space-y-5">
                  <label className="text-sm font-medium text-slate-700">
                    参加ルール
                    <select
                      className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      defaultValue={project.assignmentMode}
                      name="assignmentMode"
                    >
                      {assignmentModes.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    前後バッファ
                    <select
                      className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      defaultValue={project.bufferMinutes}
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
              <SectionHeader title="受付時間" description="公開ページに表示する曜日と時間帯です。" />
              <fieldset className="mt-6">
                <legend className="text-sm font-medium text-slate-700">受付曜日</legend>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {weekdays.map((weekday) => (
                    <label
                      key={weekday.value}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5"
                    >
                      <input
                        defaultChecked={project.availabilityWeekdays.includes(weekday.value)}
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
                    defaultValue={project.availabilityStart}
                    name="availabilityStart"
                    required
                    type="time"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  受付終了
                  <input
                    className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    defaultValue={project.availabilityEnd}
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
              <p className="text-sm font-semibold">運用状況</p>
              <dl className="mt-4 grid gap-3 text-sm">
                <InfoTerm label="ステータス" value={project.isActive ? "公開中" : "停止中"} />
                <InfoTerm label="予約数" value={`${project.bookingsCount}件`} />
                <InfoTerm label="公開URL" value={`/book/${project.slug}`} />
              </dl>
            </section>
            <button
              className="w-full rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              type="submit"
            >
              変更を保存
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function InfoTerm({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}
