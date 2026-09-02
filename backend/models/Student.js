import mongoose from "mongoose";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [120, "Name must be at most 120 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [EMAIL_PATTERN, "Please provide a valid email address"],
    },

    rollNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },

    semester: {
      type: Number,
      required: [true, "Semester is required"],
      min: [1, "Semester must be between 1 and 8"],
      max: [8, "Semester must be between 1 and 8"],
    },

    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      maxlength: [24, "Phone must be at most 24 characters"],
    },

    status: {
      type: String,
      enum: {
        values: ["Active", "Inactive"],
        message: "Status must be Active or Inactive",
      },
      default: "Active",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Supports the roster's filter + sort query without a collection scan.
studentSchema.index({ department: 1, semester: 1, status: 1 });
studentSchema.index({ createdAt: -1 });

export default mongoose.model("Student", studentSchema);
