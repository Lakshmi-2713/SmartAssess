import express from "express";

import {
  getStudents,
  getStudent,
  addStudent,
  updateStudent,
  deleteStudent,
  studentCount,
} from "../controllers/studentController.js";

const router = express.Router();

router.get("/", getStudents);

router.get("/count", studentCount);

router.get("/:id", getStudent);

router.post("/", addStudent);

router.put("/:id", updateStudent);

router.delete("/:id", deleteStudent);

export default router;