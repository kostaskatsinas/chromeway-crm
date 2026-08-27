
# Chromeway CRM — User & Setup Guide

Premium studio management CRM for **Chromeway**, a Greek decorative-finishes studio (Athens · Peloponnese · Greece).

It manages the complete customer and project lifecycle:

**Lead → Consultation → Site Visit → Sample → Quotation → Approval → Scheduling → Project Execution → Quality Control → Invoice → Payment → After-Sales**

Greek is the default interface language, with English dictionary coverage across the core shell and workflows; some newer operational labels remain Greek. Currency EUR, VAT 24%, Greek date/number formats.

**Current status (27 August 2026):** the complete MVP and the command-center UX redesign are merged into `main`. The redesign adds a compact expandable navigation rail, an operations-focused overview, attention filters in Pipeline, timeline-first contact details, improved project hierarchy, and a mobile bottom navigation. The deployed prototype is available at [chromeway-crm.onrender.com](https://chromeway-crm.onrender.com).

---

## 1. Quick Start

Requirements: Node.js 22+, Docker.

```bash
docker compose up -d db     # start PostgreSQL
npm install                 # install dependencies
npm run db:migrate          # create database tables
npm run db:seed             # load realistic demo data (wipes existing data!)
npm run dev                 # start the app → http://localhost:3000
```

### Demo accounts — password `Chromeway2026!`

| Email | Role | Sees |
|---|---|---|
| admin@chromeway.gr | Administrator | Everything + settings, users, audit |
| sales@chromeway.gr | Sales | Pipeline, contacts, quotes, visits, tasks |
| pm@chromeway.gr | Project Manager | Almost everything incl. project financials |
| tech@chromeway.gr | Technician | Visits, catalogue, projects (no money), tasks, calendar |
| logistis@chromeway.gr | Accountant | Finance, inventory, reports, dashboard |
| collab@chromeway.gr | Collaborator | Projects, calendar, tasks only |

> The seeder prints these accounts again on every run. Demo data includes hotels in Vouliagmeni, restaurants in Glyfada, villas in Ekali/Porto Heli, a completed project with invoices, stock movements, and pipeline entries at every stage.

### 🌐 Online demo (prototype)

This repo ships with a Render Docker + Neon Postgres prototype recipe: see **[DEPLOY_DEMO.md](./DEPLOY_DEMO.md)**. The current service uses Render's Free instance behavior, including idle spin-down and an ephemeral local filesystem; it is a demonstration environment, not production hosting.

---

## 2. First Login

1. Open **http://localhost:3000** → you are redirected to `/login`.
2. Enter email + password → **Σύνδεση** (Sign in).
3. Top-right **ΕΛ / EN** toggles the whole interface language.
4. Forgot password? Click **Ξεχάσατε τον κωδικό;** — enter your email. In development the reset link is shown on screen (in production it would be emailed). Set a new password (min 8 chars) from the link.
5. Change your own password any time: top-right avatar → **Ρυθμίσεις** (Settings) → *Το προφίλ μου* → fill current + new password → save.

---

## 3. Understanding the Interface

- **Desktop command rail**: the compact dark rail groups modules into *Πωλήσεις* (Sales), *Παραγωγή* (Delivery), and *Λειτουργίες* (Operations). Hover it to reveal labels. Items you lack permission for are hidden by role. Clicking the Chromeway brand opens **Επισκόπηση** (`/dashboard`).
- **Top bar**: role-aware **Δημιουργία** menu, global search (type ≥2 letters — finds contacts, companies, opportunities, quotes, projects, visits), language toggle, notification bell 🔔, user menu. Press **Cmd/Ctrl+K** to open the command center for navigation, record search, creation shortcuts, or one-step activity logging.
- **Notifications** arrive automatically from automations and events (stale quotes, low stock, upcoming payments…). Bell shows unread count; open one to jump to the record; *Σήμανση όλων ως αναγνωσμένα* marks all read.
- **Επισκόπηση / Dashboard** is the default home after login. KPI cards appear first (leads, opportunities, quotes, visits, projects, tasks, outstanding invoices, monthly revenue/expenses/profit, and conversion). The monetary **Αξία pipeline** KPI is intentionally omitted. Below, the operations command center combines today's work, pipeline attention, project health, and progressively disclosed analytics.
- **Pipeline attention** filters isolate records due today, overdue, or missing a next action. Pipeline, quotes, visits, projects, tasks, and finance keep their active filters in the URL, so views can be bookmarked or shared.
- Contacts, projects, and quotes support row selection, CSV export, persistent column visibility, and comfortable/compact density. Authorized users also get safe bulk status workflows for projects and expired quotations.
- Contact details prioritize the activity timeline, with essential information, internal comments, and files in a sticky side column. Project details keep status, progress, and primary actions visible in a sticky header.
- The task board supports keyword, assignee, priority, and “my tasks” filters; desktop cards have one-click completion and mobile cards expose a status selector.
- **Mobile/tablet**: the bottom navigation starts with **Επισκόπηση**, followed by **Pipeline**, **Έργα**, and **Περισσότερα**. Search remains available from the top bar and expands to a full-screen panel. Modals fit the viewport, and Pipeline cards provide a touch-friendly status selector.

---

## 4. Scenario Walkthroughs

### Scenario A — A new private customer calls about a villa renovation

1. **Επαφές** (Contacts) → **+ Νέα επαφή**. Fill name, mobile, email. Set *Τύπος επιχείρησης* = Ιδιώτης (Private customer), *Πηγή γνωριμίας* (source) = Συστάσεις/Instagram/Website…. Tick **GDPR consent** when they agree — the consent date is stamped automatically. Optionally tag (`villa`, `Αθήνα`).
2. Go to **Pipeline** → **+ Νέα ευκαιρία**. Title it (e.g. «Βίλλα Εκάλη — ισόγειο»), pick the contact, set city/region, estimated m², requested finish, **estimated value €**, probability %, expected decision date, source, assignee, and a concrete **next action** (+date).
3. The card appears in **Νέο lead** column. Every time someone works the lead, drag it right: *Επικοινωνήσαμε → Προκρίθηκε → …*
4. Log every call/email on the record so automations don't flag it as unanswered: open the opportunity → *Χρονολόγιο* → **+ Καταγραφή επικοινωνίας**, or do it from the contact's page.
5. **Lost?** Drag to *Χάθηκε* and pick a loss reason (price, competitor, went silent…) — this feeds conversion reports. **Postponed?** Use *Σε αναμονή* with a future next-action date.

> Automation: a lead sitting untouched in *Νέο lead* for 2+ days automatically creates a HIGH-priority follow-up task. Leads without contact for 5+ days notify their assignee.

### Scenario B — An architect partner brings a hotel project

1. **Επιχειρήσεις** → **+ Νέα επιχείρηση**: type Ξενοδοχείο, ΑΦΜ, ΔΟΥ, contacts.
2. Add the people: open the company later or create **Επαφές** directly with *company* selected (e.g. technical director + general manager) — both become visible under the company's decision-makers list.
3. Create the opportunity linked to both company and person (Scenario A step 2).
4. Schedule the first consultation: either from **Ημερολόγιο** → **+ Νέο συμβάν** (type *Συνάντηση πελάτη*) or go straight to scheduling the site visit (Scenario C).

### Scenario C — Site visit with measurements (works great from a phone)

1. **Επισκέψεις χώρου** → **+ Νέα επισκεψη χώρου**: title, contact, date/time, duration, address, assignee, purpose («Αποτύπωση», «Έλεγχος υποστρώματος»). Access limitations (stairs, noise hours, parking) go in *Περιορισμοί πρόσβασης*.
2. On site, open the visit. For each room/surface tap **+ Προσθήκη μέτρησης**: area name (*Καθιστικό — τοίχος Α*), surface type (wall/floor/ceiling/column…), substrate material, and dimensions. **m² computes automatically** (L×W for floors, L×H for walls) — or type the area directly. Note surface condition (*σκασμένος σοβάς*) and required prep (*αστάρωση isolation*).
3. Take photos → upload via the gallery box (images are auto-compressed + thumbnails generated).
4. When done tap **✓ Ολοκλήρωση επίσκεψης**. If the customer never showed, mark *Δεν εμφανίστηκε πελάτης* to keep history honest.
5. Produce the deliverable: **Έκθεση / PDF** opens a print-ready measurement report (totals per surface, conditions, photos) — print or save as PDF from the browser dialog.

> Automation: scheduled visits trigger a reminder notification ~24h before (configurable).

### Scenario D — Customer wants physical samples

1. **Φινιρίσματα & Δείγματα** → tab *Δείγματα πελάτης* → **+ Νέο δείγμα**: choose finish, customer, size (e.g. 30×40 cm), production cost, what you charged.
2. Work the lifecycle with one click: status starts *Ζητήθηκε* → *Σε παραγωγή* → button **Παράδοση** when handed over → then **✓ Έγκριση** or rejection. Approved samples often reference the future quotation.
3. Record the customer's words in *feedback* + star rating — this is your finish-quality memory.

The **Κατάλογος φινιρισμάτων** tab is your master library: each finish holds code (CW-VP-01…), technique, suitable surfaces, suppliers, gloss level, material cost €/m², suggested price €/m², labour h/m², layer count, drying times, instructions, and where the physical sample lives (*Βιτρίνα Α-1*). Archive old finishes instead of deleting — they stay available for history.

### Scenario E — Build and send a quotation

1. **Προσφορές** → **+ Νέα προσφορά**. Pick the customer and project name/address. Language Ελληνικά or English sets the printed document.
2. **Add lines**: for application work choose type *Εφαρμογή φινιρίσματος*, then select a **finish from the catalogue — unit price, internal cost and labour hours auto-fill**. Edit quantity. Preparation, labour-days, travel, scaffolding, accommodation and subcontractor lines have dedicated types; quick-add buttons exist for prep and labour.
3. Right panel — tune commercial parameters: waste % (default 5), markup % (default 35), discount %, VAT % (24). Totals update live: net, ΦΠΑ, gross. The dashed **profitability card** shows internal cost and margin % — this never reaches the customer.
4. Set validity date, expected duration in days, warranty months, and edit terms/exclusions/notes (they print on the document).
5. **Payment schedule**: default 40/40/20 with due-day offsets; add/remove instalments — the % sum indicator must show 100.
6. **Save** (creates number `CW-Q-2026-0001`). Then **✈ Σύνδεσμος πελάτη**: the quote is marked *Απεστάλη* and a secure link is copied to your clipboard — send it by email/chat. The customer sees a branded page with lines, totals, schedule, terms, and two buttons:
   - **Accept** → quote becomes *Αποδεκτή*, the pipeline opportunity flips to *Κερδήθηκε*, **and a project is created automatically** (see Scenario F).
   - **Decline** → optional feedback recorded, you get notified.
7. Customer asks for changes? **+ Νέα έκδοση** clones everything into v2 under the same group; adjust and re-send. Old versions remain for comparison.
8. Need a PDF attachment instead? **▤ PDF** opens the formal quotation letterhead (your saved link is also shown there).

> Automation: quotations unanswered 5+ days after sending raise a stale-quote notification.

Try it yourself with seeded data: `/public-quote/demo-token-kyma-sent`.

### Scenario F — Run the project end-to-end

When a quote is accepted, **Προσφορά έργου** exists already: code `CW-P-2026-00N`, contract value, estimated cost/hours copied over, QC checklist preloaded. Find it under **Έργα** (or create manually: **+ Νέο έργο**, optionally picking an accepted quote to prefill).

1. **Plan:** open the project → *Επισκόπηση*: set start/planned-end dates, PM, team members, scope text. Break work down in the *Εργασίες* tab — add tasks with assignee, priority, due date, **milestones** (◆) and dependencies («after priming»). Drag cards across To-do / In-progress / Done.
2. **Execute daily:** *Ημερολόγιο εργασιών* tab → pick date, team member, hours, note; tick *Υπήρξε πρόβλημα* when something goes wrong (delays stay visible forever). Total hours accumulate against the estimate.
3. **Customer asks for extras:** *Πρόσθετες εργασίες* tab → add title, description, charge amount and internal cost. Mark **Έγκριση πελάτη** once confirmed — approved amounts feed the final invoice conversation.
4. **Track:** slide *Πρόοδος %*, change status as work proceeds (Σχεδιασμός → Προγραμματισμένο → Σε εξέλιξη → Ποιοτικός έλεγχος → Ολοκληρώθηκε). Setting *Ολοκληρώθηκε* stamps the actual end date.
5. **Quality control:** tick through the checklist (surface prep verified, coats checked, final light inspection, cleaning, portfolio photos). Mark **Έγκριση πελάτη** at handover.
6. **Money view** (*Οικονομικά* tab, PM/Admin/Accountant): contract value + approved change orders vs actual expenses and labour → profit & margin cards, estimated-vs-actual bars for cost and hours, all project expenses and invoices listed.
7. **Photos:** the *Φωτογραφίες* tab keeps the before/during/after story — gold for the portfolio and social media.

> Automations: if actual cost or hours exceed estimates (tolerance 110%) or the planned end date passes while active, the PM gets an overrun alert. Three days after completion, a "request customer feedback" task appears if no rating exists yet.

### Scenario G — Calendar and team coordination

Open **Ημερολόγιο**. Switch Ημέρα/Εβδομάδα/Μήνας; ‹ › navigate; *Σήμερα* returns.

- **+ Νέο συμβάν**: title, start/end, type (site visit, sample production, project work, delivery, customer meeting, payment deadline, follow-up, internal meeting) — each type has its colour, legend above the grid. Assign a person, attach a contact/project/visit, set reminder minutes, location, notes.
- **Conflict detection:** choosing an overlapping slot for an assigned person shows ⚠ *προσοχή: υπάρχουν άλλες δεσμεύσεις* — in the modal and in day view.
- Recurring events (weekly site days, monthly reviews): set *Επανάληψη* + interval.
- Filter the whole board by assignee to answer "where is Γιώργος on Thursday?".
- Payment deadlines can be created manually or appear from invoice due dates; overdue ones turn red in lists elsewhere.

### Scenario H — Materials, suppliers and stock

1. **Υλικά & Απόθεμα** → *Προμηθευτές* → add suppliers (Graesan, Novacolor…).
2. *Υλικά* → **+ Υλικό**: code (MT-VP-BASE…), name, category, unit (kg, lt, m²…), supplier, **minimum stock** — enable batch tracking where lot numbers matter (microcement).
3. Goods arrive → *Αγορές* → **+ Αγορά**: date, supplier invoice no., add lines (material, qty, unit price — prefilled from last price, lot no.). Save → **stock increases automatically** and average purchase price recalculates.
4. Team consumes material on a project → open the material's **Κίνηση**: *Κατανάλωση σε έργο*, quantity, pick the project, lot no., note. Stock decreases; full movement history stays auditable.
5. Stock at/below minimum turns red with *Χαμηλό απόθεμα* badge and notifies Admin+PMs. Physical count off? Use *Προσαρμογή απογραφής*. Returns use *Επιστροφή*.

### Scenario I — Invoicing and getting paid

Everything under **Οικονομικά**, tabs *Τιμολόγια / Πληρωμές / Έξοδα*.

1. **Deposit (pro forma):** *+ Νέο τιμολόγιο*, kind **Pro forma**, pick customer (+project), issue date, due date. Fastest path: choose an **accepted quotation** and the lines import automatically. Save → number like `CW-PF-2026-0001`, status Εκδοθέν.
2. **Money arrives:** **Εισπραξη** button on the invoice row → amount (balance pre-filled), method (IBAN/e-banking/card/cash/cheque), date, bank reference. Status flips *Μερική εξόφληση* or *Εξοφλημένο* automatically.
3. **Final invoice** at handover: kind Τελικό, remaining amounts (or prefill from the accepted quote again) → `CW-INV-2026-000N`. Past-due unpaid invoices show **Ληξιπρόθεσμο** in red everywhere.
4. Mistake/abatement: issue kind **Πιστωτικό** (credit note, `CW-CN-…`).
5. **Expenses:** *Έξοδα* tab → category (materials, subcontractor, travel, equipment rental…), vendor, amount, VAT, date, optionally link to a project (then it appears in that project's cost picture). Attach receipts from the project/contact galleries.
6. Accountant hand-off: **Αναφορές → Ανεξόφλητα** lists every open balance with age; CSV export gives a clean spreadsheet (Excel-safe UTF-8).

> Automation: invoices due within 3 days (or overdue) notify Admin+Accountant repeatedly but politely; due dates also land on the calendar.

### Scenario J — Never lose the thread: tasks, timeline, comments

- **Εργασίες** board: personal/team workload at a glance. Tasks can belong to a project or float alone; priorities Χαμηλή→Επείγουσα colour-code urgency; overdue dates glow red. Milestones (◆) mark phase gates; dependencies prevent out-of-order completion plans.
- Every contact/opportunity/project has a **Χρονολόγιο**: log calls (with direction and duration), emails, SMS, meetings, plain notes. This is the institutional memory — "what did we promise on March 3rd?"
- **Σχόλια** are strictly internal (@mention teammates); they never reach customers. Use them on any record for context the next person will thank you for.

### Scenario K — Reports: the Monday-morning review

**Αναφορές** — four tabs:

| Tab | Answers |
|---|---|
| *Πωλήσεις* | Where do leads come from? Conversion rate won/lost? Average quote & project value? Money stuck per pipeline stage? Who are repeat customers? |
| *Οικονομικά* (PM+) | 12-month revenue vs expenses bars, gross profit, margin %, revenue split by region and customer type |
| *Παραγωγή & Ομάδα* | Logged hours per team member; top consumed materials |
| *Ανεξόφλητα* | Who owes what, since when (overdue flagged) |

Every table has **CSV** export (opens correctly in Excel with Greek characters). Filters: date/status/region/customer/service/person.

### Scenario L — Administrator duties

**Ρυθμίσεις** (Admin only):

- *Χρήστες & ρόλοι* → add teammates (role decides everything they see), set hourly rate (feeds project labour costing!), colour (calendar/avatar), deactivate leavers (history preserved).
- *Στοιχεία επιχείρησης* → company name, ΑΦΜ, IBAN, phone — used on documents and payment info. Default VAT rate.
- *Αυτοματισμοί* → eight switches: lead follow-ups, unanswered leads, visit reminders, stale quotes, auto-project-on-acceptance, payment reminders, overrun alerts, feedback requests. Each shows its last run.
- **Audit trail:** every create/update/delete is logged (who, when, IP, before/after values) in the `audit_logs` table — reviewable via Prisma Studio (`npm run db:studio`).

### Scenario M — Data hygiene & GDPR

- Consent ticks on contacts stamp timestamps automatically; marketing opt-in is separate — honour it.
- Deleting is **soft**: records disappear from lists but remain recoverable in the database (`deletedAt`), so accidental deletions are reversible by an admin.
- Backups: run `scripts/backup.sh <dir>` (database dump + uploaded files, automatic pruning). Schedule it daily via cron — see script header.

---

## 5. Reference

**Numbering**

| Document | Format |
|---|---|
| Quotation | `CW-Q-2026-0001` (versions: `-v2`) |
| Project | `CW-P-2026-001` |
| Final invoice | `CW-INV-2026-0001` |
| Pro forma | `CW-PF-2026-0001` |
| Credit note | `CW-CN-2026-0001` |

**Status vocabularies** (all translatable EL/EN)

- Opportunity: Νέο lead → Επικοινωνήσαμε → Προκρίθηκε → Επίσκεψη προγραμματισμένη → Ζητήθηκε δείγμα → Εκπόνηση προσφοράς → Αποστολή προσφοράς → Διαπραγμάτευση → **Κερδήθηκε / Χάθηκε / Σε αναμονή**
- Quote: Πρόχειρη → Απεστάλη → Εθεάθη → Αποδεκτή/Απορρίφθηκε/Έληξε
- Project: Σχεδιασμός → Προγραμματισμένο → Σε εξέλιξη → (αναμονή) → Ποιοτικός έλεγχος → Ολοκληρώθηκε / Ακυρώθηκε
- Visit: Προγραμματισμένη → Ολοκληρώθηκε / Ακυρώθηκε / Δεν εμφανίστηκε
- Sample: Ζητήθηκε → Σε παραγωγή → Παραδόθηκε → Εγκρίθηκε/Απορρίφθηκε
- Invoice: Εκδοθέν → Μερική εξόφληση → Εξοφλημένο / Ληξιπρόθεσμο
- Task: Προς εκτέλεση → Σε εξέλιξη → Ολοκληρώθηκε (priorities: Χαμηλή/Μεσαία/Υψηλή/Επείγουσα)

**Automations** (toggle in Settings → Αυτοματισμοί): lead follow-up task (2d), unanswered leads (5d), visit reminders (24h), stale quotes (5d), project-on-acceptance, payment reminders (3d before due), overrun alerts (>110% cost/time or late), post-completion feedback request (3d). They run hourly while the app is used, plus via cron: `curl "http://localhost:3000/api/cron/run?secret=$CRON_SECRET"`.

**Roles × capabilities (summary)**

| Action | Admin | Sales | PM | Tech | Accountant | Collab |
|---|---|---|---|---|---|---|
| Pipeline edit | ✓ | ✓ | ✓ | — | — | — |
| Quotes (create/edit) | ✓ | ✓ | ✓ | — | — | — |
| See quote costs/margins | ✓ | — | ✓ | — | — | — |
| Project financials | ✓ | — | ✓ | — | ✓ | — |
| Finance edit (invoices/expenses) | ✓ | — | read | — | ✓ | — |
| Inventory edit | ✓ | — | ✓ | ✓ | read | — |
| Settings/users | ✓ | — | — | — | — | — |

---

## 6. Developer Reference (condensed)

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript strict · Prisma 6 + PostgreSQL 16 · Tailwind CSS 4 · JWT auth (jose + bcryptjs) · Zod · sharp · Recharts · node:test.

```
src/app/(app)/        module pages (dashboard … settings)
src/app/api/          REST API ({ok,data} envelope, RBAC via handler wrapper)
src/components/       ui.tsx kit + modules/* client components + AppShell
src/lib/              auth, rbac, calc, stats, automations, crud registry…
src/i18n/             el/en dictionaries (el = default), Intl formatters
prisma/schema.prisma  35 models, soft deletes, audit log
tests/                unit tests (calc, rbac, i18n, utils)
scripts/backup.sh     db + uploads backup with retention
```

Useful AI-assistant context file: [`AI_PROJECT_CONTEXT.md`](./AI_PROJECT_CONTEXT.md) — architecture, API map, business rules, safe-modification guidelines.

**Commands**

```bash
npm run dev          # development server (:3000)
npm run build        # production build (includes prisma generate)
npm start            # serve production build
npm test             # unit tests
npm run lint         # ESLint (flat config)
npm run typecheck    # tsc --noEmit
npm run db:migrate   # prisma migrate dev
npm run db:seed      # demo data (destructive)
npm run db:studio    # Prisma Studio GUI
```

**Environment variables** (see `.env.example`): `DATABASE_URL` (required) · `AUTH_SECRET` (required in prod, min 32 chars) · `APP_URL` (base URL for links) · `UPLOAD_DIR` (default `./uploads`) · `CRON_SECRET` (protects automation endpoint).

**Production deployment**

```bash
export POSTGRES_PASSWORD="strong-password"
export AUTH_SECRET="$(openssl rand -hex 32)"
export CRON_SECRET="$(openssl rand -hex 32)"
export APP_URL="https://crm.chromeway.gr"
docker compose up -d --build
```

App serves on :3000 behind your TLS reverse proxy; migrations apply automatically; volumes persist DB and uploads. Schedule daily backups via cron.

For the current hosted prototype (`main` → Render auto-deploy, Neon database, ephemeral uploads), follow [`DEPLOY_DEMO.md`](./DEPLOY_DEMO.md).

**Health monitoring:** `GET /api/health` → 200 `{status: "healthy", db: "up", latencyMs}` or **503** when the database is unreachable. It's public (no auth), used by the Docker healthcheck, and safe to plug into uptime monitors.

---

## 7. Tips from the Workshop Floor

- Always log the call *before* hanging up — the timeline is why the next person sounds informed.
- Photograph substrate damage during visits; those photos settle preparation disputes later.
- Quote from catalogue finishes so costs stay truthful; adjust markup per client segment instead of editing line prices ad hoc.
- Link every expense to its project the day it happens — month-end margin reviews take minutes then.
- The secure customer link is your closing tool: acceptance is one tap for them and instantly creates the project for you.
