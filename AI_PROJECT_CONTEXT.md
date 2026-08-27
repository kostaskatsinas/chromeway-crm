# Chromeway CRM — AI Project Context

## 1. Purpose of This File

Primary recap for AI coding assistants working in this repo. Read it **before** scanning files; open other files only when the task requires it or a referenced path seems outdated. Update this file when your changes alter documented behavior.

> Future AI assistants: Read this file first. Do not scan the entire repository unless the current task requires it, referenced files are missing, or the repository has changed substantially since this context was generated. Verify affected files before making changes, and update this document when your work changes any documented behavior.

## 2. Project Overview

Internal CRM for **Chromeway**, a Greek premium decorative-finishes studio (Athens/Peloponnese), covering `Lead → Consultation → Site Visit → Sample → Quotation → Approval → Scheduling → Project Execution → QC → Invoice → Payment → After-Sales`. Users: small team (Admin, Sales, Project Manager, Technician, Accountant, External Collaborator).

**Status:** complete MVP plus the merged 12-week UX modernization — auth+RBAC, operations-focused dashboard, contacts/companies (GDPR, timeline), pipeline Kanban+list+attention filters, site visits w/ measurements & printable report, finish catalogue & samples, quotation builder (versions, EL/EN print, public accept/reject links auto-creating projects), projects (task Kanban, work logs, change orders, QC, est-vs-actual), calendar w/ conflict detection, inventory (auto stock updates), invoices/payments/expenses (EUR, 24% VAT), reports + CSV export, settings, automations, notifications, audit log, soft deletion, REST API. The UI now uses a compact expandable desktop command rail, contextual top bar, mobile bottom navigation, timeline-first contact detail, and sticky project controls.

**Missing/partial:** email sending is stubbed to console; no public invoice page; some UI strings remain hardcoded Greek; no login rate limiting, MFA, durable background-job queue, CI workflow, or full API/E2E suite. Render Free uploads remain ephemeral.

## 3. Technology Stack

| Area | Choice |
|---|---|
| Frontend | Next.js **15.5.24** App Router, React **19.2.8**, TypeScript 5.9 strict |
| Backend | Next.js Route Handlers (REST, same process) |
| DB / ORM | PostgreSQL 16 / Prisma **6.19.3** (35 models, 26 enums) |
| Auth | Custom JWT via jose (HS256, httpOnly cookie `cw_session`, 7d), bcryptjs |
| State | Server Components read Prisma directly; client components call REST via `src/lib/client.ts` fetch wrapper; no state library |
| UI/styling | Tailwind CSS **4.3.3** (`@theme` in `globals.css`), custom cool-neutral command-center design system, network-independent system sans font stack |
| Validation | Zod 3.25 (`src/lib/schemas.ts` + inline route schemas) |
| Files | Local disk (`UPLOAD_DIR`, default `./uploads`) + sharp compression/thumbnails |
| Testing | Node built-in `node:test` (`--experimental-strip-types`) |
| Deploy | Multi-stage `Dockerfile` + `docker-compose.yml` (db+app, named volumes) |
| Integrations | None yet; schema prepared for myDATA/accounting |

## 4. Repository Structure

- `prisma/schema.prisma` — full schema; `prisma/migrations/` — 4 migrations; `prisma/seed.ts` — destructive demo-data seeder.
- `src/app/(app)/` — authenticated pages, one folder per module; `src/app/api/` — REST handlers; `src/app/{login,forgot-password,reset-password}` and `src/app/public-quote/[token]` — public pages.
- `src/components/ui.tsx` — shared UI kit; `src/components/modules/` — per-module client components; `src/components/layout/AppShell.tsx` — expandable command rail, contextual topbar, mobile bottom nav, global search, notifications.
- `src/lib/`: `auth.ts` (JWT/session), `rbac.ts` (capability matrix), `api.ts` (handler wrapper + audit), `crud.ts` (generic list builder), `resources.ts` (resource registry), `security.ts` (response redaction), `page-auth.ts`, `schemas.ts` (Zod), `calc.ts` (money math), `invoices.ts`/`invoice-state.ts`, `stats.ts`, `automations.ts`, `project-creation.ts`, `quotation-helpers.ts`, `numbering.ts`, `files.ts`, `utils.ts`, `client.ts`.
- `src/i18n/dictionaries.ts` + `LanguageProvider.tsx` — el/en dictionaries and formatters; `src/middleware.ts` — edge auth guard; `tests/*.test.ts` — unit tests; `scripts/backup.sh` — pg_dump + uploads backup; `.env.example`, `docker-compose.yml`, `Dockerfile`, `README.md`.

> Path shorthand used below: bare filenames under known roots resolve as `src/components/modules/<f>`, `src/app/api/<path>`, `src/lib/<f>`, or `src/app/(app)/<path>`.

