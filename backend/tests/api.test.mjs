const BASE = process.env.BASE || "http://127.0.0.1:5099";
let pass = 0, fail = 0;
const results = [];

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res, text, json;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    text = await res.text();
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json };
  } catch (e) { return { status: 0, body: String(e) }; }
}

function check(name, cond, detail) {
  if (cond) { pass++; results.push(`  PASS  ${name}`); }
  else { fail++; results.push(`  FAIL  ${name}${detail ? `\n          -> ${detail}` : ""}`); }
}

const rnd = Math.random().toString(36).slice(2, 8);

console.log("\n=== AUTH ===");
const reg = await req("POST", "/api/auth/register", { name: "Test Fac", email: `fac_${rnd}@x.com`, password: "secret123", role: "faculty" });
check("register returns 2xx", reg.status >= 200 && reg.status < 300, `status=${reg.status} body=${JSON.stringify(reg.body).slice(0,200)}`);
check("register does NOT leak password hash", !JSON.stringify(reg.body).includes("$2"), `body=${JSON.stringify(reg.body).slice(0,300)}`);

const goodLogin = await req("POST", "/api/auth/login", { email: `fac_${rnd}@x.com`, password: "secret123", role: "faculty" });
check("valid login returns 200", goodLogin.status === 200, `status=${goodLogin.status}`);
check("login does NOT leak password hash", !JSON.stringify(goodLogin.body).includes("$2"), `body=${JSON.stringify(goodLogin.body).slice(0,300)}`);
check("login returns a token", !!(goodLogin.body?.token), `body keys=${Object.keys(goodLogin.body||{})}`);
const token = goodLogin.body?.token;

const badLogin = await req("POST", "/api/auth/login", { email: `fac_${rnd}@x.com`, password: "WRONGPASS", role: "faculty" });
check("wrong password rejected (401)", badLogin.status === 401, `status=${badLogin.status}`);

const dupReg = await req("POST", "/api/auth/register", { name: "Dup", email: `fac_${rnd}@x.com`, password: "secret123", role: "faculty" });
check("duplicate email rejected (400)", dupReg.status === 400, `status=${dupReg.status}`);

const badRole = await req("POST", "/api/auth/register", { name: "X", email: `role_${rnd}@x.com`, password: "secret123", role: "superadmin" });
check("invalid role rejected (4xx)", badRole.status >= 400 && badRole.status < 500, `status=${badRole.status}`);

const noPw = await req("POST", "/api/auth/register", { name: "X", email: `nopw_${rnd}@x.com`, role: "student" });
check("missing password rejected (4xx not 500)", noPw.status >= 400 && noPw.status < 500, `status=${noPw.status} body=${JSON.stringify(noPw.body).slice(0,200)}`);

const shortPw = await req("POST", "/api/auth/register", { name: "X", email: `short_${rnd}@x.com`, password: "1", role: "student" });
check("too-short password rejected", shortPw.status >= 400 && shortPw.status < 500, `status=${shortPw.status}`);

console.log("\n=== STUDENTS: AUTH GUARD ===");
const unauth = await req("GET", "/api/students");
check("GET /students requires auth (401)", unauth.status === 401, `status=${unauth.status}`);
const unauthDel = await req("DELETE", "/api/students/000000000000000000000000");
check("DELETE /students/:id requires auth (401)", unauthDel.status === 401, `status=${unauthDel.status}`);
const badTok = await req("GET", "/api/students", null, "not.a.real.token");
check("garbage token rejected (401)", badTok.status === 401, `status=${badTok.status}`);

console.log("\n=== STUDENTS: CRUD ===");
const payloadWithClientId = { _id: `std_${Date.now()}`, name: "Client Id Student", email: `cid_${rnd}@s.com`, department: "Computer Science", semester: 4, phone: "+91 90000 00001", status: "Active" };
const addCid = await req("POST", "/api/students", payloadWithClientId, token);
check("POST tolerates client-sent _id (does not 500)", addCid.status !== 500, `status=${addCid.status} body=${JSON.stringify(addCid.body).slice(0,200)}`);
check("POST with client _id actually persists (2xx)", addCid.status >= 200 && addCid.status < 300, `status=${addCid.status}`);

