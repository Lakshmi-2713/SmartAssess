#!/usr/bin/env node
/**
 * SmartAssess account seeder.
 *
 * Creates (or resets) one account per role with freshly generated, random
 * passwords and prints them once. Talks straight to MongoDB using the URI in
 * your .env, so it works on any machine and does not need the API running.
 *
 *   node scripts/seed.js                 # admin + faculty + student
 *   node scripts/seed.js --with-roster   # …plus sample students on the roster
 *   node scripts/seed.js --roles admin   # only the roles you name
 *   node scripts/seed.js --domain acme.edu
 *   node scripts/seed.js --password 'MyOwnPassw0rd'
 *   node scripts/seed.js --rotate-secret # also write a fresh JWT_SECRET to .env
 *   node scripts/seed.js --purge         # delete everything this script creates
 *
 * Re-running resets the password of an account that already exists, so it is
 * safe to run whenever you need a way back in.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";
import Student from "../models/Student.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const ENV_PATH = path.join(ROOT, ".env");

dotenv.config({ path: ENV_PATH });

/* ── CLI ──────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag, fallback = null) => {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--")
    ? argv[i + 1]
    : fallback;
};

if (has("--help") || has("-h")) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
  process.exit(0);
}

const DOMAIN = valueOf("--domain", "smartassess.local");
const FIXED_PASSWORD = valueOf("--password");
const WITH_ROSTER = has("--with-roster");
const PURGE = has("--purge");
const ROTATE_SECRET = has("--rotate-secret");
const FORCE = has("--force");

const ALL_ROLES = ["admin", "faculty", "student"];
const roles = (valueOf("--roles") || ALL_ROLES.join(","))
  .split(",")
  .map((r) => r.trim().toLowerCase())
  .filter(Boolean);

const badRole = roles.find((r) => !ALL_ROLES.includes(r));
if (badRole) {
  console.error(`✖ Unknown role "${badRole}". Choose from: ${ALL_ROLES.join(", ")}`);
  process.exit(1);
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

/**
 * Random password from an unambiguous alphabet (no 0/O, 1/l/I), grouped with
 * dashes so it can be read aloud and typed without mistakes.
 * ~77 bits of entropy at the default length.
 */
function generatePassword(groups = 3, size = 5) {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(groups * size);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  const out = [];
  for (let i = 0; i < groups; i += 1) {
    out.push(chars.slice(i * size, (i + 1) * size).join(""));
  }
  // A digit and a symbol keep it valid under stricter policies too.
  return `${out.join("-")}#${crypto.randomInt(10, 100)}`;
}

const ACCOUNTS = {
  admin: { name: "System Admin", department: "Administration" },
  faculty: { name: "Demo Faculty", department: "Computer Science" },
  student: { name: "Demo Student", department: "Computer Science" },
};

const SAMPLE_STUDENTS = [
  { name: "Rahul Verma", rollNumber: "CSE-2022-084", department: "Computer Science", semester: 4, phone: "+91 98765 43210" },
  { name: "Anjali Sharma", rollNumber: "IT-2022-011", department: "Information Technology", semester: 4, phone: "+91 98765 43211" },
  { name: "Vikram Singh", rollNumber: "DS-2021-045", department: "Data Science", semester: 6, phone: "+91 98765 43212" },
  { name: "Neha Gupta", rollNumber: "AI-2022-007", department: "Artificial Intelligence", semester: 4, phone: "+91 98765 43213" },
  { name: "Arjun Patel", rollNumber: "ME-2023-022", department: "Mechanical Engineering", semester: 2, phone: "+91 98765 43214", status: "Inactive" },
  { name: "Pooja Hegde", rollNumber: "CSE-2022-091", department: "Computer Science", semester: 4, phone: "+91 98765 43215" },
];

const emailFor = (role) => `${role}@${DOMAIN}`;
const rosterEmail = (name) =>
  `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${DOMAIN}`;

/** Refuse to touch anything that looks like production unless forced. */
function guardProduction(uri) {
  const looksProd =
    process.env.NODE_ENV === "production" ||
    /mongodb\+srv:\/\//.test(uri) ||
    /(prod|production)/i.test(uri);

  if (looksProd && !FORCE) {
    console.error(
      c.red("\n✖ This looks like a hosted or production database.\n") +
        c.dim(`   ${uri.replace(/\/\/[^@]+@/, "//****:****@")}\n\n`) +
        "  Seeding demo accounts there is almost never what you want.\n" +
        "  Re-run with --force if you are certain.\n"
    );
    process.exit(1);
  }
  return looksProd;
}

