import { AssignmentMode } from "@/generated/prisma/enums";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import { mockProject, mockProjects } from "@/lib/mock-data";

export type ProjectListItem = {
  name: string;
  slug: string;
  durationMinutes: number;
  hosts: string[];
  assignmentMode: string;
  bookingsThisMonth: number;
  upcomingBookings: number;
  status: string;
  color: string;
};

export type PublicProject = typeof mockProject;

export type ProjectHostOption = {
  id: string;
  displayName: string;
  email: string;
};

const assignmentModeLabel: Record<AssignmentMode, string> = {
  ROUND_ROBIN: "誰か1人が参加",
  PRIORITY: "優先度順",
  RANDOM: "ランダム",
};

export async function getProjectList(): Promise<ProjectListItem[]> {
  if (!hasDatabaseUrl()) {
    return mockProjects;
  }

  try {
    const prisma = getPrisma();
    const projects = await prisma.project.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        hosts: {
          where: { isActive: true },
          include: { user: true },
          orderBy: [{ priority: "asc" }],
        },
        _count: {
          select: { bookings: true },
        },
      },
    });

    return projects.map((project) => ({
      name: project.name,
      slug: project.slug,
      durationMinutes: project.durationMinutes,
      hosts: project.hosts.map((host) => host.user.displayName),
      assignmentMode: assignmentModeLabel[project.assignmentMode],
      bookingsThisMonth: project._count.bookings,
      upcomingBookings: 0,
      status: project.isActive ? "公開中" : "下書き",
      color: project.mainColor ?? "#2257d6",
    }));
  } catch (error) {
    console.error("Failed to load projects from database.", error);
    return mockProjects;
  }
}

export async function getProjectHostOptions(): Promise<ProjectHostOption[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    const prisma = getPrisma();
    return await prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ role: "asc" }, { displayName: "asc" }],
      select: {
        id: true,
        displayName: true,
        email: true,
      },
    });
  } catch (error) {
    console.error("Failed to load host options from database.", error);
    return [];
  }
}

export async function getPublicProjectBySlug(slug: string): Promise<PublicProject> {
  if (!hasDatabaseUrl()) {
    return mockProject;
  }

  try {
    const prisma = getPrisma();
    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        hosts: { where: { isActive: true }, include: { user: true } },
      },
    });

    if (!project) {
      return mockProject;
    }

    return {
      ...mockProject,
      name: project.name,
      slug: project.slug,
      description: project.description ?? mockProject.description,
      durationMinutes: project.durationMinutes,
      hosts: project.hosts.map((host) => host.user.displayName),
      assignmentMode: assignmentModeLabel[project.assignmentMode],
      color: project.mainColor ?? mockProject.color,
      status: project.isActive ? "公開中" : "下書き",
    };
  } catch (error) {
    console.error("Failed to load public project from database.", error);
    return mockProject;
  }
}
