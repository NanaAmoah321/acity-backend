const pool = require("../config/db");

exports.getNotifications =
async (req, res) => {

    try {

        const result =
        await pool.query(
            `
            SELECT *
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
            [req.user.id]
        );

        res.json(
            result.rows
        );

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};