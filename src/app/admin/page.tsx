import Link from "next/link";
import { AdminProjectList } from "@/components/admin-project-list";
import { AppHeader } from "@/components/app-header";
import { getProjectList } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const projects = await getProjectList();
  const activeProjects = projects.filter((project) => project.status.includes("公開")).length;
  const bookingsThisMonth = projects.reduce(
    (total, project) => total + project.bookingsThisMonth,
    0,
  );
  const upcomingBookings = projects.reduce(
    (total, project) => total + project.upcomingBookings,
    0,
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader />
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[250px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-teal-700">Creative</p>
              <p className="mt-1 text-xs text-slate-500">社内用チーム</p>
            </div>
            <nav className="p-3 text-sm">
              <SideLink href="/admin" label="ホーム" />
              <SideLink active href="/admin" label="日程調整カレンダー" />
              <SideLink href="/admin" label="予定" />
              <SideLink href="/admin" label="メンバー" />
              <SideLink href="/" label="Google連携" />
            </nav>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold">クイック操作</p>
            <Link
              className="mt-4 block rounded-xl bg-teal-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-700"
              href="/admin/projects/new"
            >
              + カレンダー作成
            </Link>
            <Link
              className="mt-3 block rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              href="/book/web-design"
            >
              公開ページを確認
            </Link>
          </section>
        </aside>

        <div>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold text-teal-700">日程調整カレンダー</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">予約ページ一覧</h1>
                <p className="mt-3 text-sm text-slate-500">
                  お客さんに共有する予約ページを管理します。ページ表示、URLコピー、公開状態の確認をここから行います。
                </p>
              </div>
              <Link
                className="rounded-xl bg-teal-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-700"
                href="/admin/projects/new"
              >
                + 日程調整カレンダー作成
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat label="公開中ページ" value={`${activeProjects}`} note={`${projects.length}件中`} />
              <Stat label="今月の予約" value={`${bookingsThisMonth}`} note="全ページ合計" />
              <Stat label="今後の予定" value={`${upcomingBookings}`} note="登録済み予約" />
            </div>
          </section>

          <AdminProjectList projects={projects} />
        </div>
      </main>
    </div>
  );
}

function SideLink({
  active,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`block rounded-xl px-3 py-2.5 ${
        active ? "bg-teal-50 font-semibold text-teal-700" : "text-slate-600 hover:bg-slate-50"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  );
}
