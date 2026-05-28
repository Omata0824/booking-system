"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AssignmentMode, FormFieldType } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";

const assignmentModes = new Set<string>(Object.values(AssignmentMode));

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getInteger(formData: FormData, key: string, fallback: number) {
  const value = Number.parseInt(getText(formData, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseTimeToMinute(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export async function createProject(formData: FormData) {
  const name = getText(formData, "name");
  const slug = normalizeSlug(getText(formData, "slug"));
  const hostIds = formData.getAll("hostIds").map(String).filter(Boolean);
  const weekdayValues = formData
    .getAll("availabilityWeekdays")
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  const startMinute = parseTimeToMinute(getText(formData, "availabilityStart"));
  const endMinute = parseTimeToMinute(getText(formData, "availabilityEnd"));

  if (!name || !slug || hostIds.length === 0 || weekdayValues.length === 0) {
    throw new Error("Project name, slug, hosts, and availability are required.");
  }

  if (startMinute === null || endMinute === null || startMinute >= endMinute) {
    throw new Error("Availability time range is invalid.");
  }

  const requestedAssignmentMode = getText(formData, "assignmentMode");
  const assignmentMode = assignmentModes.has(requestedAssignmentMode)
    ? (requestedAssignmentMode as AssignmentMode)
    : AssignmentMode.ROUND_ROBIN;
  const durationMinutes = getInteger(formData, "durationMinutes", 30);
  const bufferMinutes = getInteger(formData, "bufferMinutes", 10);

  const prisma = getPrisma();
  await prisma.project.create({
    data: {
      name,
      slug,
      description: getText(formData, "description") || null,
      assignmentMode,
      durationMinutes,
      bookingWindowDays: 30,
      minimumLeadHours: 24,
      changeCutoffHours: 24,
      bufferBeforeMinutes: bufferMinutes,
      bufferAfterMinutes: bufferMinutes,
      perHostDailyLimit: 6,
      projectDailyLimit: 18,
      reminderOneHourEnabled: true,
      isActive: true,
      mainColor: getText(formData, "mainColor") || "#2257d6",
      hosts: {
        create: hostIds.map((userId, index) => ({
          userId,
          priority: index + 1,
        })),
      },
      availabilities: {
        create: weekdayValues.map((weekday) => ({
          weekday,
          startMinute,
          endMinute,
        })),
      },
      formFields: {
        create: [
          {
            key: "name",
            label: "氏名",
            type: FormFieldType.TEXT,
            isRequired: true,
            sortOrder: 1,
          },
          {
            key: "email",
            label: "メールアドレス",
            type: FormFieldType.EMAIL,
            isRequired: true,
            sortOrder: 2,
          },
          {
            key: "phone",
            label: "電話番号",
            type: FormFieldType.TEL,
            sortOrder: 3,
          },
          {
            key: "note",
            label: "相談内容",
            type: FormFieldType.TEXTAREA,
            sortOrder: 4,
          },
        ],
      },
    },
  });

  revalidatePath("/admin");
  redirect("/admin");
}