## 5. Architecture and Data Flow

Next.js monolith. Pages = Server Components reading Prisma directly; mutations go through REST endpoints returning `{ok,data}` / `{ok:false,error}`, then clients refetch. All handlers pass through `handler(fn,{capability?,public?})` (`lib/api.ts`): resolves session, checks RBAC capability, catches `ApiError`/`ZodError`, writes audit logs.

Generic CRUD at `/api/{resource}[/{id}]` is registry-driven by `resources.ts` (model name, capabilities per view/edit/delete, Zod schemas, soft-delete flag, includes). Opportunity stage changes and task DONE status have server-side side effects in `[id]/route.ts`.

**Auth:** login POST verifies bcrypt → JWT cookie; middleware verifies signature except `PUBLIC_PATHS` (`/login`, `/forgot-password`, `/reset-password`, `/public*`, `/public-quote`, `/api/auth`, `/api/public`, `/api/cron`); session re-checks the user against the DB (active, not deleted) and rehydrates current email/name/role so profile changes are not stale for the JWT lifetime.

**Files:** multipart POST `/api/files` → entity-scoped RBAC check → disk under `UPLOAD_DIR` → sharp `_main.webp` (1600px) + `_thumb.webp` → served only after a matching entity-view capability check at `/api/files/{id}/raw?variant=`.

**Automations:** `runAutomations()` (`lib/automations.ts`) — lead follow-ups, unanswered-lead/stale-quote/payment reminders, visit reminders, overrun alerts, feedback requests. Triggered by an Admin dashboard client or `GET /api/cron/run` with `CRON_SECRET`. Quote acceptance also synchronously creates a project.

```mermaid
flowchart LR
  C[Client Components] -- fetch --> API[Route Handlers]
  P[Server Components] --> Prisma --> PG[(PostgreSQL)]
  API --> Prisma
  API --> A[(audit_logs)] & N[(notifications)]
  Cron[/api/cron/run] --> Auto[runAutomations] --> N & T[(project_tasks)]
```

## 6. Database Model

Schema `prisma/schema.prisma`; migrations `20260825075953_init`, `20260825091723_event_end_optional`, `20260826090000_unique_project_quotation`, `20260827130000_rename_demo_admin` (local DB confirmed up to date). Key entities (all money = Decimal(12,2)):

- **Auth/org:** `User` (unique email, Role enum, hourlyRate, active, deletedAt), `PasswordResetToken`, `Setting` (single-row company JSON).
- **CRM:** `Contact` (businessType, leadSource, GDPR consent fields, tags[], customFields Json, nullable→Company, owner→User) · `Company` · `Opportunity` (PipelineStage enum ×11, probability, estimatedValue, Kanban position, lossReason, closedAt) · `ServiceType`.
- **Field work:** `SiteVisit` → `Measurement` (cascade; dims + areaM2).
- **Catalogue:** `Finish` (unique code, category/gloss enums, €/m² cost & price, labourHoursPerM2) · `Sample` (status enum, feedbackRating).
- **Quoting:** `Quotation` (unique number, groupId+version, status enum, waste/markup/discount/vat pct, stored totals, internalCost/margin hidden from customers, unique publicToken+expiry, paymentSchedule Json) → `QuotationItem` (cascade; type/unit enums).
- **Delivery:** `Project` (unique code, unique nullable `quotationId`, contractValue/estimatedCost/Hours, qcChecklist Json [{item,done}]) → `ProjectTask` (self-relation dependencies, milestone) · `WorkLog` (**unique [projectId,userId,date]**) · `ChangeOrder` (approved flag).
- **Comms/calendar:** `CalendarEvent` (type enum, recurrence fields, polymorphic link ids) · `Activity` (CALL/EMAIL/SMS/…, polymorphic ids) · `Comment` (@mentions) · `EmailTemplate`.
- **Inventory:** `Supplier` · `Material` (unique code, Unit enum, currentStock/minStock, avgPurchasePrice, batchTracking) · `StockMovement` · `MaterialReservation` · `Purchase`→`PurchaseItem`.
- **Finance:** `Expense` · `Invoice` (kind/status enums, paidTotal, unique publicToken) → `InvoiceItem` (cascade) · `Payment`.
- **Cross-cutting:** `File` (polymorphic entityType/entityId, thumbs) · `Notification` · `AuditLog` (before/after Json, ip) · `AutomationSetting`.

**Invariants:** soft delete (`deletedAt`) on 13 models enforced via `SOFT_DELETE_MODELS` (`src/lib/crud.ts`); explicit FK cascades on Measurement, QuotationItem, InvoiceItem, PurchaseItem, WorkLog, ChangeOrder, MaterialReservation; most other relations restrict.

## 7. Authentication and Permissions

