import { signInWithGoogle, signOutFromGoogle } from "@/app/actions";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { CalendarPocPanel } from "@/components/calendar-poc-panel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader variant="poc" />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <header className="mb-8 flex flex-col justify-between gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-blue-700">技術検証 PoC</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Google Calendar / Meet 連携
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              予約システムの実装前に、ホストの空き状況取得と Google Meet
              付き予定作成が成立することを確認します。
            </p>
          </div>
          {session?.user ? (
            <form action={signOutFromGoogle}>
              <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm">
                ログアウト
              </button>
            </form>
          ) : null}
        </header>

        {!session?.user ? (
          <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-semibold">検証を開始</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Google アカウントでログインし、カレンダーへのアクセスを許可してください。
              検証では予定の参照とテスト予定の作成を行います。
            </p>
            <form className="mt-6" action={signInWithGoogle}>
              <button className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-medium text-white">
                Google でログイン
              </button>
            </form>
          </section>
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
              ログイン中: {session.user.email}
              {session.error === "RefreshTokenError" && (
                <span className="ml-3 text-red-700">
                  認証期限が切れました。ログインし直してください。
                </span>
              )}
            </div>
            <CalendarPocPanel />
          </>
        )}
      </main>
    </div>
  );
}
