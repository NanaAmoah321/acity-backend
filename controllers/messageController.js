const pool = require("../config/db");
const { createNotification } = require("../utils/notifications");
const { sendEmail } = require("../utils/email");
const supabase = require("../config/supabase");
const { validateMessage } = require("../utils/validators");
const { messageTemplate } = require("../utils/emailTemplates");
const { messageSchema } =
require("../schemas/messageSchema");

const {
    analyzeMessage
} = require("../ai/messageAgent");

exports.sendMessage = async (req, res) => {
    const {
        receiver_id,
        message
    } = messageSchema.parse(req.body);

    const validationError = validateMessage({ message });
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    let aiResult = {

        translatedMessage: message,

        detectedLanguage: "English",

        isSpam: false,

        spamReason: "",

        isScam: false,

        scamReason: "",

        isToxic: false,

        toxicityReason: "",

        suggestedReplies: []

    };

    try {

        aiResult =
            await analyzeMessage(message);

    } catch (error) {

        console.error(
            "Message AI failed:",
            error.message
        );

    }

    if (
        aiResult.isSpam ||
        aiResult.isScam ||
        aiResult.isToxic
    ) {

        return res.status(400).json({

            success: false,

            error: "Message blocked by Acity AI.",

            moderation: {

                spam: aiResult.isSpam,

                scam: aiResult.isScam,

                toxic: aiResult.isToxic,

                spamReason: aiResult.spamReason,

                scamReason: aiResult.scamReason,

                toxicityReason: aiResult.toxicityReason

            }

        });

    }

    let file_url = null;
    let file_name = null;
    let file_type = null;

    if (req.file) {
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const { error } = await supabase.storage
            .from("message-files")
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype
            });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const { data } = supabase.storage
            .from("message-files")
            .getPublicUrl(fileName);

        file_url = data.publicUrl;
        file_name = req.file.originalname;
        file_type = req.file.mimetype;
    }

    try {
        // 1. Insert message into database
        const result = await pool.query(
        `
        INSERT INTO messages
        (
            sender_id,
            receiver_id,
            message,
            original_message,
            translated_message,
            detected_language,
            file_url,
            file_name,
            file_type
        )
        VALUES
        (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9
        )
        RETURNING *;
        `,
        [
            req.user.id,

            receiver_id,

            aiResult.translatedMessage,

            message,

            aiResult.translatedMessage,

            aiResult.detectedLanguage,

            file_url,

            file_name,

            file_type
        ]
        );

        // 2. Fetch sender & receiver info
        const sender = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
        const receiver = await pool.query("SELECT name, email FROM users WHERE id = $1", [receiver_id]);

        const senderName = sender.rows[0]?.name || "Someone";
        const receiverEmail = receiver.rows[0]?.email;
        const receiverName = receiver.rows[0]?.name || "User";

        // 3. Handle Socket.io real-time broadcast
        const io = req.app.get("io");
        const onlineUsers = req.app.get("onlineUsers");

        const socketMessage = {

            ...result.rows[0],

            sender_name: senderName,

            ai: {

                detectedLanguage:
                    aiResult.detectedLanguage,

                suggestedReplies:
                    aiResult.suggestedReplies

            }

        };

        if (io) {
            io.to(`user_${receiver_id}`).emit("new_message", socketMessage);
            io.to(`user_${req.user.id}`).emit("new_message", socketMessage);
        }

        // 4. Return success response to user IMMEDIATELY
        res.json({

            ...result.rows[0],

            ai: {

                detectedLanguage:
                    aiResult.detectedLanguage,

                suggestedReplies:
                    aiResult.suggestedReplies

            }

        });

        // 5. Background tasks (wrapped in safe try/catch so failure won't crash Express response)
        try {
            await createNotification(
                receiver_id,
                "New Message",
                `${senderName}: "${aiResult.translatedMessage.substring(0, 50)}${aiResult.translatedMessage.length > 50 ? "..." : ""}"`,
                "message",
                null,
                null,
                req.user.id
            );

            // Send email only if receiver is offline AND has a valid email address
            const isReceiverOnline = onlineUsers && onlineUsers.has(Number(receiver_id));
            if (!isReceiverOnline && receiverEmail) {
                await sendEmail({
                    from: process.env.EMAIL_FROM,
                    to: receiverEmail,
                    subject: `💬 New message from ${senderName}`,
                    html: messageTemplate(
                        receiverName,
                        senderName,
                        aiResult.translatedMessage
                    )
                });
            }
        } catch (backgroundErr) {
            console.error("Background task error (Notification/Email):", backgroundErr.message);
        }

    } catch (err) {
        console.error("Error in sendMessage controller:", err);
        if (!res.headersSent) {
            return res.status(500).json({ error: err.message });
        }
    }
};

