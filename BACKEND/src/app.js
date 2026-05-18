const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = [
  "https://mentorconnect-hazel.vercel.app",
  /\.vercel\.app$/,
  "http://localhost:5173",
  "http://localhost:5175",
  "http://localhost:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.some(o => 
      typeof o === 'string' ? o === origin : o.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mentor Connect Backend is running 🚀",
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasJwt: !!process.env.JWT_SECRET,
      hasMongo: !!process.env.MONGODB_URI,
      hasRazorpay: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
    }
  });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, timestamp: new Date().toISOString() });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/candidate", require("./routes/candidate.routes"));
app.use("/api/mentor", require("./routes/mentorRoutes"));
app.use("/api/booking", require("./routes/booking.routes"));
app.use("/api/payment", require("./routes/payment.routes"));
app.use("/api/review", require("./routes/review.routes"));
app.use("/api/chat", require("./routes/chat.routes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found", path: req.path });
});

app.use(require("./middlewares/error.middleware"));

module.exports = app;