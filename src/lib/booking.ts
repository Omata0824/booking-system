import "server-only";

import { createHash, randomUUID } from "crypto";
import { BookingStatus } from "@/generated/prisma/enums";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import { mockProject } from "@/lib/mock-data";

const timezone = "Asia/Tokyo";
const jstOffsetMinutes = 9 * 60;
const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
const blockingStatuses = [
  BookingStatus.HELD,
  BookingStatus.CONFIRMED,
  BookingStatus.UNCONFIRMED,
];

export type BookingSlot = {
  startIso: string;
  endIso: string;
  label: string;
  availableHostCount: number;
};

export type BookingDay = {
  dateKey: string;
  dayNumber: number;
  weekday: string;
  monthLabel: string;
  slots: BookingSlot[];
};

export type BookingPageProject = {
  id: string;
  name: string;
  slug: string;
  description: string;
  durationMinutes: number;
  color: string;
  hosts: string[];
  timezone: string;
  days: BookingDay[];
};

export type BookingResult = {
  bookingId: string;
  projectName: string;
  startsAt: string;
  endsAt: string;
  hostName: string;
  guestName: string;
};

type JstDateParts = {
  year: number;
  month: number;
  day: number;
};

function getJstDateParts(date: Date): JstDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function addDays(parts: JstDateParts, days: number): JstDateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function toDateKey(parts: JstDateParts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getWeekday(parts: JstDateParts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function createDateFromJst(parts: JstDateParts, minuteOfDay: number) {
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 0, minuteOfDay - jstOffsetMinutes),
  );
}

function formatMinute(minute: number) {
  const hour = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function overlaps(
  start: Date,
  end: Date,
  busy: { startsAt: Date; endsAt: Date },
) {
  return busy.startsAt < end && busy.endsAt > start;
}

function mockBookingPage(slug: string): BookingPageProject {
  const today = getJstDateParts(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const parts = addDays(today, index + 1);
    const weekday = getWeekday(parts);
    const isClosed = weekday === 0;
    const startMinute = 10 * 60;
    const endMinute = weekday === 6 ? 17 * 60 : 20 * 60;
    const slots = isClosed
      ? []
      : Array.from(
          { length: Math.max(0, Math.floor((endMinute - startMinute) / 60)) },
          (_, slotIndex) => {
            const start = startMinute + slotIndex * 60;
            const end = start + 60;
            return {
              startIso: createDateFromJst(parts, start).toISOString(),
              endIso: createDateFromJst(parts, end).toISOString(),
              label: `${formatMinute(start)} - ${formatMinute(end)}`,
              availableHostCount: 1,
            };
          },
        );

    return {
      dateKey: toDateKey(parts),
      dayNumber: parts.day,
      weekday: dayNames[weekday],
      monthLabel: `${parts.year}年${parts.month}月`,
      slots,
    };
  });

  return {
    id: "mock",
    name: mockProject.name,
    slug,
    description: mockProject.description,
    durationMinutes: mockProject.durationMinutes,
    color: mockProject.color,
    hosts: mockProject.hosts,
    timezone,
    days,
  };
}