Email+password → bcrypt compare → HS256 JWT cookie. Each authenticated server request rehydrates the current email, name, and role from the active DB user. Reset tokens sha256-hashed with expiry; link logged to console only. Roles: ADMIN (bypasses everything), SALES, PROJECT_MANAGER, TECHNICIAN, ACCOUNTANT, COLLABORATOR.

**Backend-enforced (real):** capability matrix `rbac.ts` is checked by shared and custom handlers, and direct-Prisma pages use `requirePageCapability`. Per-resource caps live in `resources.ts`. Sensitive response fields are stripped server-side: quote costs require `quotes.costs`; project/change-order financials require `projects.financials`; nested user relations use safe projections and a defense-in-depth credential redactor. **UI-only:** sidebar/nav filtering in `AppShell.tsx` remains cosmetic and is not trusted for authorization.

**Known gaps:** reset email is never sent (development returns the link); no rate limiting/lockout; no JWT revocation on password change. `AUTH_SECRET` and `CRON_SECRET` fail closed in production/cron usage; the auth fallback exists only in development.

## 8. Implemented Modules

| Module | Works / key files |
|---|---|
| Dashboard | Default home (`/` and post-login → `/dashboard`); top KPI grid for leads/quotes/visits/projects/tasks/finance (pipeline-value KPI intentionally omitted); three-column operations command center for today's queue, pipeline attention, and project health; analytics in progressive disclosure — `(app)/dashboard/page.tsx`, `lib/stats.ts`, `components/charts.tsx` |
| Contacts & Companies | CRUD, search/filter/pagination; timeline-first contact detail with sticky essentials/comments/files, related records, GDPR stamps — `Contacts.tsx`, `Companies.tsx`, `Timeline.tsx`; `(app)/contacts/**`, `(app)/companies/**` |
| Pipeline | Drag-drop Kanban across 11 stages + list toggle; All/Today/Overdue/Missing-next-action attention filters; urgency borders and next-action visibility; stage side effects; loss reasons — `Pipeline.tsx` |
| Site visits | Scheduling, mobile measurement editor (auto m²), photos, printable report — `Measurements.tsx`, `Visits.tsx`; `(app)/visits/[id]/page.tsx`+`[id]/report/page.tsx`; `api/visits/[id]/measurements` |
| Catalogue & samples | Finish CRUD/archive w/ swatch grid; sample tracking + approval flow — `Catalogue.tsx` |
| Quotations | Builder (finish lines auto-fill prices/costs/hours from catalogue), live totals + internal margin panel, schedules, versions, print EL/EN, anonymous accept/reject page → WON + auto project — `QuoteBuilder.tsx`, `Quotes.tsx`; `(app)/quotes/**`; `api/quotations/**`, `api/public/quote/[token]`, `calc.ts`, `quotation-helpers.ts`, `project-creation.ts`, `app/public-quote/[token]/page.tsx` |
| Projects | Auto/manual creation, sticky status/progress/action header, overview tab (progress, QC checklist), tasks Kanban, daily work logs, change orders w/ approval, finance tab (expenses + labour cost = hours×user rates, est-vs-actual bars), photos — `ProjectDetail.tsx`, `Projects.tsx`, `Tasks.tsx`; `api/projects/[id]/finance`, `api/worklogs/upsert` |
| Calendar | Day/week/month grids, colour-coded types, assignee conflict warnings, recurrence fields — `modules/Calendar.tsx`; `(app)/calendar/page.tsx` |
| Tasks | Global Kanban (TODO/IN_PROGRESS/DONE), priorities, milestones, dependencies; completion timestamps server-side — `modules/Tasks.tsx`; `(app)/tasks/page.tsx` |
| Inventory | Materials w/ low-stock badges, movement modal + history, suppliers, purchase form atomically updating stock & average prices — `modules/Inventory.tsx`; `api/purchases`, `api/inventory/movement` |
| Finance | Invoice create (prefillable from accepted quote), pro forma/final/credit-note, payment modal with balance math, expenses tab, overdue highlighting — `modules/Finance.tsx`; `api/invoices`, `lib/numbering.ts` |
| Reports | Sales / financial / ops / outstanding tabs, CSV downloads — `(app)/reports/page.tsx` + `client.tsx` |
| Settings | Password change, language switch, user admin, company profile JSON, automation toggles — `modules/Settings.tsx`; `api/users`, `api/settings`, `api/automations` |
| Global search & notifications | Cross-entity search; bell dropdown w/ unread count — `AppShell.tsx`; `api/search`, `api/notifications` |

## 9. Critical Business Rules

Money math in `src/lib/calc.ts` (pure, unit-tested):

