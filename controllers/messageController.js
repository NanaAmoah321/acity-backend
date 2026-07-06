const pool = require("../config/db");
const { createNotification } = require("../utils/notifications");
const { sendEmail } = require("../utils/email");
const supabase = require("../config/supabase");

const {
    messageTemplate
} = require("../utils/emailTemplates");

exports.sendMessage = async (req, res) => {

    

    const { receiver_id, message } = req.body;

    let file_url = null;
    let file_name = null;
    let file_type = null;

    if(req.file){

    const fileName =
    `${Date.now()}-${req.file.originalname}`;

    const { error } =
    await supabase.storage
    .from("message-files")
    .upload(

        fileName,

        req.file.buffer,

        {

            contentType:
            req.file.mimetype

        }

    );

    if(error){

        return res.status(500).json({

            error:error.message

        });

    }

    const { data } =
    supabase.storage
    .from("message-files")
    .getPublicUrl(fileName);

    file_url =
    data.publicUrl;

    file_name =
    req.file.originalname;

    file_type =
    req.file.mimetype;

}

    try {

        const result = await pool.query(
            `
            INSERT INTO messages
            (
                sender_id,
                receiver_id,
                message,
                file_url,
                file_name,
                file_type
            )
            VALUES
            ($1,$2,$3,$4,$5,$6)
            RETURNING *
            `,
            [
                req.user.id,
                
                receiver_id,
                message,
                file_url,
                file_name,
                file_type
            ]
        );

        const sender = await pool.query(
            "SELECT name FROM users WHERE id = $1",
            [req.user.id]
            
        );

        const receiver = await pool.query(
        `
        SELECT
            name,
            email
        FROM users
        WHERE id = $1
        `,
        [receiver_id]
        );

        console.log(sender.rows);
        console.log(
            `${sender.rows[0].name}: "${message.substring(0,50)}${message.length > 50 ? "..." : ""}"`
        );

        console.log("Sender ID:", req.user.id);
        console.log("Related ID being saved:", req.user.id);

        await createNotification(
            receiver_id,
            "New Message",
            `${sender.rows[0].name}: "${message.substring(0,50)}${message.length > 50 ? "..." : ""}"`,
            "message",
            null,
            null,
            req.user.id
        );

        await sendEmail(

            receiver.rows[0].email,

            `💬 New message from ${sender.rows[0].name}`,

            messageTemplate(

                receiver.rows[0].name,

                sender.rows[0].name,

                message

            )

        );

        const io = req.app.get("io");

const socketMessage = {

    ...result.rows[0],

    sender_name: sender.rows[0].name

};

// Receiver gets it
io.to(`user_${receiver_id}`).emit(
    "new_message",
    socketMessage
);

// Sender also gets it
io.to(`user_${req.user.id}`).emit(
    "new_message",
    socketMessage
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

    sender.name AS sender_name,

    receiver.name AS receiver_name

FROM messages

JOIN users sender
ON sender.id = messages.sender_id

JOIN users receiver
ON receiver.id = messages.receiver_id

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