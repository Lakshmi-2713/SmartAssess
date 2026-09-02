import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";

const VALID_ROLES = ["student", "faculty", "admin"];
const MIN_PASSWORD_LENGTH = 8;

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department || "",
});

// =======================
// POST /api/auth/register
// =======================
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, department } = req.body || {};

  // Validate before touching bcrypt — passing undefined to bcrypt.hash
  // throws "Illegal arguments" and surfaces as an opaque 500.
  if (!name || !email || !password || !role) {
    throw ApiError.badRequest("Name, email, password and role are all required.");
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw ApiError.badRequest(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }
  if (!VALID_ROLES.includes(role)) {
    throw ApiError.badRequest(`Role must be one of: ${VALID_ROLES.join(", ")}.`);
  }

  const normalisedEmail = String(email).trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalisedEmail });
  if (existingUser) {
    throw ApiError.badRequest("An account with that email already exists.");
  }

  // The pre-save hook hashes the password; no call site handles the hash.
  const user = await User.create({
    name,
    email: normalisedEmail,
    password,
    role,
    department: department || "",
  });

  res.status(201).json({
    success: true,
    message: "Account created successfully.",
    token: generateToken(user),
    user: publicUser(user),
  });
});

// =======================
// POST /api/auth/login
// =======================
export const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body || {};

  if (!email || !password) {
    throw ApiError.badRequest("Email and password are required.");
  }

  const query = { email: String(email).trim().toLowerCase() };
  if (role) query.role = role;

  // `password` is `select: false` on the schema, so ask for it explicitly.
  const user = await User.findOne(query).select("+password");

  // One generic message for both branches: revealing which half was wrong
  // turns the endpoint into an account-enumeration oracle.
  const invalid = ApiError.unauthorized("Invalid email, password or role.");

  if (!user) throw invalid;
  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated.");
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw invalid;

  res.status(200).json({
    success: true,
    message: "Signed in successfully.",
    token: generateToken(user),
    user: publicUser(user),
  });
});

// =======================
// GET /api/auth/me
// =======================
export const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: publicUser(req.user) });
});