```text
subtotal      = Σ(qty × unitPrice)
afterWaste    = subtotal × (1 + wastePct%)          # waste applies to whole subtotal
afterDiscount = afterWaste × (1 − discountPct%)
totalNet      = afterDiscount × (1 + markupPct%)
vatAmount     = totalNet × vatRate%                 # default 24%
totalGross    = round2(totalNet + vatAmount)
internalCost  = Σ(qty × unitCost)
marginPct     = (totalNet − internalCost) / totalNet × 100
schedule_i    = round2(totalGross × pct_i / 100)
```

- Server recomputes totals on every quote save (`totalsFor`) — client values never trusted.
- Invoices: `total = max(0, subtotal − discount) × (1 + vatRate%)`; balance = total − Σ payments; any payment mutation runs `recalcInvoiceStatus` → ISSUED/PARTIALLY_PAID/PAID/OVERDUE (dueDate past + unpaid).
- Numbering (year-scoped counters): quotes `CW-Q-YYYY-NNNN(-vN)`, invoices `CW-INV|CW-PF|CW-CN-YYYY-NNNN`, projects `CW-P-YYYY-NNN`.
- Public acceptance: validates token/expiry/undecided and atomically claims the decision → ACCEPTED → opportunity forced WON (probability 100, closedAt) → idempotent project creation copying contact/company/address, contractValue=totalGross, estimatedCost=internalCost, hours=Σ(qty×hoursPerUnit), default 5-item QC checklist → notification. All database changes share one transaction; the unique `Project.quotationId` prevents duplicates. Rejection leaves opportunity in NEGOTIATION.
- Stage transitions: WON/LOST set `closedAt` (cleared when leaving), SYSTEM activity logged; task DONE toggles `completedAt`.
- Project labour cost = Σ(workLog.hours × User.hourlyRate); actual cost ≈ expenses + labour.
- Locale: EUR via `Intl.NumberFormat('el-GR'|'en-IE')`, dates `'el-GR'|'en-GB'` (`LanguageProvider.tsx`); language cookie `cw_lang` default `el`. Timezone display-local; no pinned Europe/Athens constant (inferred gap — see §16).
- Purchases increment stock, set lastPurchasePrice, weighted-average avgPurchasePrice; stock ≤ minStock fires STOCK_LOW notifications to ADMIN+PMs.

## 10. API and Route Map

Envelope `{ok,data}`; auth = session cookie unless noted. Implementation: route files under `src/app/api/**` (paths below map 1:1).

| Area | Endpoint(s) | Methods | Auth | Notes |
|---|---|---|---|---|
| Generic resources (contacts, companies, opportunities, visits, measurements, finishes, samples, projects, tasks, events, suppliers, materials, expenses, payments, activities, comments, serviceTypes, changeOrders, worklogs-list) | `/api/{resource}[/{id}]` | GET POST · GET PATCH DELETE | capability per resource | Registry-driven CRUD + audit + soft delete (`[resource]/route.ts`, `[id]/route.ts`) |
| Auth/session | `/api/auth/session` | POST DELETE GET | public | Login/logout/whoami (`auth/session/route.ts`) |
| Password | `/api/auth/password` | POST PUT PATCH | POST/PUT public; PATCH session | Request/perform/change (`auth/password/route.ts`) |
| Quotations | `/api/quotations[/id]` | GET POST · GET PATCH POST DELETE | `quotes.*` | Create/read cost-stripped/update+items replace/actions `send`,`newVersion`,`regenerateLink` (`quotations/route.ts`, `[id]/route.ts`) |
| Public quote decision | `/api/public/quote/[token]` | GET POST | none (unguessable token) | Explicit customer-safe DTO; marks VIEWED; transactional accept→project (`public/quote/[token]/route.ts`) |
| Purchases & stock | `/api/purchases`, `/api/inventory/movement` | GET POST | inventory.* | Atomic stock-in + averaging; consume/adjust/return + low-stock alerts |
| Work log | `/api/worklogs/upsert` | PUT | yes | One row per project/user/day |
| Project finance | `/api/projects/[id]/finance` | GET | role-gated | Profitability snapshot |
| Measurements bulk | `/api/visits/[id]/measurements` | PUT | yes | Replace set for visit |
| Files | `/api/files`, `/api/files/[id]/raw` | POST GET · GET | entity capability | Scoped list/upload + authorized bytes/thumbs |
| Dashboard/search/notifications/users/settings/automations | respective paths under `/api/` | GET/POST/PATCH/PUT | yes (user/settings writes: ADMIN) | Aggregates, cross-entity search, admin management, company JSON, automation toggles |
| Cron | `/api/cron/run` | GET POST | Admin session or configured secret | Fails 503 if external access is attempted without `CRON_SECRET`; accepts Bearer or `?secret=` (`cron/run/route.ts`) |
| Health | `/api/health` | GET | **public** | DB probe `SELECT 1`; 200 healthy / 503 degraded (`api/health/route.ts`) — used by Docker healthcheck & monitors |

