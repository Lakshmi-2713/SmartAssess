# SmartAssess — Change Log

A full audit, bug-fix and redesign pass over the codebase.

**Scope:** 56 files changed · 26 added · 3 removed
**Verification:** ESLint 66 problems → **0** · API suite **44/44** · Browser E2E **54/54** · production build clean

Every fix below was reproduced before the change and verified after, against a
real MongoDB and a real Chromium — not just read.

---

## ⚠️ Action required from you

Two things code cannot fix:

1. **Rotate the MongoDB Atlas password.** `backend/.env` was committed to git
   with a live Atlas connection string. It is now untracked and git-ignored,
   but it remains in git history (`git show HEAD:backend/.env`). Until the
   password is changed in Atlas, that database is reachable by anyone with the
   repo.
2. **Purge it from history if the repo was ever pushed** —
   `git filter-repo --path backend/.env --invert-paths`, then force-push.

`JWT_SECRET` has already been rotated to a 96-character random value.

---

## 1. Security

| Issue | Before | After |
|---|---|---|
| Failed login | **Granted a session anyway** | Fails closed; error shown |
| Authentication | None — 4 files were 0 bytes | JWT `protect` + `authorize(...roles)` |
| Password hash | Returned to the client on login *and* register | `select: false` + `toJSON` strip |
| API routes | All unauthenticated | Every route behind a session |
| Route access | Any page reachable by URL | `RouteGuard` per role |
| Credentials | Committed to git | Untracked, `.gitignore`, `.env.example` |
| Search input | Raw into `$regex` | Escaped |
| Rate limiting | None | Two-layer, per-credential + per-IP |
| Headers | Default Express | `nosniff`, `DENY`, referrer, permissions |
| CORS | `cors()` — fully open | Explicit origin allowlist |

### The headline bug

`Login.jsx` caught **every** failure and logged the user in regardless:

```js
} catch {
  saveAndGo({ name: preset.name, email, role: preset.key }, preset.redirectPath);
}
```

Wrong password, unknown user, server down — all granted a session. Now verified
by three E2E tests covering each path.

### Authorisation model

| Route | student | faculty | admin |
|---|:--:|:--:|:--:|
| `GET /api/students` | ✅ | ✅ | ✅ |
| `POST` / `PUT /api/students` | ❌ | ✅ | ✅ |
| `DELETE /api/students/:id` | ❌ | ❌ | ✅ |
| `/api/faculty/*` | ❌ | ✅ | ✅ |
| `/api/admin/*` | ❌ | ❌ | ✅ |

Enforced server-side; `RouteGuard` mirrors it client-side as a UX affordance only.

### Rate limiting

The first implementation keyed purely on IP, which would lock out an entire
campus behind one NAT gateway. Rewritten as two layers:

- **Per (IP + email)** — 10 failures, tight enough to stop password guessing
- **Per IP** — 200, stops one host spraying many addresses
- **Successful logins are refunded**, so a user who mistypes once then succeeds
  is never penalised

Verified: 10 wrong passwords → 429 on the 11th; a different account from the
same IP unaffected; 30 successful logins leave the budget untouched.

---

## 2. Data-integrity bugs

**Adding a student never persisted.** The client generated
`_id: "std_1699…"`, which cannot cast to ObjectId. Mongoose threw, the
controller returned 500, the frontend swallowed it — and reported *"Student
registered successfully"*. Every record was lost on refresh.

```
THROWS: ValidationError | Cast to ObjectId failed for value "std_1788337111751"
```

Fixed by a server-side field whitelist (also closing mass assignment) and by
not sending `_id`. E2E now asserts the record reaches the database **and**
survives a reload.

**Grading one student wiped every other student's result** for that test — the
filter matched on title alone:

```js
results.filter(r => r.title !== updatedSub.testTitle)   // removed everyone
```

**Per-question mark edits were discarded.** Only the total was saved; the
breakdown silently reverted on reopen.

**A zero mark became full marks** — `q.scoreGiven || q.maxMarks` treats a
legitimate `0` as falsy. Same bug in the scorecard: `parseInt(score) || 85`
turned 0% into a pass.

**Corrupt localStorage destroyed real data.** A parse failure fell through and
overwrote the key with seed data. Now it logs loudly and preserves the value so
it can be recovered by hand.

**Silent-failure pattern** across add/edit/delete — success toasts fired from
`finally` regardless of outcome, and delete removed the row even when the
server rejected it.

**Empty database showed 7 fake students** — `if (res.data.length > 0)` treated
a valid empty array as failure, so deleting everyone made the mock roster
reappear.

**Students saw each other's completion state.** Results were not filtered by
the signed-in student, and matching was by title against data that didn't line
up (`"Operating Systems"` vs `"Operating Systems Concepts"`). Now scoped per
student and keyed on `testId`.

---

## 3. Crashes and correctness

