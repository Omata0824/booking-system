import Link from "next/link";
import { signInToAdmin } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <Link className="mb-8 flex items-center gap-3" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white">
            F
          </span>
          <span>
            <span className="block text-base font-semibold">FirstAI 予約</span>
            <span className="block text-xs text-slate-500">管理コンソール</span>
          </span>
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-sm font-semibold text-teal-700">管理者ログイン</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Google アカウントでログイン
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            管理画面の閲覧と予約ページ作成にはログインが必要です。
          </p>
          <form className="mt-6" action={signInToAdmin}>
            <button className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
              Google でログイン
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