## 11. Frontend Navigation and Important Screens

Desktop navigation is a 72px dark command rail that expands to 240px on hover. Sales/Delivery/Operations groups are filtered through the RBAC capability matrix; the active item has a clay marker. The Chromeway brand routes to `/dashboard`. The 64px contextual topbar provides a capability-filtered Create menu, global search, Cmd/Ctrl+K command center (navigation, record search, creation, and quick activity logging), ΕΛ/EN toggle, notifications, and user menu. Mobile uses a fixed bottom bar with **Επισκόπηση**, capability-aware **Pipeline** and **Έργα**, and **Περισσότερα**; search remains in the topbar and opens full-screen. Activity creation always attributes the signed-in user server-side.

`/` and successful login default to `/dashboard`. Dashboard KPI cards deep-link to filtered work queues; the restored finance/KPI set intentionally excludes the **Αξία pipeline** card. The operational section combines today's tasks/visits, opportunities needing attention, and project health; detailed analytics are collapsed by default. Pipeline (`view`, `mine`, `stage`, `q`, `new`, `open`) also offers client-side attention filters for Today, Overdue, and Missing next action. Projects (`status`, `view=delayed`), quotes/visits (`status`), tasks (`mine`, `priority`, `assignee`), finance (`tab`, `status`, `new`, `open`), and project detail (`tab`) preserve workflow state in URL parameters. Screens: `/dashboard`, `/workspace`, `/pipeline`, `/contacts(+/[id])`, `/companies(+/[id])`, `/visits(+/[id], /[id]/report)`, `/catalogue` (tabs), `/quotes(+/new, /[id], /[id]/print)`, `/projects(+/new, /[id])`, `/calendar`, `/tasks`, `/inventory`, `/finance`, `/reports`, `/settings`; public: `/login`, `/forgot-password`, `/reset-password`, `/public-quote/[token]`.

Conventions: index pages are client components fetching `/api/...` (debounced `q`, URL-backed select filters, pagination component); high-density tables can use `DataTableControls.tsx` for localStorage-persisted columns/density and a sticky bulk-action bar. Contacts/projects/quotes use selection + CSV export; project status and quotation expiry support authorized bulk updates. Tables use `.table-base` in `.card` with horizontal scroll; Kanban = HTML5 DnD with optimistic move + refetch plus mobile status selectors and task quick-completion. Forms validate via HTML attrs + server Zod, errors as toasts; detail pages are Server Components feeding one client component each. Contact detail is timeline-first with a sticky essentials/comments/files column. Project detail has a sticky status/progress/action header and capability-aware read-only presentation. Kit: `ui.tsx` (Button/Input/Select/Modal/Badge/StatusBadge/Tabs/useConfirm/useToast/Pagination/Avatar/StatCard…), `DataTableControls.tsx`, `layout/CommandCenter.tsx`, pickers (`ContactPicker`), charts (`charts.tsx`), gallery (`FileGallery`). Modal supplies dialog semantics, Escape close, focus trapping/restoration, configurable initial focus, and mobile viewport sizing. Design tokens in `globals.css` (@theme): cool paper/surface neutrals, dark command surfaces, ink ramp, clay accent, olive/rust/amber/slate statuses; centralized `StatusBadge` pairs colour with a symbol; `.display` uses the system sans stack with strong weight/tracking; print styles hide `.no-print`.

i18n: strings via `t(key)`; flat dicts `dictionaries.ts` (el authoritative, en key-parity tested); enum labels `prefix.VALUE` (`stage.*`, `qstatus.*`, `biz.*`, `reg.*`, `unit.*`). Some newer module strings still hardcoded Greek.

## 12. Configuration and Environment Variables

Example file `.env.example`; loaded automatically by Next/Prisma. No browser-exposed vars (no `NEXT_PUBLIC_*`).

| Var | Purpose | Required | Scope | Dev fallback |
|---|---|---|---|---|
| `DATABASE_URL` | Postgres connection string | yes | server | compose db defaults (`postgresql://chromeway:<pw>@localhost:5432/chromeway`) |
| `AUTH_SECRET` | JWT signing secret | yes in prod | server | development-only fallback; production fails closed |
| `APP_URL` | Base URL in reset/quote links | recommended | server | `http://localhost:3000` |
| `UPLOAD_DIR` | File storage dir | optional | server | `./uploads` (created on demand) |
| `NODE_ENV` | Runtime mode | optional | server | `development` |
| `CRON_SECRET` | Guards external cron endpoint | yes for compose/external cron | server | Admin session may trigger; anonymous access fails closed if unset |
| `POSTGRES_PASSWORD` | Compose database password | required for production; optional locally | deploy | `chromeway_dev` fallback in Compose |

