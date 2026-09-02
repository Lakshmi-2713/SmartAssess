/**
 * SmartAssess browser end-to-end tests.
 *
 * Drives a real Chromium against a running frontend + API. Each check targets
 * a defect that was actually present, so a regression fails loudly.
 *
 * Usage:
 *   BASE=http://localhost:5199 API=http://127.0.0.1:5099/api node tests/e2e.test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:5199";
const API = process.env.API || "http://127.0.0.1:5099/api";

/**
 * Accounts are provisioned fresh for each run. Reusing fixed credentials makes
 * the suite order-dependent and lets one run's failed-login checks trip the
 * brute-force limiter for the next.
 */
const RUN = Date.now().toString(36);
const PASSWORD = "Passw0rd123";
const ACCOUNTS = {
  faculty: { email: `e2e_fac_${RUN}@smartassess.test`, password: PASSWORD, name: "Dr. E2E Faculty" },
  student: { email: `e2e_stu_${RUN}@smartassess.test`, password: PASSWORD, name: "E2E Student" },
  admin:   { email: `e2e_adm_${RUN}@smartassess.test`, password: PASSWORD, name: "E2E Admin" },
};

async function seedAccounts() {
  for (const [role, acct] of Object.entries(ACCOUNTS)) {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: acct.name,
        email: acct.email,
        password: acct.password,
        role,
        department: "Computer Science",
      }),
    });
    if (!res.ok) {
      throw new Error(
        `Could not provision the ${role} account (${res.status}). Is the API running at ${API}?`
      );
    }
  }
}

let pass = 0;
let fail = 0;
const lines = [];
const consoleErrors = [];

function check(name, ok, detail) {
  if (ok) {
    pass += 1;
    lines.push(`  PASS  ${name}`);
  } else {
    fail += 1;
    lines.push(`  FAIL  ${name}${detail ? `\n          -> ${detail}` : ""}`);
  }
}

const section = (t) => lines.push(`\n── ${t} ──`);

async function signIn(page, role) {
  const { email, password } = ACCOUNTS[role];
  // RouteGuard stashes the intended path in history state so sign-in can
  // return the user there. A unique query string creates a fresh history
  // entry with no such state, so this helper lands on the role home.
  // (Do NOT clear it with replaceState — React Router keeps its own
  // key/idx bookkeeping in history.state and wiping it breaks navigate().)
  await page.goto(`${BASE}/?fresh=${Date.now()}`, { waitUntil: "networkidle" });
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click(`.role-chip.tone-${role}`);
  await page.click('button[type="submit"]');

  // Sign-in is a client-side XHR followed by a client-side route change, so
  // there is no load event to wait on — `waitForLoadState` returns while the
  // request is still in flight. Wait for the session to actually land.
  await page.waitForFunction(
    () => localStorage.getItem("smartassess_session") !== null,
    null,
    { timeout: 15000 }
  );
  await page.waitForFunction(
    () => !document.querySelector("#login-email"),
    null,
    { timeout: 15000 }
  );
}

