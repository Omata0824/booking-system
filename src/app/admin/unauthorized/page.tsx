import Link from "next/link";
import { signOutFromAdmin } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function AdminUnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-sm font-semibold text-red-700">アクセスできません</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            管理者として許可されていないアカウントです
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            別の Google アカウントでログインするか、管理者に許可メールアドレスの追加を依頼してください。
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <form action={signOutFromAdmin}>
              <button className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
                ログアウトしてやり直す
              </button>
            </form>
            <Link
              className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href="/"
            >
              トップへ戻る
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
