/**
 * Face-detection tests against a real browser and a real camera stream.
 *
 * Chromium is given a Y4M file as its webcam, so the detector sees actual
 * video frames — a face, two faces, or an empty room — rather than a stub.
 * This is the only way to prove the proctoring engine genuinely detects
 * anything; unit-testing around the model would have kept passing while the
 * old heuristic detected nothing at all.
 *
 * Fixtures are built by tests/make-fixtures.sh (needs ffmpeg).
 *
 * Usage:
 *   BASE=http://localhost:5199 API=http://127.0.0.1:5099/api \
 *   FIXTURES=/path/to/fixtures node tests/proctoring.test.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:5199";
const API = process.env.API || "http://127.0.0.1:5099/api";
const FIXTURES = process.env.FIXTURES || path.resolve("tests/fixtures");

const RUN = Date.now().toString(36);
const PASSWORD = "Passw0rd123";
const STUDENT = `proctor_${RUN}@smartassess.test`;

let pass = 0;
let fail = 0;
const lines = [];

const check = (name, ok, detail) => {
  if (ok) {
    pass += 1;
    lines.push(`  PASS  ${name}`);
  } else {
    fail += 1;
    lines.push(`  FAIL  ${name}${detail ? `\n          -> ${detail}` : ""}`);
  }
};
const section = (t) => lines.push(`\n── ${t} ──`);

/** A browser whose webcam is the given Y4M file. */
async function launchWithCamera(y4m) {
  return chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${y4m}`,
      "--allow-file-access-from-files",
    ],
  });
}

async function newStudentPage(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["camera", "microphone"],
  });
  const page = await context.newPage();

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.fill("#login-email", STUDENT);
  await page.fill("#login-password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => localStorage.getItem("smartassess_session") !== null,
    null,
    { timeout: 15000 }
  );
  return { context, page };
}

/** Read the engine + detection state the page is actually rendering. */
async function readState(page) {
  return page.evaluate(() => {
    const status = document.querySelector(".tt-check:nth-of-type(2) span:last-child");
    const start = document.querySelector('button:has(svg) , .tt-instr-foot button');
    return {
      checkText: status?.textContent?.trim() || "",
      startDisabled: start ? start.disabled : null,
      gateNote: document.querySelector(".tt-gate-note")?.textContent?.trim() || "",
      engineWarning: Boolean(document.querySelector(".tt-engine-warning")),
    };
  });
}

const run = async () => {
  for (const f of ["one-face.y4m", "two-faces.y4m", "no-face.y4m"]) {
    if (!fs.existsSync(path.join(FIXTURES, f))) {
      console.error(`Missing fixture ${f} in ${FIXTURES}. Run tests/make-fixtures.sh first.`);
      process.exit(1);
    }
  }

  // A student account to sign in with.
  await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Proctor Test Student",
      email: STUDENT,
      password: PASSWORD,
      role: "student",
      department: "Computer Science",
    }),
  });

  /* ── 1. Engine loads at all ──────────────────────────────────────── */
  section("Detection engine");

  let browser = await launchWithCamera(path.join(FIXTURES, "one-face.y4m"));
  let { context, page } = await newStudentPage(browser);

  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });

  await page.goto(`${BASE}/take-test?testId=1`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Enable webcam")');

  // The model is ~230 KB plus a WASM runtime; allow a generous first load.
  const becameReady = await page
    .waitForFunction(
      () => {
        const t = document.body.innerText;
        return t.includes("Candidate identified") || t.includes("Detector unavailable");
      },
      null,
      { timeout: 45000 }
    )
    .then(() => true)
    .catch(() => false);

  check("engine resolves (ready or explicitly unavailable)", becameReady, "still loading after 45s");

  const wasmOk = await page.evaluate(async (b) => {
    const r = await fetch(`${b}/mediapipe-wasm/vision_wasm_internal.wasm`, { method: "HEAD" });
    return r.status;
  }, BASE);
  check("WASM runtime is served from our own origin", wasmOk === 200, `HTTP ${wasmOk}`);

  const modelOk = await page.evaluate(async (b) => {
    const r = await fetch(`${b}/models/blaze_face_short_range.tflite`, { method: "HEAD" });
    return r.status;
  }, BASE);
  check("model file is served from our own origin", modelOk === 200, `HTTP ${modelOk}`);

  /* ── 2. ONE FACE — the case that used to detect nothing ──────────── */
  section("One face in frame");

  const oneFace = await page
    .waitForFunction(() => document.body.innerText.includes("Candidate identified"), null, {
      timeout: 30000,
    })
    .then(() => true)
    .catch(() => false);

  check("a real face IS detected", oneFace, await page.innerText(".tt-checklist").catch(() => ""));

  const startEnabled = await page
    .locator('.tt-instr-foot button')
    .first()
    .isEnabled()
    .catch(() => false);
  check("the exam unlocks once the face is verified", startEnabled, "start button still disabled");

  const hudPainted = await page.evaluate(() => {
    const c = document.querySelector(".tt-hud");
    if (!c || !c.width) return false;
    const ctx = c.getContext("2d");
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
    return false;
  });
  check("HUD overlay is drawn onto the canvas", hudPainted, "canvas is blank");

  await context.close();
  await browser.close();

  /* ── 3. TWO FACES — violation path ───────────────────────────────── */
  section("Two faces in frame");

  browser = await launchWithCamera(path.join(FIXTURES, "two-faces.y4m"));
  ({ context, page } = await newStudentPage(browser));
  await page.goto(`${BASE}/take-test?testId=1`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Enable webcam")');

  const multi = await page
    .waitForFunction(
      () => document.body.innerText.includes("Multiple faces"),
      null,
      { timeout: 45000 }
    )
    .then(() => true)
    .catch(() => false);
  check("two faces are reported as a violation", multi, await page.innerText(".tt-checklist").catch(() => ""));

  const blocked = await page
    .locator(".tt-instr-foot button")
    .first()
    .isDisabled()
    .catch(() => true);
  check("the exam stays locked while two people are visible", blocked, "start button was enabled");

  await context.close();
  await browser.close();

  /* ── 4. NO FACE — empty room ─────────────────────────────────────── */
  section("Empty frame");

  browser = await launchWithCamera(path.join(FIXTURES, "no-face.y4m"));
  ({ context, page } = await newStudentPage(browser));
  await page.goto(`${BASE}/take-test?testId=1`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Enable webcam")');

  const noFace = await page
    .waitForFunction(
      () => document.body.innerText.includes("Align your face"),
      null,
      { timeout: 45000 }
    )
    .then(() => true)
    .catch(() => false);
  check("an empty room reports no face", noFace, await page.innerText(".tt-checklist").catch(() => ""));

  await context.close();
  await browser.close();

  /* ── 5. DEGRADED — model blocked must not lock students out ──────── */
  section("Degraded mode (model unreachable)");

  browser = await launchWithCamera(path.join(FIXTURES, "one-face.y4m"));
  ({ context, page } = await newStudentPage(browser));

  // Simulate a firewall eating the model file.
  await context.route("**/models/*.tflite", (r) => r.abort());

  await page.goto(`${BASE}/take-test?testId=1`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Enable webcam")');

  const degraded = await page
    .waitForFunction(
      () => document.body.innerText.includes("Face detection could not start"),
      null,
      { timeout: 45000 }
    )
    .then(() => true)
    .catch(() => false);
  check("a blocked model surfaces an explicit warning", degraded, "no warning shown");

  const stillStartable = await page
    .locator(".tt-instr-foot button")
    .first()
    .isEnabled()
    .catch(() => false);
  check(
    "the student can STILL start the exam (not locked out)",
    stillStartable,
    "start button disabled — students would be stuck"
  );

  await context.close();
  await browser.close();

  /* ── 6. Console hygiene ──────────────────────────────────────────── */
  section("Console");
  const real = consoleErrors.filter(
    (e) => !e.includes("Failed to load resource") && !e.includes("net::ERR")
  );
  check("no unexpected console errors", real.length === 0, real.slice(0, 3).join(" | "));

  console.log(lines.join("\n"));
  console.log(`\n──────────────────────────────`);
  console.log(`  PASS: ${pass}   FAIL: ${fail}`);
  console.log(`──────────────────────────────`);
  process.exit(fail > 0 ? 1 : 0);
};

run().catch((err) => {
  console.error("Proctoring test run crashed:", err);
  console.log(lines.join("\n"));
  process.exit(1);
});
