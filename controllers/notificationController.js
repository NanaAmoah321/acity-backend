const pool = require("../config/db");

exports.getNotifications = async (req, res) => {

    try {

        const notifications = await pool.query(
            `
            SELECT *
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
            [req.user.id]
        );

        res.json(notifications.rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }

};

exports.getUnreadCount = async (req, res) => {

    try {

        const count = await pool.query(
            `
            SELECT COUNT(*) AS count
            FROM notifications
            WHERE user_id = $1
            AND is_read = false
            `,
            [req.user.id]
        );

        res.json(count.rows[0]);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};

exports.markAsRead = async (req, res) => {

    try {

        await pool.query(
            `
            UPDATE notifications
            SET is_read = true
            WHERE id = $1
            AND user_id = $2
            `,
            [
                req.params.id,
                req.user.id
            ]
        );

        res.json({
            message: "Notification read"
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};