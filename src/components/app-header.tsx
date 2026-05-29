import Link from "next/link";
import { getCurrentAdminUser } from "@/lib/admin-auth";

type AppHeaderProps = {
  activeNav?: "projects" | "bookings" | "members" | "settings" | "google";
  variant?: "admin" | "public" | "poc";
};

export async function AppHeader({ activeNav = "projects", variant = "admin" }: AppHeaderProps) {
  const user = variant === "public" ? await getCurrentAdminUser() : null;
  const canOpenAdmin = user?.status === "active";
  const adminHref = user?.role === "admin" ? "/admin" : "/admin/settings";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link
          className="flex items-center gap-3"
          href={variant === "public" ? "/book/web-design" : "/admin"}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white">
            F
          </span>
          <span>
            <span className="block text-base font-semibold text-slate-900">
              FirstAI 予約
            </span>
            <span className="block text-xs text-slate-500">
              {variant === "public" ? "オンライン相談" : "管理コンソール"}
            </span>
          </span>
        </Link>
        {variant !== "public" ? (
          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-slate-100 pt-3 text-sm sm:order-none sm:w-auto sm:border-0 sm:pt-0">
            <Link className={navClass(activeNav === "projects")} href="/admin">
              カレンダー
            </Link>
            <Link className={navClass(activeNav === "bookings")} href="/admin/bookings">
              予約一覧
            </Link>
            <Link className={navClass(activeNav === "members")} href="/admin/members">
              メンバー
            </Link>
            <Link className={navClass(activeNav === "settings")} href="/admin/settings">
              自分の設定
            </Link>
            <Link className={navClass(activeNav === "google")} href="/">
              Google連携PoC
            </Link>
          </nav>
        ) : canOpenAdmin ? (
          <Link className="text-sm text-slate-500 hover:text-slate-800" href={adminHref}>
            管理画面
          </Link>
        ) : null}
      </div>
    </header>
  );
}

function navClass(active: boolean) {
  return `rounded-lg px-3 py-2 ${
    active
      ? "bg-teal-50 font-medium text-teal-700"
      : "text-slate-600 hover:bg-slate-50"
  }`;
}
