import mongoose from "mongoose";
import Student from "../models/Student.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import escapeRegex from "../utils/escapeRegex.js";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

/** Fields a client is allowed to set. Everything else in the body is ignored. */
const WRITABLE_FIELDS = [
  "name",
  "email",
  "rollNumber",
  "department",
  "semester",
  "phone",
  "status",
];

/**
 * Whitelist the request body. Blocks mass assignment and, critically, stops a
 * client-generated `_id` (e.g. "std_1699…") reaching Mongoose, where it fails
 * to cast to ObjectId and takes the whole request down with a 500.
 */
const pickWritable = (body = {}) => {
  const out = {};
  for (const field of WRITABLE_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  if (out.semester !== undefined) {
    const n = Number(out.semester);
    out.semester = Number.isFinite(n) ? n : out.semester; // let the schema reject junk
  }
  return out;
};

const assertValidId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.notFound("Student not found");
  }
};

// GET /api/students
export const getStudents = asyncHandler(async (req, res) => {
  const { department, semester, status, search, page, limit } = req.query;
  const filter = {};

  if (department) filter.department = department;
  if (status) filter.status = status;

  if (semester) {
    const parsed = Number(semester);
    if (!Number.isFinite(parsed)) {
      throw ApiError.badRequest("'semester' must be a number.");
    }
    filter.semester = parsed;
  }

  if (search) {
    // Escaped: an unbalanced "(" used to throw "Regular expression is
    // invalid" and return a 500, and crafted patterns invited backtracking.
    const safe = new RegExp(escapeRegex(String(search).trim()), "i");
    filter.$or = [
      { name: safe },
      { email: safe },
      { rollNumber: safe },
      { department: safe },
      { phone: safe },
    ];
  }

  const perPage = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(limit) || DEFAULT_LIMIT)
  );
  const currentPage = Math.max(1, Number(page) || 1);

  const [students, total] = await Promise.all([
    Student.find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage),
    Student.countDocuments(filter),
  ]);

  // Returned as a bare array for backwards compatibility with the client,
  // with paging metadata exposed via headers.
  res.setHeader("X-Total-Count", total);
  res.setHeader("X-Page", currentPage);
  res.setHeader("X-Per-Page", perPage);
  res.status(200).json(students);
});

// GET /api/students/count
export const studentCount = asyncHandler(async (req, res) => {
  const [total, active, inactive] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ status: "Active" }),
    Student.countDocuments({ status: "Inactive" }),
  ]);
  res.status(200).json({ total, active, inactive });
});

// GET /api/students/:id
export const getStudent = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);

  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound("Student not found");

  res.status(200).json(student);
});

// POST /api/students
export const addStudent = asyncHandler(async (req, res) => {
  const payload = pickWritable(req.body);

  if (payload.email) {
    const email = String(payload.email).trim().toLowerCase();
    const exists = await Student.findOne({ email });
    if (exists) {
      throw ApiError.conflict("A student with that email already exists.");
    }
    payload.email = email;
  }

  const student = await Student.create(payload);
  res.status(201).json(student);
});

// PUT /api/students/:id
export const updateStudent = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);

  const payload = pickWritable(req.body);

  if (payload.email) {
    const email = String(payload.email).trim().toLowerCase();
    const clash = await Student.findOne({
      email,
      _id: { $ne: req.params.id },
    });
    if (clash) {
      throw ApiError.conflict("Another student already uses that email.");
    }
    payload.email = email;
  }

  const student = await Student.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    // Without this, updates bypass every schema rule the model declares.
    runValidators: true,
    context: "query",
  });

  // Previously returned 200 with a null body, which the UI reported as success.
  if (!student) throw ApiError.notFound("Student not found");

  res.status(200).json(student);
});

// DELETE /api/students/:id
export const deleteStudent = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);

  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) throw ApiError.notFound("Student not found");

  res.status(200).json({
    success: true,
    message: "Student deleted",
    _id: student._id,
  });
});
