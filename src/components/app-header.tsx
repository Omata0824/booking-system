import Link from "next/link";

type AppHeaderProps = {
  variant?: "admin" | "public" | "poc";
};

export function AppHeader({ variant = "admin" }: AppHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link className="flex items-center gap-3" href={variant === "public" ? "/book/web-design" : "/admin"}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white">
            F
          </span>
          <span>
            <span className="block text-base font-semibold text-slate-900">FirstAI 予約</span>
            <span className="block text-xs text-slate-500">
              {variant === "public" ? "オンライン相談会" : "管理コンソール"}
            </span>
          </span>
        </Link>
        {variant !== "public" ? (
          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-slate-100 pt-3 text-sm sm:order-none sm:w-auto sm:border-0 sm:pt-0">
            <Link className="rounded-lg bg-teal-50 px-3 py-2 font-medium text-teal-700" href="/admin">
              日程調整カレンダー
            </Link>
            <Link className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50" href="/book/web-design">
              公開ページを見る
            </Link>
            <Link className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50" href="/">
              Google連携PoC
            </Link>
          </nav>
        ) : (
          <Link className="text-sm text-slate-500 hover:text-slate-800" href="/admin">
            管理画面
          </Link>
        )}
      </div>
    </header>
  );
}