exports.getInbox = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                messages.id,
                messages.sender_id,
                messages.receiver_id,

                COALESCE(
                    messages.translated_message,
                    messages.message
                ) AS message,

                messages.original_message,
                messages.translated_message,
                messages.detected_language,

                messages.file_url,
                messages.file_name,
                messages.file_type,

                messages.is_read,
                messages.created_at,
                users.name AS sender_name
            FROM messages
            JOIN users ON messages.sender_id = users.id
            WHERE receiver_id = $1
            ORDER BY created_at DESC
            `,
            [req.user.id]
        );

        return res.json(result.rows);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT DISTINCT ON (
                CASE
                    WHEN sender_id = $1 THEN receiver_id
                    ELSE sender_id
                END
            )
                messages.*,

                CASE
                    WHEN sender_id = $1 THEN receiver.name
                    ELSE sender.name
                END AS conversation_name,

                CASE
                    WHEN sender_id = $1 THEN receiver.id
                    ELSE sender.id
                END AS conversation_user_id,

                CASE
                    WHEN sender_id = $1 THEN receiver.profile_picture
                    ELSE sender.profile_picture
                END AS other_user_profile_picture

            FROM messages

            JOIN users sender
                ON sender.id = messages.sender_id

            JOIN users receiver
                ON receiver.id = messages.receiver_id

            WHERE sender_id = $1
               OR receiver_id = $1

            ORDER BY
                CASE
                    WHEN sender_id = $1 THEN receiver_id
                    ELSE sender_id
                END,
                created_at DESC
            `,
            [req.user.id]
        );

        return res.json(result.rows);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getConversation = async (req, res) => {
    const activeUserId = req.user.id;
    const otherUserId = req.params.userId;

    try {
        // 1. Fetch conversation history
        const result = await pool.query(
            `
            SELECT

                messages.id,
                messages.sender_id,
                messages.receiver_id,

                CASE

                    WHEN messages.sender_id = $1
                        THEN COALESCE(
                            messages.original_message,
                            messages.message
                        )

                    ELSE COALESCE(
                        messages.translated_message,
                        messages.message
                    )

                END AS message,

                messages.original_message,
                messages.translated_message,
                messages.detected_language,

                messages.file_url,
                messages.file_name,
                messages.file_type,

                messages.is_read,
                messages.created_at,

                sender.name AS sender_name,
                receiver.name AS receiver_name,

                CASE
                    WHEN messages.sender_id = $1
                        THEN receiver.profile_picture
                    ELSE sender.profile_picture
                END AS other_user_profile_picture

            FROM messages
            JOIN users sender
                ON sender.id = messages.sender_id
            JOIN users receiver
                ON receiver.id = messages.receiver_id

            WHERE (sender_id = $1 AND receiver_id = $2)
            OR (sender_id = $2 AND receiver_id = $1)

            ORDER BY created_at ASC
            `,
            [activeUserId, otherUserId]
        );

        // 2. Mark incoming messages as read in the background
        pool.query(
            `
            UPDATE messages
            SET is_read = TRUE
            WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE
            `,
            [otherUserId, activeUserId]
        ).catch(err => console.error("Error marking messages as read:", err));

        return res.json(result.rows);

    } catch (err) {
        console.error("getConversation Error:", err);
        return res.status(500).json({ error: "Failed to retrieve conversation" });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT COUNT(*) AS count
            FROM messages
            WHERE receiver_id = $1 AND is_read = FALSE
            `,
            [req.user.id]
        );

        return res.json(result.rows[0]);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};