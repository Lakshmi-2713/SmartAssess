import express from "express";
import Student from "../models/Student.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("faculty", "admin"));

// GET /api/faculty/overview
router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const [totalStudents, activeStudents, departments] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: "Active" }),
      Student.distinct("department"),
    ]);

    res.status(200).json({
      success: true,
      totalStudents,
      activeStudents,
      departmentCount: departments.filter(Boolean).length,
      faculty: {
        name: req.user.name,
        email: req.user.email,
        department: req.user.department || "",
      },
    });
  })
);

// GET /api/faculty/colleagues
router.get(
  "/colleagues",
  asyncHandler(async (req, res) => {
    const faculty = await User.find({ role: "faculty", isActive: true })
      .select("name email department")
      .sort({ name: 1 })
      .limit(100);
    res.status(200).json({ success: true, faculty });
  })
);

export default router;
