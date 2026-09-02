import express from "express";

import {
  getStudents,
  getStudent,
  addStudent,
  updateStudent,
  deleteStudent,
  studentCount,
} from "../controllers/studentController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Every roster route requires a valid session.
router.use(protect);

// Static segment must be declared before "/:id", or "count" is read as an id.
router.get("/count", studentCount);

router.get("/", getStudents);
router.get("/:id", getStudent);

// Mutations are restricted to staff.
router.post("/", authorize("faculty", "admin"), addStudent);
router.put("/:id", authorize("faculty", "admin"), updateStudent);
router.delete("/:id", authorize("admin"), deleteStudent);

export default router;
