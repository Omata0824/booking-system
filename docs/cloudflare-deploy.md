# Cloudflare Workers deploy notes

This app is prepared for Cloudflare Workers via OpenNext and PostgreSQL via
Cloudflare Hyperdrive.

## Runtime shape

- Next.js runs on Cloudflare Workers through `@opennextjs/cloudflare`.
- PostgreSQL is still required. Cloudflare Hyperdrive is used as the Workers
  database binding and connection pool.
- Prisma still runs migrations from a normal Node environment using
  `DATABASE_URL`.

## Required Cloudflare resources

1. A hosted PostgreSQL database
   - Neon, Supabase, Prisma Postgres, Railway Postgres, or another public
     PostgreSQL provider.
   - Cloudflare Free does not replace PostgreSQL storage for this app.
2. A Hyperdrive config connected to that PostgreSQL database.
3. Workers secrets:
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`

## Setup

Create Hyperdrive:

```powershell
npx wrangler hyperdrive create firstai-booking-db --connection-string="postgres://USER:PASSWORD@HOST:5432/DB"
```

Copy the returned Hyperdrive id into `wrangler.jsonc`:

```jsonc
{
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "your-hyperdrive-id"
    }
  ]
}
```

Set secrets:

```powershell
npx wrangler secret put AUTH_SECRET
npx wrangler secret put AUTH_GOOGLE_ID
npx wrangler secret put AUTH_GOOGLE_SECRET
```

Run migrations against the real PostgreSQL database from a Node environment:

```powershell
$env:DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DB"
npm run db:migrate
npm run db:seed
```

## Local Cloudflare preview

Copy `.dev.vars.example` to `.dev.vars` and set:

```text
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://USER:PASSWORD@HOST:5432/DB
```

Then run:

```powershell
npm run preview
```

Note: OpenNext warns that Windows is not fully supported. If local OpenNext
builds fail on Windows, use WSL or Cloudflare Workers Builds/GitHub Actions on
Linux for the deploy build.

## Deploy

```powershell
npm run deploy
```

After deploy, set Google OAuth callback URLs to the deployed domain:

```text
https://your-domain/api/auth/callback/google
```
