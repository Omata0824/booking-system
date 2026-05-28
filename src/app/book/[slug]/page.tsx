import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BookingFlow } from "@/components/booking-flow";
import { getBookingPageProject } from "@/lib/booking";
import { submitBooking } from "./actions";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getBookingPageProject(slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader variant="public" />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-9">
          <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700">
                <span className="h-2 w-2 rounded-full bg-teal-600" />
                オンライン面談
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight">{project.name}</h1>
              {project.description && (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
                  {project.description}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-64">
              <Info label="所要時間" value={`${project.durationMinutes}分`} />
              <Info label="実施方法" value="Google Meet" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
            {project.hosts.map((host) => (
              <span key={host} className="rounded-full bg-slate-100 px-3 py-1.5">
                {host}
              </span>
            ))}
          </div>
        </section>
        <BookingFlow action={submitBooking} project={project} />
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
