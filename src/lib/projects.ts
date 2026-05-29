import { hasDatabaseUrl, query } from "@/lib/db";
import { mockProject, mockProjects } from "@/lib/mock-data";

export type ProjectListItem = {
  id?: string;
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

type ProjectListRow = {
  id: string;
  name: string;
  slug: string;
  duration_minutes: number;
  assignment_mode: string;
  is_active: boolean;
  main_color: string | null;
  bookings_count: string;
};

type HostRow = {
  project_id?: string;
  id: string;
  display_name: string;
  email: string;
};

const assignmentModeLabel: Record<string, string> = {
  round_robin: "誰か1人が参加",
  priority: "優先度順",
  random: "ランダム",
};

export async function getProjectList(): Promise<ProjectListItem[]> {
  if (!hasDatabaseUrl()) {
    return mockProjects;
  }

  try {
    const projectsResult = await query<ProjectListRow>(`
      select
        p.id,
        p.name,
        p.slug,
        p.duration_minutes,
        p.assignment_mode,
        p.is_active,
        p.main_color,
        count(b.id)::text as bookings_count
      from projects p
      left join bookings b on b.project_id = p.id
      group by p.id
      order by p.is_active desc, p.created_at desc
    `);
    const hostsResult = await query<HostRow>(`
      select ph.project_id, u.id, u.display_name, u.email
      from project_hosts ph
      join users u on u.id = ph.user_id
      where ph.is_active = true
      order by ph.priority asc nulls last, u.display_name asc
    `);

    return projectsResult.rows.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      durationMinutes: project.duration_minutes,
      hosts: hostsResult.rows
        .filter((host) => host.project_id === project.id)
        .map((host) => host.display_name),
      assignmentMode:
        assignmentModeLabel[project.assignment_mode] ?? project.assignment_mode,
      bookingsThisMonth: Number(project.bookings_count),
      upcomingBookings: 0,
      status: project.is_active ? "公開中" : "下書き",
      color: project.main_color ?? "#2257d6",
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
    const result = await query<HostRow>(`
      select id, display_name, email
      from users
      where status = 'active'
      order by role asc, display_name asc
    `);

    return result.rows.map((host) => ({
      id: host.id,
      displayName: host.display_name,
      email: host.email,
    }));
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
    const projectResult = await query<
      ProjectListRow & { description: string | null }
    >(
      `
        select id, name, slug, description, duration_minutes, assignment_mode, is_active, main_color, '0' as bookings_count
        from projects
        where slug = $1
      `,
      [slug],
    );
    const project = projectResult.rows[0];

    if (!project) {
      return mockProject;
    }

    const hostsResult = await query<HostRow>(
      `
        select ph.project_id, u.id, u.display_name, u.email
        from project_hosts ph
        join users u on u.id = ph.user_id
        where ph.project_id = $1 and ph.is_active = true
        order by ph.priority asc nulls last, u.display_name asc
      `,
      [project.id],
    );

    return {
      ...mockProject,
      name: project.name,
      slug: project.slug,
      description: project.description ?? mockProject.description,
      durationMinutes: project.duration_minutes,
      hosts: hostsResult.rows.map((host) => host.display_name),
      assignmentMode:
        assignmentModeLabel[project.assignment_mode] ?? project.assignment_mode,
      color: project.main_color ?? mockProject.color,
      status: project.is_active ? "公開中" : "下書き",
    };
  } catch (error) {
    console.error("Failed to load public project from database.", error);
    return mockProject;
  }
}
