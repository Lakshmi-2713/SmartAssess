import express from "express";
import Student from "../models/Student.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("admin"));

// GET /api/admin/stats
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const [students, activeStudents, facultyCount, adminCount, departments] =
      await Promise.all([
        Student.countDocuments(),
        Student.countDocuments({ status: "Active" }),
        User.countDocuments({ role: "faculty" }),
        User.countDocuments({ role: "admin" }),
        Student.distinct("department"),
      ]);

    res.status(200).json({
      success: true,
      students,
      activeStudents,
      facultyCount,
      adminCount,
      departmentCount: departments.filter(Boolean).length,
    });
  })
);

// GET /api/admin/users
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await User.find()
      .select("name email role department isActive createdAt")
      .sort({ createdAt: -1 })
      .limit(200);
    res.status(200).json({ success: true, users });
  })
);

// PATCH /api/admin/users/:id/status
router.patch(
  "/users/:id/status",
  asyncHandler(async (req, res) => {
    const { isActive } = req.body || {};
    if (typeof isActive !== "boolean") {
      throw ApiError.badRequest("'isActive' must be a boolean.");
    }
    if (String(req.user._id) === req.params.id && isActive === false) {
      throw ApiError.badRequest("You cannot deactivate your own account.");
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select("name email role isActive");

    if (!user) throw ApiError.notFound("User not found");

    res.status(200).json({ success: true, user });
  })
);

export default router;