const add = await req("POST", "/api/students", { name: "Normal Student", email: `norm_${rnd}@s.com`, department: "Data Science", semester: 2, phone: "+91 90000 00002" }, token);
check("POST clean payload returns 201", add.status === 201, `status=${add.status} body=${JSON.stringify(add.body).slice(0,200)}`);
const sid = add.body?._id;

const dup = await req("POST", "/api/students", { name: "Dupe", email: `norm_${rnd}@s.com`, department: "Data Science", semester: 2, phone: "+91 90000 00003" }, token);
check("duplicate student email rejected (409)", dup.status === 409, `status=${dup.status}`);

const missing = await req("POST", "/api/students", { name: "Incomplete" }, token);
check("missing required fields -> 400 not 500", missing.status === 400, `status=${missing.status}`);

const badId = await req("GET", "/api/students/not-an-objectid", null, token);
check("malformed id -> 404 not 500", badId.status === 404, `status=${badId.status}`);

const ghost = await req("PUT", "/api/students/000000000000000000000000", { name: "Ghost" }, token);
check("PUT on missing id -> 404 not 200/null", ghost.status === 404, `status=${ghost.status} body=${JSON.stringify(ghost.body).slice(0,120)}`);

// Faculty must NOT be able to delete; only admin.
const facDel = await req("DELETE", `/api/students/${sid}`, null, token);
check("faculty CANNOT delete a student (403)", facDel.status === 403, `status=${facDel.status}`);

// Register an admin to exercise the privileged paths.
await req("POST", "/api/auth/register", { name: "Root", email: `adm_${rnd}@x.com`, password: "secret123", role: "admin" });
const adminLogin = await req("POST", "/api/auth/login", { email: `adm_${rnd}@x.com`, password: "secret123", role: "admin" });
const adminToken = adminLogin.body?.token;
check("admin login returns token", !!adminToken, `status=${adminLogin.status}`);

const ghostDel = await req("DELETE", "/api/students/000000000000000000000000", null, adminToken);
check("admin DELETE on missing id -> 404", ghostDel.status === 404, `status=${ghostDel.status}`);

const realDel = await req("DELETE", `/api/students/${sid}`, null, adminToken);
check("admin CAN delete a student (200)", realDel.status === 200, `status=${realDel.status}`);

const gone = await req("GET", `/api/students/${sid}`, null, adminToken);
check("deleted student is really gone (404)", gone.status === 404, `status=${gone.status}`);

console.log("\n=== ROLE ESCALATION ===");
const studReg = await req("POST", "/api/auth/register", { name: "Pupil", email: `stu_${rnd}@x.com`, password: "secret123", role: "student" });
const studToken = studReg.body?.token;
const studAdd = await req("POST", "/api/students", { name: "Sneaky", email: `sneak_${rnd}@s.com`, department: "CS", semester: 1, phone: "1" }, studToken);
check("student CANNOT create students (403)", studAdd.status === 403, `status=${studAdd.status}`);
const studAdmin = await req("GET", "/api/admin/stats", null, studToken);
check("student CANNOT reach /api/admin (403)", studAdmin.status === 403, `status=${studAdmin.status}`);
const facAdmin = await req("GET", "/api/admin/stats", null, token);
check("faculty CANNOT reach /api/admin (403)", facAdmin.status === 403, `status=${facAdmin.status}`);
const adminOk = await req("GET", "/api/admin/stats", null, adminToken);
check("admin CAN reach /api/admin/stats (200)", adminOk.status === 200, `status=${adminOk.status}`);
const facOverview = await req("GET", "/api/faculty/overview", null, token);
check("faculty CAN reach /api/faculty/overview (200)", facOverview.status === 200, `status=${facOverview.status}`);