`.env` holds real local values and is gitignored — never commit secrets. Compose falls back to `chromeway_dev` for local PostgreSQL when `POSTGRES_PASSWORD` is absent; never rely on that fallback in an exposed environment.

## 13. Local Development Commands

Verified against `package.json` scripts:

```bash
docker compose up -d db     # PostgreSQL (container chromeway-db)
npm install                 # runs prisma generate (postinstall)
npm run db:migrate          # prisma migrate dev
npm run db:seed             # DESTRUCTIVE: wipes all tables, inserts Greek demo data
npm run dev                 # next dev :3000 (frontend+backend together; cannot run separately)
npm run typecheck           # tsc --noEmit
npm test                    # node --test --experimental-strip-types tests/*.test.ts
npm run build               # prisma generate && next build
npm start                   # next start (needs prior build)
npm run db:deploy           # prisma migrate deploy (production path)
npm run db:studio           # prisma studio GUI
```

`npm run lint` uses ESLint 9 flat config. Full Docker stack: set `POSTGRES_PASSWORD`, `AUTH_SECRET`, and `CRON_SECRET`, then run `docker compose up -d --build`.

## 14. Testing and Validation

- Tests: 23 assertions across 6 files — quotation math, invoice state, response security/redaction, RBAC matrix, dictionary parity, and CSV/utils. Pure-function coverage remains the majority; there is no committed browser/API/DB integration suite.
- Executed 2026-08-27 after the command-center redesign and follow-up navigation changes: `npm test` → **6 files / 23 assertions pass / 0 fail**; `npm run typecheck` → exit 0; `npm run lint` → clean; `npm run build` → success. An authenticated production-server route smoke test returned 200 for `/workspace`, `/dashboard`, `/pipeline`, `/contacts`, and `/projects`. The production preview was started successfully at `localhost:3000`; automatic in-app-browser localhost reload was blocked by the browser URL-safety boundary, so final visual review was completed by the user in the existing local tab.
- Earlier 2026-08-26 browser checks verified command search/focus, selectable configurable contact tables, task URL filters, mobile task status controls, and the project sticky header with no fresh console warnings. Role checks verified Accountant activity creation → 403, Collaborator contacts → 403, Collaborator projects → 200, and read-only contact controls for Accountant.
- Live production-server regression checks passed for health, collaborator capability denials, project/change-order financial redaction, nested credential redaction, sales quotation cost redaction, public quote DTO privacy, and fail-closed cron behavior.
- Still untested automatically: automations engine outcomes, uploads/sharp transformations, calendar conflict edge cases, and destructive seeding integrity.

## 15. Deployment

**Hosted prototype:** GitHub `kostaskatsinas/chromeway-crm`, branch `main`, auto-deploys to the Render Docker service `chromeway-crm` at `https://chromeway-crm.onrender.com`; data is stored in Neon Postgres. `DATABASE_URL` is the pooled runtime URL and the entrypoint temporarily overrides it with `DIRECT_URL` for `prisma migrate deploy` when the direct URL is configured. `DEMO_AUTOSEED=true` seeds only when the users table is empty. Render Free has idle spin-down and an ephemeral filesystem, so database data persists in Neon but uploaded files can disappear on restart/redeploy/spin-down. See `DEPLOY_DEMO.md`.

**Self-hosted/VPS:** Docker Compose has two services: `db` (postgres:16-alpine, healthcheck, volume `chromeway_pgdata`, loopback-only host port) and `app` (built from the multi-stage `Dockerfile`, port 3000, volume `chromeway_uploads` at `/app/uploads`, waits for DB health, runs `prisma migrate deploy` then `next start`). Compose requires `AUTH_SECRET` and `CRON_SECRET`; set a strong `POSTGRES_PASSWORD` in every production environment even though a development fallback exists. `.dockerignore` excludes secrets, local builds, uploads, and VCS metadata. The runtime uses a non-root user. TLS via an external reverse proxy is assumed; cookies become `secure` in production. Backups: `scripts/backup.sh <dir>`. Health: `GET /api/health` is public and wired to the Compose healthcheck. The production application build was verified on 2026-08-27; the last documented Docker image build verification remains 2026-08-26.

## 16. Known Issues, Technical Debt, and Risks

**Fixed during the 2026-08-25/26 reviews** (kept for history): soft-delete query bypass; unsafe inline HTML/SVG uploads; global-search RBAC bypass; missing custom-route/page capability checks; nested user `passwordHash` exposure; quote/project/change-order financial leakage; overbroad anonymous public-quote response; racy quote acceptance/project creation; non-transactional quote item replacement; payment changes not recalculating invoices; non-atomic inventory adjustments; report soft-delete predicates; public payment schedule ×100 display error; invoice due date being discarded on create; untyped generic API filters (including the `active=true` Prisma crash); fail-open production/cron secrets; public Postgres binding; missing Docker `public/`; build-time Google Fonts dependency; broken lint setup; vulnerable dependency versions.

