import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  AssignmentMode,
  FormFieldType,
  UserRole,
  UserStatus,
} from "../src/generated/prisma/enums";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      displayName: "管理者",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: "admin@example.com",
      displayName: "管理者",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const hosts = await Promise.all(
    [
      ["tanaka@example.com", "田中 花子"],
      ["sato@example.com", "佐藤 太郎"],
      ["ito@example.com", "伊藤 美咲"],
    ].map(([email, displayName]) =>
      prisma.user.upsert({
        where: { email },
        update: { displayName, status: UserStatus.ACTIVE },
        create: {
          email,
          displayName,
          status: UserStatus.ACTIVE,
          role: UserRole.MEMBER,
        },
      }),
    ),
  );

  const project = await prisma.project.upsert({
    where: { slug: "web-design" },
    update: {
      name: "Webデザインコース 無料相談会",
      description:
        "未経験からWebデザイナーを目指す方向けの無料相談会です。学習内容や受講スケジュールについて担当者がオンラインでご案内します。",
      assignmentMode: AssignmentMode.ROUND_ROBIN,
      durationMinutes: 30,
      isActive: true,
      mainColor: "#2257d6",
    },
    create: {
      name: "Webデザインコース 無料相談会",
      slug: "web-design",
      description:
        "未経験からWebデザイナーを目指す方向けの無料相談会です。学習内容や受講スケジュールについて担当者がオンラインでご案内します。",
      assignmentMode: AssignmentMode.ROUND_ROBIN,
      durationMinutes: 30,
      bookingWindowDays: 30,
      minimumLeadHours: 24,
      changeCutoffHours: 24,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      perHostDailyLimit: 6,
      projectDailyLimit: 18,
      reminderOneHourEnabled: true,
      isActive: true,
      mainColor: "#2257d6",
    },
  });

  await prisma.projectHost.deleteMany({ where: { projectId: project.id } });
  await prisma.projectAvailability.deleteMany({ where: { projectId: project.id } });
  await prisma.formField.deleteMany({ where: { projectId: project.id } });

  await Promise.all(
    hosts.map((host, index) =>
      prisma.projectHost.create({
        data: {
          projectId: project.id,
          userId: host.id,
          priority: index + 1,
        },
      }),
    ),
  );

  await prisma.projectAvailability.createMany({
    data: [
      { projectId: project.id, weekday: 1, startMinute: 600, endMinute: 1200 },
      { projectId: project.id, weekday: 2, startMinute: 600, endMinute: 1200 },
      { projectId: project.id, weekday: 3, startMinute: 600, endMinute: 1200 },
      { projectId: project.id, weekday: 4, startMinute: 600, endMinute: 1200 },
      { projectId: project.id, weekday: 5, startMinute: 600, endMinute: 1200 },
      { projectId: project.id, weekday: 6, startMinute: 600, endMinute: 1020 },
    ],
  });

  for (const host of hosts) {
    await prisma.userAvailability.deleteMany({ where: { userId: host.id } });
    await prisma.userAvailability.createMany({
      data: [
        { userId: host.id, weekday: 1, startMinute: 600, endMinute: 1140 },
        { userId: host.id, weekday: 2, startMinute: 600, endMinute: 1140 },
        { userId: host.id, weekday: 3, startMinute: 600, endMinute: 1140 },
        { userId: host.id, weekday: 4, startMinute: 600, endMinute: 1140 },
        { userId: host.id, weekday: 5, startMinute: 600, endMinute: 1140 },
      ],
    });
  }

  await prisma.formField.createMany({
    data: [
      {
        projectId: project.id,
        key: "name",
        label: "氏名",
        type: FormFieldType.TEXT,
        isRequired: true,
        sortOrder: 1,
      },
      {
        projectId: project.id,
        key: "email",
        label: "メールアドレス",
        type: FormFieldType.EMAIL,
        isRequired: true,
        sortOrder: 2,
      },
      {
        projectId: project.id,
        key: "phone",
        label: "電話番号",
        type: FormFieldType.TEL,
        sortOrder: 3,
      },
      {
        projectId: project.id,
        key: "note",
        label: "ご相談内容",
        type: FormFieldType.TEXTAREA,
        sortOrder: 4,
      },
    ],
  });

  console.log(`Seeded project ${project.slug} with ${hosts.length} hosts. Admin: ${admin.email}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
