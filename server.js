const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const listingRoutes = require("./routes/listingRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);

pool.query("SELECT 1")
  .then(() => console.log("PostgreSQL Connected Successfully"))
  .catch(err => console.error("DB error:", err));

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
    res.send("Welcome to Acity Marketplace API");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/api/test", (req, res) => {
  res.send("API working");
});