import mongoose from "mongoose";
import "dotenv/config";

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🚀 ~ Connected to MongoDB")

  } catch (err) {
    console.log("🚀 ~ MongoDB connection failed", { err });
  }
};

export default connectDB;
