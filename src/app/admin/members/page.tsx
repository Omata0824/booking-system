import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireAdmin } from "@/lib/admin-auth";
import { getMembers } from "@/lib/admin-members";

export const dynamic = "force-dynamic";

const statusLabel = {
  invited: "承認待ち",
  active: "有効",
  disabled: "停止中",
};

const roleLabel = {
  admin: "管理者",
  member: "スタッフ",
};

export default async function AdminMembersPage() {
  await requireAdmin();

  const members = await getMembers();
  const pendingCount = members.filter((member) => member.status === "invited").length;
  const activeCount = members.filter((member) => member.status === "active").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader activeNav="members" />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Link className="text-sm font-medium text-slate-500 hover:text-slate-800" href="/admin">
              ← 管理画面
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">メンバー管理</h1>
            <p className="mt-2 text-sm text-slate-500">
              Googleログインしたスタッフの承認、停止、管理者権限を管理します。
            </p>
          </div>
          <Link
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            href="/admin/settings"
          >
            自分の設定
          </Link>
        </div>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <Stat label="承認待ち" value={`${pendingCount}`} />
          <Stat label="有効メンバー" value={`${activeCount}`} />
          <Stat label="登録済み" value={`${members.length}`} />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-sm font-semibold text-teal-700">スタッフ一覧</p>
          </div>
          {members.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {members.map((member) => (
                <article
                  key={member.id}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_170px_180px_220px]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                        {member.displayName.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold">{member.displayName}</h2>
                        <p className="truncate text-sm text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {statusLabel[member.status]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {roleLabel[member.role]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        担当ページ {member.projectCount}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        予約履歴 {member.assignedBookingCount}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Google {member.hasGoogleAccount ? "連携済み" : "未連携"}
                      </span>
                    </div>
                  </div>

                  <form
                    action="/admin/members/update"
                    className="flex items-start gap-2"
                    method="post"
                  >
                    <input name="operation" type="hidden" value="role" />
                    <input name="userId" type="hidden" value={member.id} />
                    <select
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      defaultValue={member.role}
                      disabled={member.email === "ryohei0824@gmail.com"}
                      name="role"
                    >
                      <option value="member">スタッフ</option>
                      <option value="admin">管理者</option>
                    </select>
                    <button
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={member.email === "ryohei0824@gmail.com"}
                      type="submit"
                    >
                      保存
                    </button>
                  </form>

                  <div className="text-sm text-slate-500">
                    <p>登録日</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {new Intl.DateTimeFormat("ja-JP", {
                        timeZone: "Asia/Tokyo",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(new Date(member.createdAt))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {member.status === "invited" && (
                      <form action="/admin/members/update" method="post">
                        <input name="operation" type="hidden" value="approve" />
                        <input name="userId" type="hidden" value={member.id} />
                        <button className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
                          承認
                        </button>
                      </form>
                    )}
                    {member.status === "disabled" ? (
                      <form action="/admin/members/update" method="post">
                        <input name="operation" type="hidden" value="activate" />
                        <input name="userId" type="hidden" value={member.id} />
                        <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                          有効化
                        </button>
                      </form>
                    ) : (
                      <form action="/admin/members/update" method="post">
                        <input name="operation" type="hidden" value="disable" />
                        <input name="userId" type="hidden" value={member.id} />
                        <button
                          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={member.email === "ryohei0824@gmail.com"}
                        >
                          停止
                        </button>
                      </form>
                    )}
                    <form action="/admin/members/update" method="post">
                      <input name="operation" type="hidden" value="delete" />
                      <input name="userId" type="hidden" value={member.id} />
                      <button
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={member.email === "ryohei0824@gmail.com"}
                      >
                        削除
                      </button>
                    </form>
                    {member.email === "ryohei0824@gmail.com" && (
                      <p className="basis-full text-right text-xs text-slate-400">
                        オーナーは削除できません
                      </p>
                    )}
                    {member.email !== "ryohei0824@gmail.com" &&
                      member.assignedBookingCount > 0 && (
                        <p className="basis-full text-right text-xs text-slate-400">
                          削除すると一覧から非表示になります
                        </p>
                      )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <p className="font-semibold text-slate-700">メンバーはまだ登録されていません</p>
              <p className="mt-2 text-sm text-slate-500">
                スタッフがGoogleログインすると、ここに承認待ちとして表示されます。
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
