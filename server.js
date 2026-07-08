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


if(!process.env.JWT_SECRET){

    throw new Error(

        "JWT_SECRET missing"

    );

}
const app = express();
const server = http.createServer(app);

const io = new Server(server,{

    cors:{

        origin:[

            "https://acityconnect.com",

            "https://www.acityconnect.com"

        ],

        methods:["GET","POST"],

        credentials:true

    }

});

const onlineUsers = new Map();

app.set("io", io);
app.set(
    "onlineUsers",
    onlineUsers
);
  
app.use(helmet());
app.use(cors({
  origin: [
    "https://acityconnect.com",
    "https://www.acityconnect.com",
  ],
  credentials: true,
}));

app.use(express.json({

    limit:"10mb"

}));

app.use((err,req,res,next)=>{

    if(

        err instanceof require("multer").MulterError

    ){

        return res.status(400).json({

            error:err.message

        });

    }

    if(

        err.message

    ){

        return res.status(400).json({

            error:err.message

        });

    }

    next();

});

app.use("/api/notifications", notificationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);

app.use("/api/services", serviceRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/follow", followRoutes);
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



app.get("/",(req,res)=>{

    res.sendStatus(404);

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

const {
    globalLimiter
} = require("./middleware/rateLimiters");

app.use(globalLimiter);



app.use(

    "/api/email",

    emailRoutes

);

require("./workers/emailWorker");

server.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});


