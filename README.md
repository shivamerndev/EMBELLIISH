# Embellish ERP — building and running it

`README.md` tells the business story. This file is how the software that
implements it is put together, and how to run it.

---

## Running it

Prerequisites: Node 18+ and MongoDB. If there is no MongoDB on the machine, set
`USE_MEMORY_DB=true` in `server/.env` and one is started inside the server
process instead (data in `server/.mongo-data`; seed first, then start).

```bash
# Backend
cd server
cp .env.example .env          # then set JWT_SECRET
npm install
npm run seed                  # Mr. Hiral's villa, from the real consumption sheet
npm start                     # http://localhost:5000

# Frontend, in a second terminal
cd client
npm install
npm run dev                   # http://localhost:5173
```

Sign in with any seeded account — password `Embellish@2026`:

| Email | Person | Role |
|---|---|---|
| `admin@embellish.com` | Hitesh Sharma | Admin — sees everything |
| `rahul@embellish.com` | Rahul Verma | DCM — owns the project |
| `coordinator@embellish.com` | Ankit Gupta | Project Coordinator — measurements, BOQ |
| `factory@embellish.com` | Suresh Patil | Factory Manager |
| `qc@embellish.com` | Meena Iyer | QC Inspector |
| `installer@embellish.com` | Hasan Ali | Installer |
| `accounts@embellish.com` | Neha Bansal | Accountant |

The seed leaves the project at the **Consumption Sheet** stage, so the rest of
the spine can be driven by hand from the UI.

### Scripts

| Command | What it does |
|---|---|
| `npm run seed` | Reset and load the story data |
| `npm run demo:workflow` | Drive one project Lead → Closure through the real services, and verify the business rules refuse what they should |
| `npm run verify:consumption` | Check the calculation engine against the signed reference sheet |
| `npm run smoke` | Call every endpoint the web client uses (server must be running) |

---

## The consumption engine

Step 6 is the part of the ERP that actually computes something, so its formulas
were derived from the signed sheet in `docs/Cunsumption_Sheet.jpeg` (Mr. Hiral —
Bunglow 1, 09.04.2026) rather than invented:

| Quantity | Formula | Verified against |
|---|---|---|
| Running feet | `ceil(width_inch / 12)` | 236.2″→20, 143.6″→12, 157.5″→14, 300″→25 |
| Height per panel | `(height_inch + 12) × 0.0254` m | 121.9″→3.40, 122.4″→3.41, 103.3″→2.93 |
| Panel count | `width × fullness / usable bolt width` | 236.2″ @ 2.5× / 49″ → 12.05 |
| Drape metres | `rounded panels × height per panel` | 12 × 3.4009 → 40.81 |
| Blind area | `ceil(width × height / 144)` sq ft | 48″×120″→40, 33.4″×103.3″→24 |

`npm run verify:consumption` reproduces the sheet's own column totals — **142.00
running feet** and **190.00 sq ft** — from its individual rows. The 12″ height
allowance, 2.5× fullness and bolt widths are defaults, overridable per fabric and
per window, because the reference sheet itself shows them varying room to room.

Where the surveyor overrode a panel count by hand (a sheer forced to match its
main curtain), that is stored as `partsOverride` and shown with an asterisk,
rather than the engine silently disagreeing with the paper.

---

## How the workflow is enforced

The 21 steps are encoded as data in `server/src/constants/workflow.constants.js`
— an ordered stage list plus the gate conditions each stage requires. The
conditions are answered in `modules/project/project/project.gates.js`, and only
`ProjectService.advanceStage` may write `project.stage`.

Consequences that fall out of that:

- **A stage cannot be skipped.** Quotation → Production is refused.
- **Production cannot start before Step 10.** Token, advance, design approval and
  measurements must all be satisfied before a project becomes Active, and work
  orders are refused until it is.
- **Installation cannot be scheduled before the balance clears** (Step 18). The
  check lives in the installation service too, so scheduling a single room is not
  a way around it.
- **Nothing is cut against an unsigned ready size** (Step 4, below).
- **A project cannot close with an open snag**, or with money outstanding.
- **Only `CLEARED` payments count.** An uncleared cheque does not open a gate.
- **A discount past the house limit stalls the quotation** until the founder
  signs it off, and the DCM who asked cannot be the one who signs.

Every refusal names the specific unmet condition, which the project workspace
renders on the timeline — the ERP explains itself instead of greying out a button.

`npm run demo:workflow` drives all of this and deliberately attempts nine
forbidden actions, reporting whether each was correctly refused.

---

## Ready Size — Step 4

The FRD comes back to this more than anything else, because it is the company's
most expensive recurring mistake: the window is 10 feet, the curtain has to touch
the floor, so the finished piece is 10.5. Storing only the opening and letting
each department re-derive the finished size is how a curtain ends up two inches
short.

