const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// --------------------
// Global Middlewares
// --------------------
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --------------------
// Health Check
// --------------------
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mentor Connect Backend is running 🚀"
  });
});

// --------------------
// Routes
// --------------------
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/candidate", require("./routes/candidate.routes"));
app.use("/api/mentor", require("./routes/mentorRoutes"));
app.use("/api/booking", require("./routes/booking.routes"));
app.use("/api/payment", require("./routes/payment.routes"));
app.use("/api/review", require("./routes/review.routes"));
app.use("/api/chat", require("./routes/chat.routes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// --------------------
// 404 Handler
// --------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// --------------------
// Global Error Handler (LAST)
// --------------------
app.use(require("./middlewares/error.middleware"));

module.exports = app;
