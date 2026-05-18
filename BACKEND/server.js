require("dotenv").config();
const app = require("./src/app");
const http = require("http");
const connectDB = require("./src/config/db");
const { initSocket } = require("./src/socket");

const PORT = process.env.PORT || 5000;

// Connect DB
connectDB().then(async () => {
  const { ensureAdminExists } = require('./src/controllers/adminController');
  await ensureAdminExists();
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);
app.set('io', io);

const cron = require("node-cron");
const { autoCloseSessions } = require("./src/controllers/bookingController");

// Runs every 5 minutes
cron.schedule("* * * * *", async () => {
  try {
    console.log("⏱ Auto-closing sessions...");
    await autoCloseSessions();
    console.log("✅ Auto-close completed");
  } catch (error) {
    console.error("❌ Auto-close failed:", error.message);
  }
});

// Start server with EADDRINUSE auto-recovery
let isShuttingDown = false;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io ready on port ${PORT}`);
});

server.on('error', (err) => {
  if (isShuttingDown) return;
  
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is in use. Attempting to free it...`);
    const { execSync } = require('child_process');
    try {
      execSync(`lsof -ti:${PORT} | xargs kill -9`);
      console.log(`✅ Freed port ${PORT}, restarting...`);
      setTimeout(() => {
        server.close();
        server.listen(PORT, () => {
          console.log(`🚀 Server running on port ${PORT}`);
          console.log(`🔌 Socket.io ready on port ${PORT}`);
        });
      }, 1000);
    } catch (e) {
      console.error(`❌ Could not free port ${PORT}. Please run: lsof -ti:${PORT} | xargs kill -9`);
      process.exit(1);
    }
  } else {
    throw err;
  }
});
// Trigger nodemon restart

