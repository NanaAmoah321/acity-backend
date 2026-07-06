const express = require("express");
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

const app = express();
const server = http.createServer(app);

const io = new Server(server,{

    cors:{
        origin:"*"
    }

});

const onlineUsers = new Map();

app.set("io", io);
app.set(
    "onlineUsers",
    onlineUsers
);

app.use(cors());
app.use(express.json());

app.use("/api/notifications", notificationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);

app.use("/api/services", serviceRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);

pool.query("SELECT 1")
  .then(() =>
    console.log(
      "PostgreSQL Connected Successfully"
    )
  )
  .catch(err =>
    console.error(
      "DB error:",
      err
    )
  );

app.get("/test-db", async (req, res) => {

  try {

    const result =
    await pool.query(
      "SELECT * FROM users"
    );

    res.json(
      result.rows
    );

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

app.get("/", (req, res) => {

  res.send(
    "Welcome to Acity Marketplace API"
  );

});

app.get("/api/test", (req, res) => {

  res.send(
    "API working"
  );

});


/* ==========================
   AUTO DELETE SOLD ITEMS
   ========================== */

async function deleteOldSoldListings() {

  try {

    const result =
    await pool.query(
      `
      DELETE FROM listings
      WHERE
        status = 'sold'
      AND
        sold_at <
        NOW() - INTERVAL '30 days'
      RETURNING *
      `
    );

    if (
      result.rows.length > 0
    ) {

      console.log(
        `${result.rows.length} sold listing(s) removed`
      );

    }

  } catch (err) {

    console.error(
      "Auto delete error:",
      err
    );

  }

}

/* Run once per day */

setInterval(
  deleteOldSoldListings,
  24 * 60 * 60 * 1000
);

/* Optional: run immediately on startup */

deleteOldSoldListings();


io.on("connection",(socket)=>{

    console.log(
        "Socket connected:",
        socket.id
    );

    socket.on("join",(userId)=>{

      socket.userId = userId;

      socket.join(`user_${userId}`);

      onlineUsers.set(
        userId,
        socket.id
      );

    });

    socket.on("disconnect",()=>{

      if(socket.userId){

        onlineUsers.delete(
            socket.userId
        );

      }

    });

});
const PORT =
process.env.PORT || 5000;

server.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});

app.use(
    "/api/notifications",
    notificationRoutes
);

