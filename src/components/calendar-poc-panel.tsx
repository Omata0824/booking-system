"use client";

import { FormEvent, useState } from "react";

type BusyResult = {
  calendars?: { primary?: { busy?: Array<{ start: string; end: string }> } };
  error?: string;
};

type EventResult = {
  calendarUrl?: string;
  meetUrl?: string;
  conferenceStatus?: string;
  error?: string;
};

function formatJst(dateTime: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(dateTime));
}

export function CalendarPocPanel() {
  const [busyResult, setBusyResult] = useState<BusyResult | null>(null);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [start, setStart] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkCalendar() {
    setLoading(true);
    setBusyResult(null);

    const response = await fetch("/api/calendar/freebusy");
    const data = (await response.json()) as BusyResult;
    setBusyResult(data);
    setLoading(false);
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setEventResult(null);

    const response = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start: new Date(start).toISOString() }),
    });
    const data = (await response.json()) as EventResult;
    setEventResult(data);
    setLoading(false);
  }

  const busyPeriods = busyResult?.calendars?.primary?.busy ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">1. 空き状況の取得</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          ログイン中のプライマリカレンダーについて、現在から7日間の予定有無を取得します。
        </p>
        <button
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          onClick={checkCalendar}
          disabled={loading}
        >
          FreeBusy API を試す
        </button>
        {busyResult?.error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {busyResult.error}
          </p>
        )}
        {busyResult && !busyResult.error && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {busyPeriods.length === 0 ? (
              <p>今後7日間に登録済みの予定はありません。</p>
            ) : (
              <>
                <p className="mb-2 font-medium">
                  検出された予定: {busyPeriods.length} 件
                </p>
                <ul className="space-y-1">
                  {busyPeriods.map((period) => (
                    <li key={period.start}>
                      {formatJst(period.start)} - {formatJst(period.end)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">2. Meet 付き予定の作成</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          選択時刻の空きを再確認し、空いていれば30分のテスト予定を実際に作成します。
        </p>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          実行すると Google カレンダーに予定が追加されます。不要になった予定は
          Google カレンダーから削除してください。
        </p>
        <form className="mt-5 space-y-4" onSubmit={createEvent}>
          <label className="block text-sm font-medium text-slate-700">
            開始日時（日本時間）
            <input
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2"
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              required
            />
          </label>
          <button
            className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            type="submit"
            disabled={loading || !start}
          >
            Meet 付きテスト予定を作成
          </button>
        </form>
        {eventResult?.error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {eventResult.error}
          </p>
        )}
        {eventResult && !eventResult.error && (
          <div className="mt-4 space-y-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            <p>予定を作成しました。Meet 発行状態: {eventResult.conferenceStatus}</p>
            {eventResult.meetUrl && (
              <a className="block underline" href={eventResult.meetUrl}>
                Google Meet を開く
              </a>
            )}
            {eventResult.calendarUrl && (
              <a className="block underline" href={eventResult.calendarUrl}>
                Google カレンダーで予定を確認
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