- **Corrupt `localStorage` white-screened the app** — `JSON.parse` unguarded
  during render in `Sidebar`, which every authenticated page mounts. Now safe,
  with an `ErrorBoundary` behind it.
- **Three case-mismatched imports** that build on macOS and fail on Linux/CI:
  `Sidebar`, `DashboardCard`, `Dashboard.css`. Renamed via `git mv`.
- **Hooks-order violation** in `GradeSubmissionModal` — early return above
  three `useState` calls.
- **Exam timer drifted** under background-tab throttling, handing back extra
  time. Now anchored to a wall-clock deadline.
- **Double submission** possible when the timer expired as the strike limit
  tripped. Guarded by a ref.
- **Camera stayed on** through the results screen; now released at submit.
- **`Date.now()` as an ID** collided within a millisecond; replaced with a
  monotonic generator.
- **Logout didn't log out** — a plain `<Link to="/">` left the session intact.
- **Sidebar menu came from the URL, not the role** — a student on `/tests` was
  shown the admin menu.
- **Wrong role chip rejected correct credentials.** Role filtering added no
  security, only a confusing failure mode; the server now returns the real role.

---

## 4. Proctoring engine

- **Camera disconnection was never recorded mid-exam.** The `onended` handler
  closed over `phase`, captured as `"instructions"` when the camera was
  requested — so `if (phase === "test")` could never be true. Now a ref.
- **HUD boxes misaligned on 16:9 webcams.** The overlay assumed no cropping
  while CSS used `object-fit: cover`. Now mirrors the cover transform.
- **HUD text rendered mirrored.** The canvas inherits `scaleX(-1)` to match the
  video; text is now un-mirrored locally.
- **Flood fill wrapped across row boundaries** — horizontal neighbours were
  bounds-checked against the flat buffer instead of the row, merging unrelated
  blobs at the frame edge.
- **Detection loop could overlap**, double-counting violation frames.
- **`blur` + `visibilitychange` double-counted one tab switch** as two.
- Added `roundRect` fallback for older Safari/Firefox, and audio nodes are now
  disconnected on end rather than accumulating across an exam.

---

## 5. API robustness

Before, these all returned **500**:

| Request | Was | Now |
|---|---|---|
| Malformed ObjectId | 500 | 404 |
| Missing required fields | 500 | 400 with field errors |
| Invalid role on register | 500 | 400 |
| Missing password | 500 (`bcrypt: Illegal arguments`) | 400 |
| `PUT` with a bad number | 500 | 400 (`runValidators`) |
| Search containing `(` | 500 (`Regular expression is invalid`) | 200 |
| `PUT` on a missing id | **200 with `null`** | 404 |

Added: central error handler, `asyncHandler`, `ApiError`, `/api/health`,
pagination, indexes, graceful shutdown, and real schema validation on both
models.

---

## 6. UI redesign

Rebuilt on a token system. To restyle the product, change the tokens — not the
components.

**`src/index.css`** — colour ramps, semantic surfaces, role identities,
typography scale, 4px spacing scale, radii, layered elevation, motion curves,
z-index scale.

**`src/styles/primitives.css`** — buttons, cards, stat tiles, forms, tables,
badges, modals, toasts, tabs, skeletons, empty states.

Every page redesigned: Login, Admin, Faculty, Student, Roster, Tests, Results,
Settings, Exam runner, plus a new 404.

**Theming**

- Light / dark / **system**, where system stamps no `data-theme` so the media
  query applies — and follows OS changes live via `matchMedia`
- 7 runtime accent palettes, with separate lighter values for dark mode
- Reduced-motion and high-contrast modes, plus `prefers-reduced-motion`
- Focus-visible rings throughout; ARIA roles on dialogs, radiogroups, alerts

**Layout bugs caught by screenshotting** (not visible in code review): clipped
action buttons in the faculty table, and filter controls stacking into three
rows. Verified at 390 / 768 / 1440px with zero horizontal overflow.

---

## 7. Seeding script — `backend/scripts/seed.js`

Creates or resets one account per role with **freshly generated random
passwords**, printed once. Reads `MONGO_URI` from `.env`, so it runs on any
machine. The API does **not** need to be running — it talks to MongoDB directly.

```bash
cd backend
npm run seed
```

```
  ROLE     EMAIL                      PASSWORD
  ───────  ─────────────────────────  ────────────────────
  admin    admin@smartassess.local    XtvG7-JtmTC-bvCmc#29  reset
  faculty  faculty@smartassess.local  k2Pkg-MQvEK-Smeiy#28  reset
  student  student@smartassess.local  LWZkt-znwea-sUmK2#23  reset
```

### Options

| Flag | Effect |
|---|---|
| *(none)* | admin + faculty + student |
| `--with-roster` | also seeds 6 sample students on the roster |
| `--roles admin,faculty` | only the roles you name |
| `--domain acme.edu` | `admin@acme.edu`, etc. |
| `--password 'MyPass1'` | fixed password instead of random |
| `--rotate-secret` | write a fresh `JWT_SECRET` to `.env` (backs up to `.env.bak`) |
| `--purge` / `npm run seed:purge` | delete everything it created |
| `--force` | override the production guard |