export async function getBookingPageProject(
  slug: string,
): Promise<BookingPageProject | null> {
  if (!hasDatabaseUrl()) {
    return mockBookingPage(slug);
  }

  const prisma = getPrisma();
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      availabilities: true,
      hosts: {
        where: { isActive: true },
        include: { user: true },
        orderBy: [{ priority: "asc" }],
      },
    },
  });

  if (!project || !project.isActive || project.hosts.length === 0) {
    return null;
  }

  const now = new Date();
  const earliestStart = new Date(
    now.getTime() + project.minimumLeadHours * 60 * 60 * 1000,
  );
  const today = getJstDateParts(now);
  const daysToGenerate = Math.min(project.bookingWindowDays, 21);
  const rangeEnd = createDateFromJst(addDays(today, daysToGenerate + 1), 0);
  const bookings = await prisma.booking.findMany({
    where: {
      projectId: project.id,
      status: { in: blockingStatuses },
      startsAt: { lt: rangeEnd },
      endsAt: { gt: now },
    },
    select: {
      hostId: true,
      startsAt: true,
      endsAt: true,
    },
  });

  const days = Array.from({ length: daysToGenerate }, (_, index) => {
    const parts = addDays(today, index);
    const weekday = getWeekday(parts);
    const availability = project.availabilities.filter(
      (item) => item.weekday === weekday,
    );

    const slots = availability.flatMap((item) => {
      const entries: BookingSlot[] = [];
      for (
        let minute = item.startMinute;
        minute + project.durationMinutes <= item.endMinute;
        minute += project.durationMinutes
      ) {
        const start = createDateFromJst(parts, minute);
        const end = createDateFromJst(parts, minute + project.durationMinutes);

        if (start < earliestStart) {
          continue;
        }

        const availableHostCount = project.hosts.filter(
          (host) =>
            !bookings.some(
              (booking) =>
                booking.hostId === host.userId && overlaps(start, end, booking),
            ),
        ).length;

        if (availableHostCount === 0) {
          continue;
        }

        entries.push({
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          label: `${formatMinute(minute)} - ${formatMinute(minute + project.durationMinutes)}`,
          availableHostCount,
        });
      }
      return entries;
    });

    return {
      dateKey: toDateKey(parts),
      dayNumber: parts.day,
      weekday: dayNames[weekday],
      monthLabel: `${parts.year}年${parts.month}月`,
      slots,
    };
  });

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description ?? "",
    durationMinutes: project.durationMinutes,
    color: project.mainColor ?? "#2257d6",
    hosts: project.hosts.map((host) => host.user.displayName),
    timezone,
    days,
  };
}

export async function createBooking(params: {
  projectId: string;
  startIso: string;
  guestName: string;
  guestEmail: string;
  company?: string;
  comment?: string;
}): Promise<BookingResult> {
  const prisma = getPrisma();
  const start = new Date(params.startIso);

  if (Number.isNaN(start.getTime())) {
    throw new Error("日時を正しく選択してください。");
  }

  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: params.projectId },
      include: {
        formFields: { orderBy: { sortOrder: "asc" } },
        hosts: {
          where: { isActive: true },
          include: { user: true },
          orderBy: [{ priority: "asc" }],
        },
      },
    });

    if (!project || !project.isActive || project.hosts.length === 0) {
      throw new Error("この予約ページは現在利用できません。");
    }

    const end = new Date(start.getTime() + project.durationMinutes * 60 * 1000);
    const conflictingBookings = await tx.booking.findMany({
      where: {
        projectId: project.id,
        status: { in: blockingStatuses },
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: { hostId: true },
    });
    const host = project.hosts.find(
      (candidate) =>
        !conflictingBookings.some((booking) => booking.hostId === candidate.userId),
    );

    if (!host) {
      throw new Error("選択した時間は埋まりました。別の時間を選択してください。");
    }

    const booking = await tx.booking.create({
      data: {
        projectId: project.id,
        hostId: host.userId,
        status: BookingStatus.CONFIRMED,
        startsAt: start,
        endsAt: end,
        blockedStartsAt: new Date(
          start.getTime() - project.bufferBeforeMinutes * 60 * 1000,
        ),
        blockedEndsAt: new Date(
          end.getTime() + project.bufferAfterMinutes * 60 * 1000,
        ),
        timezone,
        guestNameEncrypted: `plain:${params.guestName}`,
        guestEmailEncrypted: `plain:${params.guestEmail}`,
        guestEmailLookupHash: createHash("sha256")
          .update(params.guestEmail.toLowerCase())
          .digest("hex"),
        managementTokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
        idempotencyKey: randomUUID(),
        calendarSyncStatus: "NOT_CREATED",
      },
    });

    const answers = [
      ["company", "会社名", params.company ?? ""],
      ["name", "氏名", params.guestName],
      ["email", "メールアドレス", params.guestEmail],
      ["note", "相談内容", params.comment ?? ""],
    ];

    for (const [key, label, value] of answers) {
      const field = project.formFields.find((item) => item.key === key);
      if (!field || !value) {
        continue;
      }

      await tx.bookingAnswer.create({
        data: {
          bookingId: booking.id,
          formFieldId: field.id,
          fieldKey: field.key,
          fieldLabel: label,
          valueEncrypted: `plain:${value}`,
        },
      });
    }

    return {
      bookingId: booking.id,
      projectName: project.name,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      hostName: host.user.displayName,
      guestName: params.guestName,
    };
  });
}
