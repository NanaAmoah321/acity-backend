const pool = require("../config/db");

exports.sendMessage = async (req, res) => {

    const { receiver_id, message } = req.body;

    try {

        const result = await pool.query(
            `
            INSERT INTO messages
            (
                sender_id,
                receiver_id,
                message
            )
            VALUES
            ($1,$2,$3)
            RETURNING *
            `,
            [
                req.user.id,
                receiver_id,
                message
            ]
        );

        res.json(result.rows[0]);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};

exports.getInbox = async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                messages.*,
                users.name AS sender_name
            FROM messages
            JOIN users
            ON messages.sender_id = users.id
            WHERE receiver_id = $1
            ORDER BY created_at DESC
            `,
            [req.user.id]
        );

        res.json(result.rows);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};

exports.getConversations = async (req, res) => {

    try {

        const result = await pool.query(
        `
        SELECT DISTINCT ON (
            CASE
                WHEN sender_id = $1
                THEN receiver_id
                ELSE sender_id
            END
        )

            messages.*,

            CASE
                WHEN sender_id = $1
                THEN receiver.name
                ELSE sender.name
            END AS conversation_name,

            CASE
                WHEN sender_id = $1
                THEN receiver.id
                ELSE sender.id
            END AS conversation_user_id

        FROM messages

        JOIN users sender
        ON sender.id = messages.sender_id

        JOIN users receiver
        ON receiver.id = messages.receiver_id

        WHERE
            sender_id = $1
            OR
            receiver_id = $1

        ORDER BY

        CASE
            WHEN sender_id = $1
            THEN receiver_id
            ELSE sender_id
        END,

        created_at DESC
        `,
        [req.user.id]
        );

        res.json(result.rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }

};

exports.getConversation = async (req, res) => {

    const otherUserId = req.params.userId;

    try {

        const result = await pool.query(
            `
            SELECT
                messages.*,

                users.name AS sender_name

            FROM messages

            JOIN users
            ON users.id = messages.sender_id

            WHERE

            (
                sender_id = $1
                AND receiver_id = $2
            )

            OR

            (
                sender_id = $2
                AND receiver_id = $1
            )

            ORDER BY created_at ASC
            `,
            [
                req.user.id,
                otherUserId
            ]
        );

        await pool.query(
            `
            UPDATE messages
            SET is_read = TRUE

            WHERE

            sender_id = $1

            AND

            receiver_id = $2
           `,
            [
                otherUserId,
                req.user.id
            ]
        );

        res.json(result.rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }

};

exports.getUnreadCount =
async (req, res) => {

    try {

        const result =
        await pool.query(
            `
            SELECT COUNT(*)
            AS count

            FROM messages

            WHERE

            receiver_id = $1

            AND

            is_read = FALSE
            `,
            [
                req.user.id
            ]
        );

        res.json(
            result.rows[0]
        );

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};