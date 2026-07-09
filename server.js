const express = require("express");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const listingRoutes = require("./routes/listingRoutes");
const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const messageRoutes = require("./routes/messageRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const followRoutes = require("./routes/followRoutes");
const emailRoutes = require("./routes/emailRoutes");
const { globalLimiter } = require("./middleware/rateLimiters");

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
}

const app = express();

/* =====================================
   1. CORE SECURITY & GLOBAL MIDDLEWARE
===================================== */
app.set('trust proxy', 1);
app.use(helmet());

// Dynamic CORS Configuration
const allowedOrigins = [
  "https://acityconnect.com",
  "https://www.acityconnect.com",
  "http://127.0.0.1:5500",
  "http://localhost:5500"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Request parsers & rate limiters must sit ABOVE routes
app.use(express.json({ limit: "10mb" }));
app.use(globalLimiter);

/* =====================================
   2. HTTP & WEBSOCKET ENGINE INITIALIZATION
===================================== */
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const onlineUsers = new Map();
app.set("io", io);
app.set("onlineUsers", onlineUsers);

/* =====================================
   3. MULTER & GLOBAL ERROR HANDLING
===================================== */
app.use((err, req, res, next) => {
    if (err instanceof require("multer").MulterError) {
        return res.status(400).json({ error: err.message });
    }
    if (err.message) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

/* =====================================
   4. SYSTEM API ROUTING REST CONTROLLERS
===================================== */
app.use("/api/notifications", notificationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/email", emailRoutes);

app.get("/", (req, res) => {
    res.sendStatus(404);
});

/* =====================================
   5. DATABASE INFRASTRUCTURE MONITOR
===================================== */
pool.query("SELECT 1")
  .then(() => console.log("PostgreSQL Connected Successfully"))
  .catch(err => console.error("DB error:", err));

/* =====================================
   6. AUTO DELETE SOLD ITEMS DAEMON
===================================== */
async function deleteOldSoldListings() {
  try {
    const result = await pool.query(
      `
      DELETE FROM listings
      WHERE status = 'sold'
      AND sold_at < NOW() - INTERVAL '30 days'
      RETURNING *
      `
    );
    if (result.rows.length > 0) {
      console.log(`${result.rows.length} sold listing(s) removed`);
    }
  } catch (err) {
    console.error("Auto delete error:", err);
  }
}

// Run once per day + immediately on startup
setInterval(deleteOldSoldListings, 24 * 60 * 60 * 1000);
deleteOldSoldListings();

/* =====================================
   7. REAL-TIME EVENT STREAM CONTROLLER
===================================== */
io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join", (userId) => {
      socket.userId = userId;
      socket.join(`user_${userId}`);
      onlineUsers.set(userId, socket.id);
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
      }
    });
});

/* =====================================
   8. RUNTIME BOOTSTRAPPING PROCESS
===================================== */
require("./workers/emailWorker");

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});