- **High — critical workflow boundaries are still split across generic CRUD operations:** some record updates, stage/task side effects, invoice recalculation, and audit writes are separate calls rather than a single domain transaction (`api/[resource]/[id]/route.ts`). Concurrent failures can leave secondary state or audit history incomplete.
- **High — no CI or committed integration/E2E suite:** local lint/typecheck/unit/build checks pass, but pull requests do not automatically test real PostgreSQL workflows, route RBAC, uploads, quote acceptance, payments, or inventory.
- **Medium — automations are synchronous and use heuristic idempotency:** `runAutomations()` performs per-record duplicate queries/writes and has no durable job/outbox table, retry state, or failure dashboard.
- **Medium — audit logging is best-effort:** `audit()` logs and suppresses its own database failure; this is practical for availability but not a guaranteed compliance ledger.
- **Medium — optimistic concurrency is absent:** simultaneous edits are last-write-wins for leads, tasks, quotes, projects, payments, and inventory records.
- **Medium — password reset has no delivery channel:** console log only; non-production returns link in HTTP response (`api/auth/password/route.ts`).
- **Medium — authentication hardening remains incomplete:** no login/reset rate limiting, MFA, per-session revocation, or explicit CSRF/origin policy for mutations.
- **Medium — partial English UI:** several module components hardcode Greek strings (Finance, ProjectDetail, Measurements tabs/buttons); parity test covers dictionary keys only.
- **Medium — implicit timezone:** stats/worklog day bucketing uses server-local time; Europe/Athens not pinned anywhere.
- **Medium — hosted uploads are ephemeral:** the Render Free prototype stores uploads on the local filesystem, which is lost on restart/redeploy/spin-down; production needs object storage or a persistent paid disk.
- **Low — generic list sorting is not allowlisted:** `orderBy` is passed dynamically to Prisma and can produce avoidable 500 responses for invalid fields.
- **Low — invoice publicToken unused** (no public invoice page); `package.json#prisma` seed config is deprecated and emits a Prisma 7 migration warning.

## 17. Recommended Next Steps

1. Introduce explicit domain/application services and transaction boundaries for opportunity transitions, quote acceptance, payments, inventory, and project completion; make sensitive audit writes part of those transactions.
2. Add PostgreSQL-backed integration tests and browser E2E coverage for route RBAC, uploads, quote acceptance concurrency, payment recalculation, inventory, and critical mobile flows; run lint/typecheck/tests/migrations/build in CI.
3. Harden authentication with rate limits, session revocation/rotation, administrator/accountant MFA, and an explicit CSRF/origin policy; integrate an email provider for reset links and quotation sends.
4. Move automations to a durable job/outbox model with idempotency keys, retry/backoff state, batching, and an administrator failure view.
5. Add structured logs, correlation IDs, error monitoring, slow-query metrics, off-site encrypted backups, and tested restore procedures.
6. Move hosted uploads to S3-compatible object storage with signed access, quotas, metadata stripping, lifecycle rules, and orphan cleanup.
7. Add optimistic concurrency to high-impact records, allowlist sort fields, and add query-driven indexes after measuring production queries.
8. Complete English translations, pin `Europe/Athens` for business-day bucketing, and implement GDPR export/anonymization/retention workflows.
9. Build a public invoice/customer portal and add accountant PDF/CSV or Greek accounting integration.

## 18. Safe Modification Guidelines for Future AI Agents

- **Never hand-edit:** `prisma/migrations/*` (use `prisma migrate dev`), `.next/`, `node_modules/`, `tsconfig.tsbuildinfo`, `package-lock.json` (npm only).
- **Schema changes:** edit `schema.prisma` → `prisma migrate dev --name <desc>` → update `resources.ts`/`schemas.ts` entries. `db:seed` wipes data — never against real data.
- **New standard entity:** register in `resources.ts` (model name = Prisma delegate camelCase), add Zod schemas, capabilities in `rbac.ts`, optionally nav item in `AppShell.tsx`; generic routes handle the rest.
- **Money/status logic:** keep math in `calc.ts`; server always recomputes quote totals via `totalsFor`; preserve cost-stripping for non-financial roles.
- **Auth-sensitive routes:** use `handler(fn,{capability})`; public routes need BOTH `{public:true}` AND middleware `PUBLIC_PATHS`; don't weaken `getSession()`'s DB-active re-check.
- **Soft delete:** models in `SOFT_DELETE_MODELS` (`crud.ts`) must be filtered by `deletedAt` in any raw Prisma query outside the generic layer.
- **Broad-blast-radius files:** `rbac.ts` (every endpoint), `crud.ts` list builder (all lists/exports), `api.ts` handler (error contract consumed by `client.ts`), enum renames (migration + dictionary keys together).
- **Definition of done:** `npm run typecheck`, `npm test`, `npm run build` all green; smoke-test affected pages; update this document.

