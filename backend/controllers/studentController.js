import Student from "../models/Student.js";

// GET ALL (with optional filtering and search)
export const getStudents = async (req, res) => {
  try {
    const { department, semester, status, search } = req.query;
    const filter = {};

    if (department) {
      filter.department = department;
    }
    if (semester) {
      filter.semester = Number(semester);
    }
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const students = await Student.find(filter).sort({ createdAt: -1 });

    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ONE
export const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student)
      return res.status(404).json({
        message: "Student not found",
      });

    res.json(student);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ADD
export const addStudent = async (req, res) => {
  try {
    const { email } = req.body;

    const exists = await Student.findOne({ email });

    if (exists)
      return res.status(400).json({
        message: "Email already exists",
      });

    const student = await Student.create(req.body);

    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// UPDATE
export const updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );

    res.json(student);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// DELETE
export const deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);

    res.json({
      message: "Student Deleted",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// COUNT
export const studentCount = async (req, res) => {
  try {
    const total = await Student.countDocuments();

    res.json({
      total,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};