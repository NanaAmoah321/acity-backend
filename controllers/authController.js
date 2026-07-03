const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/email");
const { welcomeTemplate } = require("../utils/emailTemplates");
const crypto = require("crypto");
const { resetPasswordTemplate } = require("../utils/emailTemplates");


exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  if (
    !email.endsWith("@acity.edu.gh") &&
    !email.endsWith("@gmail.com")
  ) {
    return res.status(400).json({
        message: "Use Acity or Gmail email."
    });
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

    sendEmail(
    email,
    "🎉 Welcome to Acity Connect",
    welcomeTemplate(name)
    ).catch(err => {
    console.error("Welcome email failed:", err);
    });

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

exports.forgotPassword = async (req, res) => {

    const { email } = req.body;

    try {

        const user = await pool.query(
            `
            SELECT *
            FROM users
            WHERE email = $1
            `,
            [email]
        );

        if(user.rows.length === 0){

            return res.json({
                message:
                "If the account exists, a reset email has been sent."
            });

        }

        const token =
        crypto.randomBytes(32).toString("hex");

        const expires =
        new Date(
            Date.now() + 30 * 60 * 1000
        );

        await pool.query(
            `
            UPDATE users
            SET
            reset_token = $1,
            reset_token_expires = $2
            WHERE id = $3
            `,
            [
                token,
                expires,
                user.rows[0].id
            ]
        );

        const resetLink =

        `https://nanaamoah321.github.io/acity-frontend/reset-password.html?token=${token}`;

        await sendEmail(

            email,

            "Reset your Acity Connect password",

            resetPasswordTemplate(
                user.rows[0].name,
                resetLink
            )

        );

        res.json({

            message:
            "Password reset email sent."

        });

    } catch(err){

        res.status(500).json({

            error:err.message

        });

    }

};

exports.resetPassword = async (req, res) => {

    const { token } = req.params;

    const { password } = req.body;

    try {

        const user = await pool.query(
            `
            SELECT *
            FROM users
            WHERE
            reset_token = $1

            AND

            reset_token_expires > NOW()
            `,
            [token]
        );

        if(user.rows.length === 0){

            return res.status(400).json({

                message:
                "Invalid or expired reset link."

            });

        }

        const hashedPassword =
        await bcrypt.hash(password,10);

        await pool.query(
            `
            UPDATE users

            SET

            password = $1,

            reset_token = NULL,

            reset_token_expires = NULL

            WHERE id = $2
            `,
            [
                hashedPassword,
                user.rows[0].id
            ]
        );

        res.json({

            message:
            "Password updated successfully."

        });

    } catch(err){

        res.status(500).json({

            error:err.message

        });

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

exports.updateProfile = async (req, res) => {

    const {

        name,
        level,
        bio

    } = req.body;

    try {

        const result = await pool.query(

            `
            UPDATE users

            SET

                name = $1,

                level = $2,

                bio = $3

            WHERE id = $4

            RETURNING

                id,

                name,

                email,

                department,

                level,

                bio,

                profile_picture,

                role,

                verified
            `,

            [

                name,

                level,

                bio,

                req.user.id

            ]

        );

        res.json(result.rows[0]);

    } catch (err) {

        console.error(err);

        res.status(500).json({

            error: err.message

        });

    }

};