## 19. High-Value File Index

| Task | Read these files first |
|---|---|
| Understand architecture | `README.md`, `src/middleware.ts`, `src/lib/api.ts`, `src/lib/resources.ts`, `src/lib/crud.ts` |
| Modify authentication | `src/lib/auth.ts`, `src/app/api/auth/session/route.ts`, `src/app/api/auth/password/route.ts`, `src/middleware.ts` |
| Update permissions | `src/lib/rbac.ts`, `src/lib/resources.ts`, `src/components/layout/AppShell.tsx` |
| Change the database | `prisma/schema.prisma`, `src/lib/schemas.ts`, `src/lib/resources.ts`, `prisma/seed.ts` |
| Update quotations/pricing | `src/lib/calc.ts`, `src/components/modules/QuoteBuilder.tsx`, `src/app/api/quotations/route.ts`, `src/app/api/quotations/[id]/route.ts`, `src/lib/quotation-helpers.ts`, `src/app/(app)/quotes/[id]/print/page.tsx` |
| Acceptance→project flow | `src/app/api/public/quote/[token]/route.ts`, `src/lib/project-creation.ts`, `src/app/public-quote/[token]/page.tsx` |
| Add a CRM module | `src/components/ui.tsx`, pattern example `src/components/modules/Companies.tsx` + `src/app/(app)/companies/page.tsx`, plus `resources.ts`, `schemas.ts`, `rbac.ts` |
| Fix dashboard/stats | `src/lib/stats.ts`, `src/app/(app)/dashboard/page.tsx`, `src/components/charts.tsx` |
| Inventory/stock | `src/app/api/purchases/route.ts`, `src/app/api/inventory/movement/route.ts`, `src/components/modules/Inventory.tsx` |
| Invoicing/payments | `src/app/api/invoices/route.ts`, `src/lib/invoices.ts`, `src/lib/invoice-state.ts`, `src/lib/numbering.ts`, `src/components/modules/Finance.tsx`, `src/app/api/[resource]/[id]/route.ts` |
| Automations/notifications | `src/lib/automations.ts`, `src/app/api/cron/run/route.ts`, `src/app/api/notifications/route.ts`, `src/app/(app)/dashboard/strings.tsx` |
| i18n/formatting | `src/i18n/dictionaries.ts`, `src/i18n/LanguageProvider.tsx`, `tests/i18n.test.ts` |
| Design system/UI kit | `src/app/globals.css`, `src/components/ui.tsx` |
| Deploy/backups | `docker-compose.yml`, `Dockerfile`, `scripts/backup.sh`, `.env.example` |
| Run/extend tests | `tests/calc.test.ts`, `tests/rbac.test.ts`, root `package.json` |

## 20. Current Repository Snapshot

- **Generated/updated:** 2026-08-27
- **Git:** initialized and synchronized before this documentation refresh. `main` tracks `origin/main`; PR #1 merged the command-center redesign. `codex/command-center-ui` tracks its remote review branch. This Markdown refresh is the only current working-tree change set.
- **Application version:** `chromeway-crm` 1.0.0
- **Installed versions:** next 15.5.24, react 19.2.8, @prisma/client 6.19.3, tailwindcss 4.3.3, zod 3.25.76, typescript 5.9.3, eslint 9.39.5, sharp 0.35.3
- **Migrations:** all 4 applied locally; local Compose DB is seeded with demo data. The fourth data-only migration renames the seeded administrator to Κώστας Κατσίνας and updates the seeded mention; it will apply to hosted databases on their next deployment.
- **Last application verification (2026-08-27):** `npm test` 23/23 assertions pass · `npm run typecheck` clean · `npm run lint` clean · production build succeeds · authenticated core-route smoke checks pass. Last documented dependency audit (0 vulnerabilities) and Docker image build are from 2026-08-26.
- **Hosted demo:** `https://chromeway-crm.onrender.com` (Render Docker Free instance + Neon Postgres; `main` auto-deploy; local uploads ephemeral).

## 21. Context Refresh Rules

Update this file whenever a significant change lands in architecture, technology stack, database schema, authentication or permissions, main workflows, environment variables, build/deployment process, or major feature status — including resolving items in §16/§17.

> Future AI assistants: Read this file first. Do not scan the entire repository unless the current task requires it, referenced files are missing, or the repository has changed substantially since this context was generated. Verify affected files before making changes, and update this document when your work changes any documented behavior.
