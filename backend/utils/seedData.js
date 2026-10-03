import User from "../models/User.js";
import Student from "../models/Student.js";

const DEFAULT_USERS = [
  {
    name: "Alex Student",
    email: "student@smartassess.edu",
    password: "password123",
    role: "student",
    department: "Computer Science",
  },
  {
    name: "Dr. Sarah Jenkins",
    email: "faculty@smartassess.edu",
    password: "password123",
    role: "faculty",
    department: "Computer Science",
  },
  {
    name: "System Admin",
    email: "admin@smartassess.edu",
    password: "password123",
    role: "admin",
    department: "Administration",
  },
];

const DEFAULT_STUDENTS = [
  {
    name: "Rahul Verma",
    email: "rahul.verma@student.com",
    rollNumber: "CSE-2022-084",
    department: "Computer Science",
    semester: 4,
    phone: "+91 98765 43210",
    status: "Active",
  },
  {
    name: "Anjali Sharma",
    email: "anjali.s@student.com",
    rollNumber: "CSE-2022-042",
    department: "Computer Science",
    semester: 4,
    phone: "+91 98765 43211",
    status: "Active",
  },
  {
    name: "Vikram Singh",
    email: "vikram.s@student.com",
    rollNumber: "IT-2022-019",
    department: "Information Technology",
    semester: 6,
    phone: "+91 98765 43212",
    status: "Active",
  },
  {
    name: "Neha Gupta",
    email: "neha.g@student.com",
    rollNumber: "DS-2023-011",
    department: "Data Science",
    semester: 2,
    phone: "+91 98765 43213",
    status: "Active",
  },
  {
    name: "Priya Patel",
    email: "priya.p@student.com",
    rollNumber: "AI-2023-005",
    department: "Artificial Intelligence",
    semester: 2,
    phone: "+91 98765 43214",
    status: "Active",
  },
];

export const seedDefaultData = async () => {
  try {
    for (const u of DEFAULT_USERS) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
        console.log(`🌱 Seeded user: ${u.email} (${u.role})`);
      }
    }

    const studentCount = await Student.countDocuments();
    if (studentCount === 0) {
      await Student.insertMany(DEFAULT_STUDENTS);
      console.log(`🌱 Seeded ${DEFAULT_STUDENTS.length} initial students into roster.`);
    }
  } catch (err) {
    console.warn("⚠️ Warning: Could not run seed data:", err.message);
  }
};
