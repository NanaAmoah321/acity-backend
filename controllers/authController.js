const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!email.endsWith("@acity.edu.gh")) {
    return res.status(400).json({ message: "Use Acity email only" });
  }

  try {
    
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, hashedPassword]
    );

    res.json({
      message: "User registered successfully",
      user: newUser.rows[0],
    });

  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: err.message });
  }
};



exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
        { id: user.rows[0].id, role: user.rows[0].role },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "1d" }
    );

    const { password: _, ...safeUser } = user.rows[0];

    res.json({
      message: "Login successful",
      token,
      user: safeUser,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await pool.query(
      `
      SELECT
      id,
      name,
      email,
      department,
      level,
      bio,
      profile_picture,
      role,
      verified
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    res.json(user.rows[0]);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};
