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

        return res.json(notifications.rows);
    } catch (err) {
        console.error("Get Notifications Error:", err);
        return res.status(500).json({ message: "Failed to fetch notifications." });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const countResult = await pool.query(
            `
            SELECT COUNT(*)::INT AS count
            FROM notifications
            WHERE user_id = $1
            AND is_read = false
            `,
            [req.user.id]
        );

        return res.json({ count: countResult.rows[0].count });
    } catch (err) {
        console.error("Get Unread Count Error:", err);
        return res.status(500).json({ message: "Failed to fetch unread count." });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const result = await pool.query(
            `
            UPDATE notifications
            SET is_read = true
            WHERE id = $1
            AND user_id = $2
            RETURNING id
            `,
            [req.params.id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Notification not found." });
        }

        return res.json({ message: "Notification marked as read." });
    } catch (err) {
        console.error("Mark As Read Error:", err);
        return res.status(500).json({ message: "Failed to update notification status." });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await pool.query(
            `
            UPDATE notifications
            SET is_read = true
            WHERE user_id = $1
            AND is_read = false
            `,
            [req.user.id]
        );

        return res.json({ message: "All notifications marked as read." });
    } catch (err) {
        console.error("Mark All As Read Error:", err);
        return res.status(500).json({ message: "Failed to mark all as read." });
    }
};