"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProjectListItem } from "@/lib/projects";

type AdminProjectListProps = {
  projects: ProjectListItem[];
};

export function AdminProjectList({ projects }: AdminProjectListProps) {
  const [query, setQuery] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return projects;
    }

    return projects.filter((project) =>
      [
        project.name,
        project.slug,
        project.status,
        project.assignmentMode,
        ...project.hosts,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [projects, query]);

  async function copyProjectUrl(project: ProjectListItem) {
    const origin = window.location.origin;
    await navigator.clipboard.writeText(`${origin}/book/${project.slug}`);
    setCopiedSlug(project.slug);
    window.setTimeout(() => setCopiedSlug(null), 2000);
  }

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex gap-2 text-sm font-semibold">
            <span className="rounded-xl bg-teal-600 px-4 py-2 text-white">
              日程調整カレンダー
            </span>
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-slate-500">
              予定
            </span>
          </div>
          <label className="relative block md:w-80">
            <span className="sr-only">日程調整カレンダーを検索</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="日程調整カレンダー検索"
              value={query}
            />
          </label>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <article
              key={project.slug}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="font-medium">Google Meet</span>
                    <span>前後0分</span>
                    <span className="h-0.5 w-24 rounded-full bg-teal-500" />
                    <span>{project.durationMinutes}分</span>
                    <span>前後0分</span>
                  </div>
                  <h2 className="mt-5 text-xl font-semibold">{project.name}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                      {project.assignmentMode}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {project.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      /book/{project.slug}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
                    {project.hosts.map((host) => (
                      <span key={host} className="rounded-full bg-slate-50 px-3 py-1">
                        {host}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  className="self-start rounded-xl border border-slate-200 px-3 py-2 text-xl leading-none text-slate-500 hover:bg-slate-50"
                  type="button"
                >
                  ⋮
                </button>
              </div>
              <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm font-semibold text-teal-700 sm:flex-row sm:justify-end">
                <Link
                  className="rounded-lg px-3 py-2 text-center hover:bg-white"
                  href={`/book/${project.slug}`}
                >
                  ページを表示
                </Link>
                <button
                  className="rounded-lg px-3 py-2 hover:bg-white"
                  onClick={() => copyProjectUrl(project)}
                  type="button"
                >
                  {copiedSlug === project.slug ? "コピーしました" : "URLをコピー"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
            <p className="font-medium text-slate-700">該当するカレンダーがありません</p>
            <p className="mt-2 text-sm text-slate-500">検索条件を変えてください。</p>
          </div>
        )}
      </div>
    </section>
  );
}
