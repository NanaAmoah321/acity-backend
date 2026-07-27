const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendWelcomeEmail } = require("../utils/emailTemplates");
const crypto = require("crypto");
const { resetPasswordTemplate } = require("../utils/emailTemplates");
const {verifyGoogleToken} = require("../utils/googleAuth");


exports.register = async (req, res) => {
    
  const { name, email, password, receive_marketplace_updates } = req.body;
    
  const normalizedEmail = email?.trim().toLowerCase();

  if (
    !normalizedEmail.endsWith("@acity.edu.gh") &&
    !normalizedEmail.endsWith("@gmail.com")
  ) {
    return res.status(400).json({
        message: "Use Acity or Gmail email."
    });
  }

  try {
    
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    if(password.length < 8){

    return res.status(400).json({

        message:
        "Password must be at least 8 characters."

    });

    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password, receive_marketplace_updates) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, normalizedEmail, hashedPassword, receive_marketplace_updates]
    );

    sendWelcomeEmail(newUser.rows[0]).catch(err => console.error("Error sending welcome email:", err));

    const {

        password:_,

        ...safeUser

    } = newUser.rows[0];

    res.json({

        message:

        "User registered successfully",

        user:safeUser

    });

    

  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: err.message });
  }
};



exports.login = async (req, res) => {
    
  const { email, password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

  try {
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [normalizedEmail]
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
        process.env.JWT_SECRET,
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

exports.googleLogin = async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({
            message: "Missing Google credential"
        });
    }

    try {
        const payload = await verifyGoogleToken(credential);

        const email = payload.email.toLowerCase().trim();
        const name = payload.name;
        const picture = payload.picture;

        let user = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (user.rows.length > 0 && user.rows[0].profile_picture !== picture) {

            await pool.query(
                `
                UPDATE users
                SET profile_picture = $1
                WHERE id = $2
                `,
                [
                    picture,
                    user.rows[0].id
                ]
            );

            user = await pool.query(
                "SELECT * FROM users WHERE id = $1",
                [user.rows[0].id]
            );

        }

        

        // Create account if first login
        if (user.rows.length === 0) {
            const randomPassword = crypto.randomUUID();
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            const newUser = await pool.query(
                `
                INSERT INTO users
                (
                    name,
                    email,
                    password,
                    profile_picture,
                    verified,
                    role
                )
                VALUES
                ($1, $2, $3, $4, true, 'user')
                RETURNING *
                `,
                [
                    name,
                    email,
                    hashedPassword,
                    picture
                ]
            );

            user = newUser;
        }

        const token = jwt.sign(
            {
                id: user.rows[0].id,
                role: user.rows[0].role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        const { password, ...safeUser } = user.rows[0];

        res.json({
            message: "Login successful",
            token,
            user: safeUser
        });

    } catch (err) {
        console.error("Google Auth Error:", err);

        res.status(401).json({
            message: "Google authentication failed"
        });
    }
};

exports.forgotPassword = async (req, res) => {

    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    try {

        const user = await pool.query(
            `
            SELECT *
            FROM users
            WHERE email = $1
            `,
            [normalizedEmail]
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
        `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        await sendEmail(

            normalizedEmail,

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
        await bcrypt.hash(password,12);

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

    try{

        const {
            name,
            level,
            bio
        } = req.body;

        const user = await pool.query(

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
                role,
                department,
                level,
                bio,
                profile_picture,
                verified

            `,

            [
                name,
                level,
                bio,
                req.user.id
            ]

        );

        res.json(user.rows[0]);

    }catch(err){

        res.status(500).json({

            error: err.message

        });

    }

};