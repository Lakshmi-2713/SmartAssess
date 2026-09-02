# SmartAssess

AI-proctored assessment platform. Express + MongoDB API, React + Vite front end.

---

## ⚠️ Do this first: rotate the leaked credentials

`backend/.env` was committed to git and contains a **live MongoDB Atlas
connection string and the JWT signing secret**. Removing the file from the
index (already done) does not remove it from git history.

1. In MongoDB Atlas, rotate the `SmartAssess` database user's password.
2. Generate a new JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. Put both in a local `backend/.env` (now git-ignored — see `.env.example`).
4. If the repo was ever pushed, purge the file from history
   (`git filter-repo --path backend/.env --invert-paths`) and force-push.

Rotating the credentials is the part that actually matters; history rewriting
is housekeeping.

---

## Getting started

### Requirements

- Node.js 20+
- MongoDB 6+ (local, or an Atlas cluster)

### Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET
npm run dev               # http://localhost:5000
```

The server refuses to start without `JWT_SECRET`, and exits if it cannot reach
MongoDB — both are deliberate: silently running without them is worse.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # optional; defaults to http://localhost:5000/api
npm run dev                  # http://localhost:5173
```

### Creating the first account

There is no self-service signup. Create an admin from the command line, then
provision everyone else through the UI:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"System Admin","email":"admin@your-school.edu","password":"choose-a-strong-one","role":"admin"}'
```

---

## Architecture

```
backend/
  config/db.js              Mongo connection (never logs the URI)
  controllers/              Route handlers; all wrapped in asyncHandler
  middleware/
    authMiddleware.js       protect (JWT) + authorize(...roles)
    errorHandler.js         Central error translation + 404
    rateLimit.js            Two-layer credential throttling
    securityHeaders.js      Baseline hardening headers
  models/                   Mongoose schemas with real validation
  routes/                   auth / students / faculty / admin
  utils/                    JWT, ApiError, asyncHandler, regex escaping
  tests/api.test.mjs        44 API integration checks

frontend/src/
  components/               Sidebar, Navbar, modals, RouteGuard, ErrorBoundary
  context/
    ThemeContext.jsx        Provider only
    themeTokens.js          Palettes and storage keys
    useTheme.js             Consumer hook
  data/questionBanks.js     Question content, separate from the exam UI
  hooks/useToasts.js        Toast queue with per-toast timers
  pages/                    One file per route
  services/
    api.js                  Axios + auth interceptor + error normalisation
    session.js              Single source of truth for the session
    storage.js              Local data, non-destructive on corrupt values
    faceDetector.js         Proctoring vision engine
    audioAlerts.js          Web Audio cues
  styles/
    index.css (root)        Design tokens: colour, type, spacing, motion
    primitives.css          Buttons, cards, tables, modals, forms, toasts
    *.css                   Per-page styles composed from the primitives
  utils/format.js           Shared formatters
  tests/e2e.test.mjs        54 browser end-to-end checks
```

### Authorisation model

| Route | student | faculty | admin |
|---|:--:|:--:|:--:|
| `GET /api/students` | ✅ | ✅ | ✅ |
| `POST` / `PUT /api/students` | ❌ | ✅ | ✅ |
| `DELETE /api/students/:id` | ❌ | ❌ | ✅ |
| `/api/faculty/*` | ❌ | ✅ | ✅ |
| `/api/admin/*` | ❌ | ❌ | ✅ |

The same rules are mirrored client-side by `RouteGuard`, but the **server is
the authority** — the front-end guard is a UX affordance, not a control.

---

## Testing

Both suites run against a live server. Never point them at production: they
create and delete records.

```bash
# 1. Throwaway database
mongod --dbpath /tmp/smartassess-test --port 27099

# 2. API under test
cd backend
PORT=5099 MONGO_URI="mongodb://127.0.0.1:27099/smartassess_test" \
  JWT_SECRET=testsecret CORS_ORIGIN='*' node server.js

# 3. API integration suite  (44 checks)
BASE=http://127.0.0.1:5099 npm run test:api

# 4. Front end pointed at the test API
cd ../frontend
echo 'VITE_API_URL=http://127.0.0.1:5099/api' > .env.local
npx vite --port 5199

# 5. Browser end-to-end suite  (54 checks)
npx playwright install chromium      # first run only
BASE=http://localhost:5199 API=http://127.0.0.1:5099/api npm run test:e2e
```

Also:

```bash
cd frontend && npm run lint && npm run build
```

The E2E suite provisions its own uniquely-named accounts on every run, so it is
order-independent and never trips the brute-force limiter for a later run.

---

## Theming

Everything visual derives from CSS custom properties in `src/index.css`.

- **Light is the base.** Dark overrides only the tokens that change, under both
  `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`.
- **Three theme modes**: light, dark, and system. System stamps *no*
  `data-theme` attribute so the media query takes over, and it follows OS
  changes live via a `matchMedia` listener.
- **Accent colour** is swappable at runtime (7 palettes) with separate,
  lighter values for dark mode so contrast holds.
- **Accessibility**: reduced-motion and high-contrast toggles, plus respect for
  `prefers-reduced-motion`.

To restyle the product, change the tokens — not the component files.

---

## Notes and known limits

- **Tests, submissions and results are stored in the browser's
  `localStorage`**, not the database. Only accounts and the student roster are
  server-side. Moving assessments server-side is the natural next step; until
  then results do not sync between devices.
- **Password changes are not implemented.** The Settings screen says so rather
  than pretending; it needs a dedicated authenticated endpoint.
- **The rate limiter is in-memory**, so its counters are per-process. Behind
  more than one instance, move it to Redis.
- **Proctoring runs entirely client-side** and is best-effort. It raises the
  cost of casual cheating; it is not a guarantee, and a determined candidate
  can defeat it. Treat violation logs as signals for human review.