const run = async () => {
  await seedAccounts();

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

  /* ─────────────────────────────────────────────────────────
     1. AUTH — the headline bug: a failed login must NOT sign in
     ───────────────────────────────────────────────────────── */
  section("Authentication");

  await page.goto(BASE, { waitUntil: "networkidle" });
  check("login page renders", await page.isVisible("#login-email"), await page.title());

  // Wrong password
  await page.fill("#login-email", ACCOUNTS.faculty.email);
  await page.fill("#login-password", "definitely-wrong");
  await page.click('button[type="submit"]');
  await page.waitForSelector(".alert-error", { timeout: 10000 }).catch(() => {});
  check(
    "wrong password does NOT grant a session",
    page.url().replace(/\/$/, "") === BASE.replace(/\/$/, ""),
    `landed on ${page.url()}`
  );
  check(
    "wrong password shows an error",
    await page.isVisible(".alert-error"),
    "no .alert-error rendered"
  );
  check(
    "no token stored after failed login",
    (await page.evaluate(() => localStorage.getItem("smartassess_session"))) === null,
    "a session was persisted"
  );

  // Unknown user
  await page.fill("#login-email", "ghost@nowhere.test");
  await page.fill("#login-password", "Passw0rd123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(900);
  check(
    "unknown user does NOT grant a session",
    page.url().replace(/\/$/, "") === BASE.replace(/\/$/, ""),
    `landed on ${page.url()}`
  );

  // The role chip is cosmetic: correct credentials must work even when the
  // selected chip does not match the account's real role.
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.fill("#login-email", ACCOUNTS.admin.email);
  await page.fill("#login-password", ACCOUNTS.admin.password);
  await page.click(".role-chip.tone-student"); // deliberately wrong chip
  await page.click('button[type="submit"]');
  await page
    .waitForFunction(() => localStorage.getItem("smartassess_session") !== null, null, {
      timeout: 10000,
    })
    .catch(() => {});
  check(
    "a mismatched role chip does not block a valid sign-in",
    page.url().includes("/admin"),
    `landed on ${page.url()}`
  );
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: "networkidle" });

  // API unreachable must also fail closed
  await context.route("**/api/auth/login", (r) => r.abort());
  await page.fill("#login-email", ACCOUNTS.faculty.email);
  await page.fill("#login-password", ACCOUNTS.faculty.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(900);
  check(
    "network failure does NOT grant a session",
    page.url().replace(/\/$/, "") === BASE.replace(/\/$/, ""),
    `landed on ${page.url()}`
  );
  await context.unroute("**/api/auth/login");

  /* ─────────────────────────────────────────────────────────
     2. ROUTE GUARDS
     ───────────────────────────────────────────────────────── */
  section("Route guards");

  for (const path of ["/admin", "/faculty", "/students", "/tests", "/results", "/settings"]) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    check(
      `anonymous ${path} redirects to sign-in`,
      await page.isVisible("#login-email"),
      `stayed at ${page.url()}`
    );
  }

  /* ─────────────────────────────────────────────────────────
     3. SUCCESSFUL LOGIN + ROLE ROUTING
     ───────────────────────────────────────────────────────── */
  section("Sign-in and role routing");

  await signIn(page, "faculty");
  check("faculty lands on /faculty", page.url().includes("/faculty"), page.url());
  check(
    "session token persisted",
    Boolean(await page.evaluate(() => localStorage.getItem("smartassess_session"))),
    "no session in localStorage"
  );
  check(
    "password hash never reaches the client",
    !(await page.evaluate(() => localStorage.getItem("smartassess_session") || "")).includes("$2"),
    "a bcrypt hash was found in localStorage"
  );

  // Deep-link memory: an anonymous visit to a protected page should return
  // there after signing in.
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "/results", { waitUntil: "networkidle" });
  await page.fill("#login-email", ACCOUNTS.faculty.email);
  await page.fill("#login-password", ACCOUNTS.faculty.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
  check(
    "sign-in returns you to the page you asked for",
    page.url().includes("/results"),
    `landed on ${page.url()}`
  );

  // Faculty must not reach the admin console
  await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
  check(
    "faculty is bounced from /admin",
    !page.url().includes("/admin"),
    `reached ${page.url()}`
  );

  /* ─────────────────────────────────────────────────────────
     4. SIDEBAR — role-driven, and logout really logs out
     ───────────────────────────────────────────────────────── */
  section("Navigation & sign-out");

  await page.goto(BASE + "/tests", { waitUntil: "networkidle" });
  const navLabels = await page.$$eval(".sidebar-link-label", (els) =>
    els.map((e) => e.textContent.trim())
  );
  check(
    "faculty on /tests sees the FACULTY menu (not admin)",
    !navLabels.includes("Admin Overview"),
    `menu: ${navLabels.join(", ")}`
  );

  await page.click(".sidebar-logout");
  await page.waitForTimeout(600);
  check(
    "sign-out clears the session",
    (await page.evaluate(() => localStorage.getItem("smartassess_session"))) === null,
    "session survived logout"
  );
  check("sign-out returns to login", await page.isVisible("#login-email"), page.url());

  /* ─────────────────────────────────────────────────────────
     5. STUDENT ROSTER — create actually persists
     ───────────────────────────────────────────────────────── */
  section("Student roster");

  await signIn(page, "admin");
  await page.goto(BASE + "/students", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const stamp = Date.now();
  const newEmail = `e2e_${stamp}@student.test`;

  await page.click('button:has-text("Add student")');
  await page.waitForSelector(".modal");
  await page.fill('input[name="name"]', `E2E Student ${stamp}`);
  await page.fill('input[name="email"]', newEmail);
  await page.fill('input[name="phone"]', "+91 90000 12345");
  await page.fill('input[name="rollNumber"]', `E2E-${stamp}`);
  await page.click('.modal-foot button[type="submit"]');
  await page.waitForTimeout(1200);

  check(
    "add student shows a success toast",
    await page.isVisible(".toast-success"),
    (await page.textContent(".toast-stack").catch(() => "")) || "no toast"
  );

  // The real test: did it reach the database?
  const persisted = await page.evaluate(async ({ api, email }) => {
    const token = JSON.parse(localStorage.getItem("smartassess_session")).token;
    const res = await fetch(`${api}/students?search=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const rows = await res.json();
    return Array.isArray(rows) && rows.some((r) => r.email === email);
  }, { api: API, email: newEmail });
  check("added student is PERSISTED to the database", persisted, "not found via the API");

  // Reload proves it is not just local state
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  check(
    "added student survives a page reload",
    await page.isVisible(`text=${newEmail}`),
    "row missing after reload"
  );

  // A duplicate must be reported as a failure, not a success
  await page.click('button:has-text("Add student")');
  await page.waitForSelector(".modal");
  await page.fill('input[name="name"]', "Duplicate Attempt");
  await page.fill('input[name="email"]', newEmail);
  await page.fill('input[name="phone"]', "+91 90000 99999");
  await page.click('.modal-foot button[type="submit"]');
  await page.waitForTimeout(1200);
  check(
    "duplicate email reports an ERROR (not success)",
    await page.isVisible(".toast-error"),
    "expected a .toast-error toast"
  );
  await page.click(".modal-close");
  await page.waitForSelector(".modal", { state: "detached" });

  // Client-side validation, from a freshly opened (empty) form.
  await page.click('button:has-text("Add student")');
  await page.waitForSelector(".modal");
  await page.fill('input[name="name"]', "X");
  await page.fill('input[name="email"]', "not-an-email");
  await page.click('.modal-foot button[type="submit"]');
  await page.waitForSelector(".field-error", { timeout: 5000 }).catch(() => {});
  const fieldErrors = await page.$$eval(".field-error", (els) =>
    els.map((e) => e.textContent.trim())
  );
  check(
    "invalid form shows inline field errors",
    fieldErrors.length >= 2,
    `got ${fieldErrors.length}: ${JSON.stringify(fieldErrors)}`
  );
  check(
    "an invalid form is NOT submitted to the API",
    await page.isVisible(".modal"),
    "the modal closed despite validation errors"
  );
  await page.click(".modal-close");
  await page.waitForSelector(".modal", { state: "detached" });

  /* ─────────────────────────────────────────────────────────
     6. EMPTY STATES — no phantom mock rows
     ───────────────────────────────────────────────────────── */
  section("Empty states");

  await context.route("**/api/students*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  check(
    "an empty roster shows an empty state, not mock students",
    (await page.isVisible(".empty-state")) &&
      !(await page.isVisible("text=Rahul Verma")),
    "mock data leaked into an empty roster"
  );
  await context.unroute("**/api/students*");

  // API failure surfaces an error rather than pretending
  await context.route("**/api/students*", (r) => r.abort());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  check(
    "API failure shows an explicit error banner",
    await page.isVisible(".alert-error"),
    "failure was silent"
  );
  await context.unroute("**/api/students*");

  /* ─────────────────────────────────────────────────────────
     7. CORRUPT STORAGE — must not white-screen
     ───────────────────────────────────────────────────────── */
  section("Corrupt local storage resilience");

  await page.evaluate(() => {
    localStorage.setItem("user", "{{{ not json");
    localStorage.setItem("smartassess_tests_list", "<<<broken>>>");
  });
  await page.goto(BASE + "/tests", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  check(
    "corrupt localStorage does NOT white-screen the app",
    await page.isVisible(".sidebar"),
    "app failed to render"
  );
  check(
    "corrupt data does not destroy the stored key",
    (await page.evaluate(() => localStorage.getItem("smartassess_tests_list"))) === "<<<broken>>>",
    "the corrupt value was overwritten instead of preserved"
  );
  await page.evaluate(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("smartassess_tests_list");
  });

  /* ─────────────────────────────────────────────────────────
     8. THEME
     ───────────────────────────────────────────────────────── */
  section("Theming");

  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.click('.settings-nav-btn:has-text("Appearance")');
  await page.waitForTimeout(300);

  await page.click('.option-card:has-text("Dark")');
  await page.waitForTimeout(400);
  const darkAttr = await page.getAttribute("html", "data-theme");
  check("dark mode sets data-theme=dark", darkAttr === "dark", `got ${darkAttr}`);

  const darkBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor
  );
  await page.click('.option-card:has-text("Light")');
  await page.waitForTimeout(400);
  const lightAttr = await page.getAttribute("html", "data-theme");
  const lightBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor
  );
  check("light mode sets data-theme=light", lightAttr === "light", `got ${lightAttr}`);
  check("light and dark actually differ", darkBg !== lightBg, `${darkBg} vs ${lightBg}`);

  await page.click('.option-card:has-text("System")');
  await page.waitForTimeout(300);
  check(
    "system mode removes data-theme so the OS decides",
    (await page.getAttribute("html", "data-theme")) === null,
    "data-theme was left stamped"
  );

  // Accent colour
  await page.click(".swatch-row .swatch:nth-child(3)");
  await page.waitForTimeout(300);
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary-accent").trim()
  );
  check("accent colour applies a CSS variable", Boolean(accent), `--primary-accent = "${accent}"`);

  /* ─────────────────────────────────────────────────────────
     9. STUDENT VIEW — scoped to the signed-in student
     ───────────────────────────────────────────────────────── */
  section("Student dashboard scoping");

  await page.evaluate(() => localStorage.clear());
  await signIn(page, "student");
  check("student lands on /student", page.url().includes("/student"), page.url());

  await page.waitForTimeout(700);
  const completed = await page
    .textContent(".stat-tile:has-text('Assessments completed') .stat-value")
    .catch(() => null);
  check(
    "a new student shows 0 completed (not other students' results)",
    completed?.trim() === "0",
    `showed "${completed}"`
  );

  const studentNav = await page.$$eval(".sidebar-link-label", (els) =>
    els.map((e) => e.textContent.trim())
  );
  check(
    "student menu has no roster/admin links",
    !studentNav.includes("Student Roster") && !studentNav.includes("Admin Overview"),
    `menu: ${studentNav.join(", ")}`
  );

  await page.goto(BASE + "/students", { waitUntil: "networkidle" });
  check(
    "student is bounced from the roster page",
    !page.url().includes("/students"),
    `reached ${page.url()}`
  );

  /* ─────────────────────────────────────────────────────────
     9b. GRADING — per-question edits must persist, and publishing
         one student must not wipe another's result
     ───────────────────────────────────────────────────────── */
  section("Grading");

  await page.evaluate(() => localStorage.clear());
  await signIn(page, "faculty");
  await page.goto(BASE + "/faculty", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Snapshot how many results exist before grading.
  const resultsBefore = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("smartassess_results") || "[]").length
  );

  await page.click('.table tbody tr:first-child button:has-text("Grade")');
  await page.waitForSelector(".modal");

  check(
    "grading sheet renders the real question breakdown",
    (await page.$$(".grade-q")).length > 0,
    "no questions rendered"
  );

  // Zero a question and confirm the running total reflects it.
  const firstMark = page.locator(".grade-q-marks .input").first();
  const originalTotal = await page.textContent(".grade-summary-item.is-score strong");
  await firstMark.fill("0");
  await page.waitForTimeout(300);
  const zeroedTotal = await page.textContent(".grade-summary-item.is-score strong");
  check(
    "editing a mark updates the running total",
    originalTotal !== zeroedTotal,
    `${originalTotal} -> ${zeroedTotal}`
  );

  // A mark cannot exceed that question's maximum.
  await firstMark.fill("999");
  await page.waitForTimeout(250);
  const clamped = await firstMark.inputValue();
  check(
    "a mark is clamped to the question maximum",
    Number(clamped) <= 20,
    `input accepted ${clamped}`
  );

  await firstMark.fill("0");
  await page.fill(".textarea", "E2E feedback note.");
  await page.click('button:has-text("Publish score")');
  await page.waitForSelector(".modal", { state: "detached" });
  await page.waitForTimeout(500);

  // Re-open and confirm the zeroed mark survived (it used to be discarded).
  await page.click('.table tbody tr:first-child button:has-text("Review")');
  await page.waitForSelector(".modal");
  const reopened = await page.locator(".grade-q-marks .input").first().inputValue();
  check(
    "per-question mark edits PERSIST after publishing",
    reopened === "0",
    `re-opened with "${reopened}" instead of "0"`
  );
  check(
    "a zero mark stays zero (not reset to full marks)",
    reopened === "0",
    `got "${reopened}"`
  );
  await page.click(".modal-close");
  await page.waitForSelector(".modal", { state: "detached" });

  const resultsAfter = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("smartassess_results") || "[]")
  );
  check(
    "publishing one student does NOT wipe other students' results",
    resultsAfter.length >= resultsBefore,
    `results went from ${resultsBefore} to ${resultsAfter.length}`
  );

  /* ─────────────────────────────────────────────────────────
     9c. EXAM RUNNER
     ───────────────────────────────────────────────────────── */
  section("Exam runner");

  await page.evaluate(() => localStorage.clear());
  await signIn(page, "student");
  await page.goto(BASE + "/take-test?testId=1", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  check(
    "exam pre-check screen renders",
    await page.isVisible(".tt-instr-card"),
    page.url()
  );
  check(
    "the exam cannot be started without a verified camera",
    await page.isDisabled('button:has-text("Authorise fullscreen")'),
    "the start button was enabled with no camera"
  );
  check(
    "camera checklist reports the camera as missing",
    await page.isVisible(".tt-check.is-fail"),
    "no failing check shown"
  );

  /* ─────────────────────────────────────────────────────────
     10. RESPONSIVE
     ───────────────────────────────────────────────────────── */
  section("Responsive layout");

  await page.goto(BASE + "/student", { waitUntil: "networkidle" });
  for (const [label, width, height] of [
    ["mobile 390px", 390, 844],
    ["tablet 768px", 768, 1024],
    ["desktop 1440px", 1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    check(`${label}: no horizontal overflow`, overflow <= 1, `overflow ${overflow}px`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  /* ─────────────────────────────────────────────────────────
     11. 404
     ───────────────────────────────────────────────────────── */
  section("Not found");
  await page.goto(BASE + "/this-page-does-not-exist", { waitUntil: "networkidle" });
  check("unknown route renders a 404 page", await page.isVisible(".notfound-card"), page.url());

  /* ─────────────────────────────────────────────────────────
     12. CONSOLE HYGIENE
     ───────────────────────────────────────────────────────── */
  section("Console");
  const realErrors = consoleErrors.filter(
    (e) =>
      !e.includes("Failed to load resource") &&
      !e.includes("net::ERR_FAILED") &&
      !e.includes("ERR_ABORTED") &&
      // Deliberately provoked by the corrupt-storage section above; logging
      // loudly there instead of silently discarding data is the fix, not a bug.
      !e.includes("contains invalid JSON")
  );
  check(
    "no unexpected console errors",
    realErrors.length === 0,
    realErrors.slice(0, 5).join(" | ")
  );

  await browser.close();

  console.log(lines.join("\n"));
  console.log(`\n──────────────────────────────`);
  console.log(`  PASS: ${pass}   FAIL: ${fail}`);
  console.log(`──────────────────────────────`);
  process.exit(fail > 0 ? 1 : 0);
};

run().catch((err) => {
  console.error("E2E run crashed:", err);
  console.log(lines.join("\n"));
  process.exit(1);
});
