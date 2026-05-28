import { signOutFromAdmin } from "@/app/actions";

export const dynamic = "force-dynamic";

export default function AdminPendingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-sm font-semibold text-amber-700">承認待ち</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            管理者の承認後に利用できます
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Googleログインは完了しています。管理者がメンバー管理画面で承認すると、自分の設定や担当予約を利用できるようになります。
          </p>
          <form action={signOutFromAdmin} className="mt-6">
            <button className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
              ログアウト
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