So the two are separate stored facts:

| | Where it lives | Who sets it |
|---|---|---|
| **Window size** | `measurement.o2o` / `.f2f` | the surveyor, at site |
| **Ready size** | `measurement.readySize` | derived from the window plus the project's ready allowances, or typed in when the window hangs differently |

Ready size is what the consumption engine computes every quantity from, what the
work order tells the cutting table, and what QC measures the finished piece
against. It carries its own sign-off, and:

- `PRODUCTION` will not be entered until **every** window is signed off —
  the `readySizeConfirmed` gate.
- Work orders are refused if a ready size was signed off **after** the current
  consumption sheet was costed, because the fabric metres came from the old drop.
  The sheet has to be regenerated so the two agree.
- Editing anything the finished size depends on **retracts** the sign-off.
- At QC, a piece measuring more than half an inch off the signed size fails the
  size check automatically, whatever the inspector ticked.

The allowances default to zero because the surveyor on the reference sheet
already recorded finished drops. A project that measures to the opening instead
sets them once, in Settings → Calculation defaults.

---

## Layout

```
server/src/
  core/            BaseRepository · BaseService · BaseController · crudRouter
                   defineModule · ApiError · sequence · registerModels
  constants/       workflow (stages + gates) · roles + permissions · product vocabulary
  services/        consumption.service.js  ← the calculation engine, pure and testable
  modules/
    crm/           lead · client · architect · followup · quotation
    project/       project · room · measurement · sitevisit · boq
                   design · drawing · installation · snag
    inventory/     fabric · motor · accessory · vendor · stock · purchase
    production/    production · stitching · qc · packing · dispatch
    accounts/      invoice · payment · transaction
    reports/
    pricing/       the published rate list a quotation is costed from
    settings/      company details, thresholds, calculation defaults (singleton)
    notification/  the in-app inbox other modules write to
    documents/     proposal / quotation / invoice PDFs

client/src/
  api/             one file listing every endpoint
  components/ui/   the shared kit — Panel, Table, Modal, Badge, StatTile…
  features/        auth and workflow-vocabulary slices
  hooks/           useAsync / useAction
  pages/
    project/       ProjectWorkspace + StageTimeline + nine workflow tabs
    settings/      company, business rules, calculation defaults, pricing master
```

Modules that are genuinely plain CRUD (fabrics, vendors, accessories) are wired
with `defineModule` in a single file. Modules with real rules — projects, BOQs,
payments, production, QC — have explicit service and controller files.

### Adding a module

1. Write `<name>.model.js`.
2. Write `<name>.routes.js` calling `defineModule({ model, label, … })`, or hand-write
   a service and controller if it has business rules.
3. Register the route in `src/routes/index.js`.
4. Import the model in `src/core/registerModels.js` so `populate` can resolve it.

---

## Conventions

- **One response envelope**: `{ success, message, data }` for everything. The
  client's axios interceptor unwraps it once, so no component reaches through
  `response.data.data`.
- **One identifier**: `id`. Lean queries are normalised in `BaseRepository` so a
  list and a single document agree.
- **Permissions, not job titles.** Routes guard on a capability
  (`boq:manage`), and the role→permission map is the only thing to edit when a
  role changes. Permissions resolve from the role on every request, so revoking
  one takes effect immediately rather than when the last token expires.
- **Snapshots are immutable.** Regenerating a BOQ or quotation supersedes the
  previous revision rather than editing it — a sheet that has been quoted or
  purchased against must stay as it was.
- **Money is stamped from an approved document.** `contractValue` comes from the
  approved quotation, and the 10 / 60 / 30 milestones are computed against it.
- **House rules are data, not constants.** The discount threshold, payment split,
  GST rate and calculation defaults live in the Settings singleton (module 20);
  chargeable rates live in the Pricing Master (module 7), versioned by date so a
  quotation raised in March still reprices to its March rate in June. A rate is
  resolved project card → published list → settings → engine default, and a
  stored zero never wipes out a live rate.

---

## Not implemented

Called out so nothing looks finished that is not:

- **Outbound email.** `mail.service.js` logs in development and refuses in
  production, so a quotation the client never received is never recorded as sent.
  In-app notifications (module 19) work regardless; the email copy is opt-in via
  Settings → Business rules and silently degrades when no provider is configured.
- **PDFs carry no images.** The proposal lists the fabrics, colours and hardware
  per room but not the design renders, and there is no company logo on the
  letterhead — `pdf.service.js` writes text, rules and fills only.
- **File uploads** work to local disk (`server/uploads`, served at `/uploads`) and
  to S3 when credentials are configured. The schemas carry attachment fields
  throughout, but the UI does not yet expose upload controls.
- `scripts/scaffold_modules.js` is retired and refuses to run; it generated the
  original placeholder modules and would overwrite working code with stubs.
