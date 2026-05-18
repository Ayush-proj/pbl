const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.error("❌ MONGODB_URI is not defined in environment variables");
      process.exit(1);
    }
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