### Design notes

- **Passwords**: ~77 bits of entropy from an unambiguous alphabet (no `0/O`,
  `1/l/I`), grouped as `xxxxx-xxxxx-xxxxx#NN` so they are readable aloud and
  typeable — not the `Admin@123` class.
- **Hashing**: assigns and `save()`s through the Mongoose model so the
  pre-save hook hashes. A raw password is never written to the collection.
- **Idempotent**: re-running resets the password on existing accounts rather
  than erroring, so it is always a way back in.
- **Production guard**: refuses to run against a `mongodb+srv://` URI, anything
  matching `/prod/`, or `NODE_ENV=production`, unless `--force`.
- **Warns** if `JWT_SECRET` is missing, short, or a placeholder.

### Verified

- Generated passwords **actually authenticate** through `/api/auth/login`, all three roles
- Re-running resets rather than failing on duplicates
- `--with-roster` is idempotent (second run: `0 added`)
- `--purge` removes exactly the accounts for that domain
- Production guard blocks a simulated Atlas URI

---

## 8. Tests added

Both suites run against a live server. **Never point them at production** —
they create and delete records.

### `backend/tests/api.test.mjs` — 44 checks

Auth and token issuance, JWT guards, role authorisation (including privilege
escalation attempts), validation bounds, mass assignment, regex safety,
duplicate handling, error-code correctness, security headers.

```bash
BASE=http://127.0.0.1:5099 npm run test:api
```

### `frontend/tests/e2e.test.mjs` — 54 checks

Real Chromium via Playwright. Each check targets a defect that was actually
present, so a regression fails loudly:

- Failed login does not grant a session — wrong password, unknown user, network failure
- Route guards for anonymous and wrong-role users
- Added students **persist to the database** and survive a reload
- Duplicate email reports an error, not success
- Empty roster shows an empty state, not mock data
- Corrupt localStorage does not white-screen, and is not overwritten
- Per-question grades persist; a zero stays zero; one student's publish does not wipe others
- Theme switching in all three modes; accent colour applies
- Student data scoping; exam runner gating
- No horizontal overflow at 390 / 768 / 1440px
- No unexpected console errors

```bash
npx playwright install chromium      # first run only
BASE=http://localhost:5199 API=http://127.0.0.1:5099/api npm run test:e2e
```

The E2E suite provisions uniquely-named accounts per run, so it is
order-independent and never trips the brute-force limiter for a later run.

---

## 9. Structural changes

**Added**

```
backend/
  middleware/errorHandler.js      Central error translation + 404
  middleware/rateLimit.js         Two-layer credential throttling
  middleware/securityHeaders.js   Baseline hardening
  utils/ApiError.js               Status-carrying error
  utils/asyncHandler.js           Async route wrapper
  utils/escapeRegex.js            Regex input escaping
  scripts/seed.js                 Credential seeder
  tests/api.test.mjs              44 integration checks
  .env.example  .gitignore

frontend/src/
  components/RouteGuard.jsx       Session + role gate
  components/ErrorBoundary.jsx    Recoverable crash panel
  components/ToastStack.jsx       Toast renderer
  context/themeTokens.js          Palettes, storage keys
  context/useTheme.js             Consumer hook
  data/questionBanks.js           Question content, split from the exam UI
  hooks/useToasts.js              Toast queue, per-toast timers
  pages/NotFound.jsx
  services/session.js             Single source of truth for the session
  styles/primitives.css           Component layer
  utils/format.js
  tests/e2e.test.mjs              54 browser checks
```

**Removed** — `backend/models/Admin.js` and `Faculty.js` (0 bytes, never
imported), and `backend/.env` from git tracking.

**Renamed** — `sidebar.jsx` → `Sidebar.jsx`, `dashboardCard.jsx` →
`DashboardCard.jsx`, `Dashboard.css` reference corrected.

---

## 10. Known limits

Honest about what is *not* done:

- **Tests, submissions and results live in `localStorage`**, not the database.
  Only accounts and the student roster are server-side, so results do not sync
  between devices. Moving assessments server-side is the natural next step.
- **Password changes are not implemented.** The Settings screen says so plainly
  rather than pretending; it needs a dedicated authenticated endpoint.
- **The rate limiter is in-memory**, so counters are per-process. Behind more
  than one instance, move it to Redis.
- **Proctoring is client-side and best-effort.** It raises the cost of casual
  cheating; it is not a guarantee and a determined candidate can defeat it.
  Treat violation logs as signals for human review, not proof.
- **The API binds to `0.0.0.0:5000`**, so it is reachable from your local
  network. Fine at home; consider binding to localhost on untrusted networks.