function rotateJwtSecret() {
  const secret = crypto.randomBytes(48).toString("hex");
  if (!fs.existsSync(ENV_PATH)) {
    console.log(c.yellow(`  ! No .env at ${ENV_PATH} — printing the secret instead.`));
    console.log(`    JWT_SECRET=${secret}`);
    return;
  }
  const original = fs.readFileSync(ENV_PATH, "utf8");
  fs.writeFileSync(`${ENV_PATH}.bak`, original); // keep a copy before editing
  const updated = /^JWT_SECRET=.*$/m.test(original)
    ? original.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`)
    : `${original.trimEnd()}\nJWT_SECRET=${secret}\n`;
  fs.writeFileSync(ENV_PATH, updated);
  console.log(c.green("  ✔ New JWT_SECRET written to .env") + c.dim(" (backup: .env.bak)"));
  console.log(c.dim("    Restart the API; existing sessions are invalidated."));
}

/* ── Main ─────────────────────────────────────────────────────────────── */

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error(
      c.red("✖ MONGO_URI is not set.") +
        `\n  Create ${path.relative(process.cwd(), ENV_PATH)} from .env.example first.`
    );
    process.exit(1);
  }

  guardProduction(uri);

  console.log(c.bold("\nSmartAssess seeder"));
  console.log(c.dim(`  database  ${uri.replace(/\/\/[^@]+@/, "//****:****@")}`));

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  } catch (err) {
    console.error(
      c.red(`\n✖ Could not connect to MongoDB: ${err.message}\n`) +
        "  Is mongod running? Try:  mongod --dbpath /tmp/smartassess\n"
    );
    process.exit(1);
  }

  if (PURGE) {
    const emails = ALL_ROLES.map(emailFor);
    const users = await User.deleteMany({ email: { $in: emails } });
    const students = await Student.deleteMany({
      email: { $regex: `@${DOMAIN.replace(/\./g, "\\.")}$` },
    });
    console.log(
      c.green(
        `\n  ✔ Removed ${users.deletedCount} account(s) and ${students.deletedCount} roster record(s) for @${DOMAIN}\n`
      )
    );
    await mongoose.connection.close();
    return;
  }

  const created = [];

  for (const role of roles) {
    const meta = ACCOUNTS[role];
    const email = emailFor(role);
    const password = FIXED_PASSWORD || generatePassword();

    // Assigning and saving (rather than updateOne) lets the model's pre-save
    // hook hash the password — never write a raw password to the collection.
    let user = await User.findOne({ email }).select("+password");
    let action;

    if (user) {
      user.password = password;
      user.name = meta.name;
      user.role = role;
      user.department = meta.department;
      user.isActive = true;
      await user.save();
      action = "reset";
    } else {
      user = await User.create({
        name: meta.name,
        email,
        password,
        role,
        department: meta.department,
      });
      action = "created";
    }

    created.push({ role, email, password, action });
  }

  if (WITH_ROSTER) {
    let added = 0;
    for (const s of SAMPLE_STUDENTS) {
      const email = rosterEmail(s.name);
      const exists = await Student.findOne({ email });
      if (exists) continue;
      await Student.create({ ...s, email, status: s.status || "Active" });
      added += 1;
    }
    const total = await Student.countDocuments();
    console.log(
      c.dim(`  roster    ${added} added, ${total} total`)
    );
  }

  /* ── Output ── */
  const pad = (s, n) => String(s).padEnd(n);
  const wRole = Math.max(6, ...created.map((a) => a.role.length));
  const wMail = Math.max(6, ...created.map((a) => a.email.length));
  const wPass = Math.max(8, ...created.map((a) => a.password.length));

  console.log(c.bold("\n  Credentials") + c.dim("  (shown once — save them now)\n"));
  console.log(
    c.dim(`  ${pad("ROLE", wRole)}  ${pad("EMAIL", wMail)}  ${pad("PASSWORD", wPass)}`)
  );
  console.log(c.dim(`  ${"─".repeat(wRole)}  ${"─".repeat(wMail)}  ${"─".repeat(wPass)}`));
  for (const a of created) {
    console.log(
      `  ${c.cyan(pad(a.role, wRole))}  ${pad(a.email, wMail)}  ${c.bold(pad(a.password, wPass))}  ${c.dim(a.action)}`
    );
  }

  if (ROTATE_SECRET) {
    console.log();
    rotateJwtSecret();
  } else if (
    !process.env.JWT_SECRET ||
    /replace-me|change-?me|secret_key|testsecret/i.test(process.env.JWT_SECRET) ||
    process.env.JWT_SECRET.length < 32
  ) {
    console.log(
      c.yellow("\n  ! JWT_SECRET is missing, weak, or still the placeholder.") +
        "\n    Anyone who knows it can forge an admin token." +
        c.dim("\n    Fix with:  node scripts/seed.js --rotate-secret")
    );
  }

  console.log(
    c.dim("\n  These are development accounts with generated passwords.") +
      c.dim("\n  Delete them before deploying:  node scripts/seed.js --purge\n")
  );

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error(c.red(`\n✖ Seeding failed: ${err.message}\n`));
  if (err.errors) {
    for (const [field, e] of Object.entries(err.errors)) {
      console.error(`   ${field}: ${e.message}`);
    }
  }
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
