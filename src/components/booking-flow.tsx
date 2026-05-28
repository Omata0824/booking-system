"use client";

import { useActionState, useMemo, useState } from "react";
import type { BookingActionState } from "@/app/book/[slug]/actions";
import type { BookingDay, BookingPageProject, BookingSlot } from "@/lib/booking";

type BookingFlowProps = {
  project: BookingPageProject;
  action: (
    previousState: BookingActionState,
    formData: FormData,
  ) => Promise<BookingActionState>;
};

type SelectedSlot = {
  day: BookingDay;
  slot: BookingSlot;
};

const initialState: BookingActionState = { status: "idle" };

export function BookingFlow({ project, action }: BookingFlowProps) {
  const firstAvailableIndex = Math.max(
    0,
    project.days.findIndex((day) => day.slots.length > 0),
  );
  const [windowStart, setWindowStart] = useState(firstAvailableIndex);
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const visibleDays = useMemo(
    () => project.days.slice(windowStart, windowStart + 5),
    [project.days, windowStart],
  );
  const currentMonthLabel =
    visibleDays.length > 0
      ? `${visibleDays[0].monthLabel} - ${visibleDays[visibleDays.length - 1].monthLabel}`
      : "";

  if (state.status === "success") {
    return <Completion booking={state.booking} project={project} />;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
      <StepBar activeStep={selected ? 2 : 1} />

      {!selected ? (
        <div className="mt-8">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-semibold">ご都合の良い日時を選択してください</h2>
              <p className="mt-2 text-sm text-slate-500">
                担当者の受付時間と既存予約をもとに、予約可能な時間だけを表示しています。
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700">
              <span className="h-2 w-2 rounded-full bg-teal-600" />
              空き枠のみ表示
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={windowStart === 0}
                onClick={() => setWindowStart((value) => Math.max(0, value - 5))}
                type="button"
              >
                前へ
              </button>
              <div className="text-center">
                <p className="font-semibold text-slate-700">{currentMonthLabel}</p>
                <p className="mt-1 text-xs text-slate-500">アジア/東京 (UTC+09:00)</p>
              </div>
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={windowStart + 5 >= project.days.length}
                onClick={() =>
                  setWindowStart((value) => Math.min(project.days.length - 5, value + 5))
                }
                type="button"
              >
                次へ
              </button>
            </div>

            <div className="mt-5 hidden grid-cols-[56px_repeat(5,minmax(0,1fr))] gap-1 lg:grid">
              <div />
              {visibleDays.map((day) => (
                <div key={day.dateKey} className="pb-3 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    {day.dayNumber} <span className="text-xs">{day.weekday}</span>
                  </p>
                </div>
              ))}
              <div className="space-y-12 pt-4 text-right text-xs text-slate-500">
                {["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((time) => (
                  <p key={time}>{time}</p>
                ))}
              </div>
              {visibleDays.map((day) => (
                <div key={day.dateKey} className="min-h-[520px] space-y-1 border-l border-slate-200">
                  {day.slots.length > 0 ? (
                    day.slots.map((slot) => (
                      <button
                        key={slot.startIso}
                        className="block min-h-14 w-full rounded-md bg-teal-600 px-2 py-2 text-left text-sm font-medium text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                        onClick={() => setSelected({ day, slot })}
                        type="button"
                      >
                        {slot.label}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-slate-200 px-2 py-6 text-center text-xs text-slate-400">
                      空きなし
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-4 lg:hidden">
              {visibleDays.map((day) => (
                <div key={day.dateKey} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="font-semibold text-slate-700">
                    {day.monthLabel} {day.dayNumber}日（{day.weekday}）
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {day.slots.length > 0 ? (
                      day.slots.map((slot) => (
                        <button
                          key={slot.startIso}
                          className="rounded-lg bg-teal-600 px-3 py-2.5 text-sm font-medium text-white"
                          onClick={() => setSelected({ day, slot })}
                          type="button"
                        >
                          {slot.label}
                        </button>
                      ))
                    ) : (
                      <p className="col-span-2 text-sm text-slate-400">空き枠がありません</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-8 max-w-3xl">
          <h2 className="text-lg font-semibold">情報入力</h2>
          <div className="mt-4 rounded-xl bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">日程</p>
            <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {formatDate(selected.slot.startIso)} {selected.slot.label}
                </p>
                <p className="mt-2 text-xs text-slate-500">アジア/東京 (UTC+09:00)</p>
              </div>
              <button
                className="rounded-lg border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700"
                onClick={() => setSelected(null)}
                type="button"
              >
                日程選択に戻る
              </button>
            </div>
          </div>

          {state.status === "error" && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.message}
            </div>
          )}

          <form action={formAction} className="mt-6 space-y-5">
            <input name="projectId" type="hidden" value={project.id} />
            <input name="startIso" type="hidden" value={selected.slot.startIso} />
            <Field label="会社名" name="company" />
            <Field label="名前" name="guestName" required />
            <Field label="メールアドレス" name="guestEmail" required type="email" />
            <label className="block text-sm font-medium text-slate-700">
              コメント
              <textarea
                className="mt-2 block min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                name="comment"
              />
            </label>
            <p className="text-xs leading-6 text-slate-500">
              入力内容は日程調整と予約確認のために利用します。
            </p>
            <button
              className="w-full rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "予約を確定しています..." : "上記の内容で予約を確定する"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

function StepBar({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  const steps = ["日程選択", "情報入力", "予約完了"];

  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-full border border-slate-200 text-xs font-semibold sm:text-sm">
      {steps.map((step, index) => {
        const number = index + 1;
        const active = number === activeStep;
        const done = number < activeStep;
        return (
          <div
            key={step}
            className={`flex items-center justify-center gap-1 px-2 py-2.5 sm:gap-2 sm:px-3 ${
              active || done ? "bg-teal-50 text-teal-700" : "bg-white text-slate-500"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                active || done ? "bg-teal-600 text-white" : "bg-slate-500 text-white"
              }`}
            >
              {done ? "✓" : number}
            </span>
            <span className="whitespace-nowrap">{step}</span>
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: "text" | "email";
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {required && (
        <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">
          必須
        </span>
      )}
      <input
        className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function Completion({
  booking,
  project,
}: {
  booking: Extract<BookingActionState, { status: "success" }>["booking"];
  project: BookingPageProject;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
      <StepBar activeStep={3} />
      <div className="mx-auto mt-10 max-w-2xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-2xl font-semibold text-teal-700">
          ✓
        </div>
        <h2 className="mt-5 text-2xl font-semibold">予約が完了しました</h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          {booking.guestName}様の予約を受け付けました。担当者が確認できる状態でDBに保存されています。
        </p>
        <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-left">
          <p className="text-sm font-medium text-slate-500">予約内容</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <InfoTerm label="予約ページ" value={project.name} />
            <InfoTerm label="日時" value={`${formatDate(booking.startsAt)} ${formatTimeRange(booking.startsAt, booking.endsAt)}`} />
            <InfoTerm label="担当者" value={booking.hostName} />
            <InfoTerm label="所要時間" value={`${project.durationMinutes}分`} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function InfoTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(iso));
}

function formatTimeRange(startIso: string, endIso: string) {
  return `${formatTime(startIso)} - ${formatTime(endIso)}`;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
