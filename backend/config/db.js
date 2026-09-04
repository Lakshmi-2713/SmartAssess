import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("✖ MONGO_URI is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  try {
    // Never log the URI itself — it carries the database credentials.
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10_000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error("✖ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
