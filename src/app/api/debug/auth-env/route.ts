import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  let cloudflareEnv: Record<string, unknown> = {};

  try {
    const context = await getCloudflareContext({ async: true });
    cloudflareEnv = context.env as unknown as Record<string, unknown>;
  } catch {
    cloudflareEnv = {};
  }

  return Response.json({
    processEnv: {
      AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
      AUTH_GOOGLE_ID: Boolean(process.env.AUTH_GOOGLE_ID),
      AUTH_GOOGLE_SECRET: Boolean(process.env.AUTH_GOOGLE_SECRET),
    },
    cloudflareEnv: {
      AUTH_SECRET: Boolean(cloudflareEnv.AUTH_SECRET),
      AUTH_GOOGLE_ID: Boolean(cloudflareEnv.AUTH_GOOGLE_ID),
      AUTH_GOOGLE_SECRET: Boolean(cloudflareEnv.AUTH_GOOGLE_SECRET),
    },
  });
}
