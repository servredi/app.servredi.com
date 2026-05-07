# ServRedi

A full-stack Field Service Management (FSM) SaaS platform for field service companies — used daily by admins, dispatchers, and field technicians on mobile and desktop.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, routes under `/api`)
- `pnpm --filter @workspace/servredi run dev` — run the React frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild composite libs (run this after changing DB schema or API spec)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (then fix `lib/api-zod/src/index.ts` — see Gotchas)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Clerk auth (`@clerk/express`)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind v4 + shadcn/ui + wouter
- Auth: Clerk (whitelabel, dark theme matching ServRedi brand)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts (30+ endpoints)
- `lib/api-spec/orval.config.ts` — codegen config
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (used by API server for validation)
- `lib/db/src/schema/` — Drizzle ORM schema (organizations, profiles, customers, jobs, job_tasks, time_entries, quotes/quote_items + relations)
- `lib/db/src/index.ts` — Drizzle DB client export
- `artifacts/api-server/src/app.ts` — Express app with Clerk middleware
- `artifacts/api-server/src/routes/` — Route handlers: profile, customers, jobs, time-tracking, quotes, schedule, dashboard, reports
- `artifacts/servredi/src/App.tsx` — Frontend entry, Clerk + routing setup
- `artifacts/servredi/src/pages/` — All page components (Dashboard, Schedule, Jobs, JobDetail, TimeTracking, Customers, CustomerDetail, Quotes, QuoteDetail, Reports, Settings)
- `artifacts/servredi/src/components/layout/Shell.tsx` — Sidebar + mobile nav shell

## Architecture decisions

- **Contract-first API**: OpenAPI spec drives Orval codegen for both React Query hooks and Zod validation schemas. Server validates inputs with Zod, clients use generated hooks.
- **Multi-tenant by organizationId**: All data is scoped to `organization_id`. First user to sign in becomes admin and can set up an org in Settings.
- **Clerk proxy**: All Clerk requests are proxied through the Express server at `/clerk/` to support custom domains and whitelabeling. The frontend uses `publishableKeyFromHost` to handle dev/prod switching.
- **Dark industrial theme**: CSS custom properties in `index.css` define the slate/orange palette. Tailwind v4 `@layer` order (`theme, base, clerk, components, utilities`) ensures Clerk theme layers correctly.
- **Server-side query helpers**: Route handlers fetch related data (customer names, technician names) inline to return denormalized responses matching the OpenAPI schema — no JOIN complexity in Drizzle.

## Product

- **Dashboard** — KPI cards (jobs today, in progress, completed, active techs, open quotes, hours today), today's jobs list, recent activity feed
- **Schedule** — Week-based calendar grid, filter by technician, job status color coding
- **Jobs** — Searchable/filterable list; detail page with tasks checklist and status management
- **Time Tracking** — Core field screen: big clock-in/out, live elapsed timer, job selector, break tracking, GPS capture
- **Customers (CRM)** — Searchable list, detail page with contact info and full job history
- **Quotes** — Quote list with status filter; detail page with line-item editor and auto-calculated totals
- **Reports** — Employee hours chart (Recharts), jobs summary with status/priority breakdown, date range filters
- **Settings** — Profile info, role display, organization setup

## User preferences

- Dark industrial-modern aesthetic: slate #334155 primary, orange #F97316 accent
- Mobile-first, dense but organized, built for field technicians
- No emojis in UI

## Gotchas

- **After running `pnpm --filter @workspace/api-spec run codegen`**: Orval overwrites `lib/api-zod/src/index.ts` with extra exports that break typecheck. Fix it to `export * from "./generated/api";` only, then run `pnpm run typecheck:libs`.
- **After changing DB schema**: Run `pnpm run typecheck:libs` before typechecking API server — the compiled lib output must include the new exports.
- **DB relations**: Defined in `lib/db/src/schema/relations.ts` — required for `db.query.*Table.findMany({ with: { ... } })` Drizzle relational API.
- **Clerk proxy path**: `CLERK_PROXY_PATH` is `/clerk/` — the frontend `VITE_CLERK_PROXY_URL` must match this.
- **PORT env**: Each artifact reads `PORT` from the workflow env — do not hardcode ports in vite.config.ts or server code.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` to add new endpoints (then run codegen)