console.log("\n=== MASS ASSIGNMENT ===");
const ma = await req("POST", "/api/students", { name: "MA Test", email: `ma_${rnd}@s.com`, department: "CS", semester: 3, phone: "9", createdAt: "1999-01-01T00:00:00Z", __v: 99, bogusField: "x" }, token);
check("unknown/protected fields are stripped", ma.status === 201 && ma.body.bogusField === undefined && new Date(ma.body.createdAt).getFullYear() > 2000, `body=${JSON.stringify(ma.body).slice(0,200)}`);

console.log("\n=== VALIDATION BOUNDS ===");
const semHi = await req("POST", "/api/students", { name: "Sem9", email: `s9_${rnd}@s.com`, department: "CS", semester: 9, phone: "1" }, token);
check("semester > 8 rejected (400)", semHi.status === 400, `status=${semHi.status}`);
const badEmail = await req("POST", "/api/students", { name: "BadMail", email: "not-an-email", department: "CS", semester: 1, phone: "1" }, token);
check("malformed email rejected (400)", badEmail.status === 400, `status=${badEmail.status}`);
const badStatus = await req("POST", "/api/students", { name: "BadStat", email: `bs_${rnd}@s.com`, department: "CS", semester: 1, phone: "1", status: "Zombie" }, token);
check("invalid status rejected (400)", badStatus.status === 400, `status=${badStatus.status}`);

console.log("\n=== HEADERS / HEALTH ===");
const health = await req("GET", "/api/health");
check("/api/health responds", health.status === 200 && health.body?.database === "connected", `body=${JSON.stringify(health.body)}`);
const hdr = await fetch(BASE + "/");
check("X-Powered-By removed", !hdr.headers.get("x-powered-by"), `got=${hdr.headers.get("x-powered-by")}`);
check("X-Content-Type-Options: nosniff", hdr.headers.get("x-content-type-options") === "nosniff", `got=${hdr.headers.get("x-content-type-options")}`);
check("X-Frame-Options: DENY", hdr.headers.get("x-frame-options") === "DENY", `got=${hdr.headers.get("x-frame-options")}`);

const badUpd = await req("PUT", `/api/students/${sid}`, { semester: "not-a-number" }, token);
check("PUT invalid field -> 400 (runValidators)", badUpd.status === 400, `status=${badUpd.status} body=${JSON.stringify(badUpd.body).slice(0,150)}`);

console.log("\n=== SEARCH / REGEX ===");
const rx = await req("GET", "/api/students?search=" + encodeURIComponent("a(b"), null, token);
check("unbalanced-paren search -> not 500", rx.status !== 500, `status=${rx.status} body=${JSON.stringify(rx.body).slice(0,200)}`);
const rx2 = await req("GET", "/api/students?search=" + encodeURIComponent("Normal"), null, token);
check("plain search works", rx2.status === 200 && Array.isArray(rx2.body), `status=${rx2.status}`);

console.log("\n=== MISC ===");
const count = await req("GET", "/api/students/count", null, token);
check("/students/count returns a number", count.status === 200 && typeof count.body?.total === "number", `status=${count.status} body=${JSON.stringify(count.body).slice(0,120)}`);
const four04 = await req("GET", "/api/nope");
check("unknown route -> 404 JSON", four04.status === 404, `status=${four04.status}`);
const badJson = await (async () => { try { const r = await fetch(BASE + "/api/auth/login", { method: "POST", headers: {"Content-Type":"application/json"}, body: "{oops" }); return { status: r.status }; } catch(e){ return {status:0}; } })();
check("malformed JSON body -> 400 not crash", badJson.status === 400, `status=${badJson.status}`);

console.log(results.join("\n"));
console.log(`\n──────────────────────────────\n  PASS: ${pass}   FAIL: ${fail}\n──────────────────────────────`);
