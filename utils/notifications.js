const pool = require("../config/db");

async function createNotification(
    user_id,
    title,
    message,
    type,
    related_id = null,
    action_url = null,
    conversation_user_id = null
) {

    await pool.query(
        `
        INSERT INTO notifications
        (
            user_id,
            title,
            message,
            type,
            related_id,
            action_url,
            conversation_user_id
        )

        VALUES($1,$2,$3,$4,$5,$6,$7)
        `,
        [
            user_id,
            title,
            message,
            type,
            related_id,
            action_url,
            conversation_user_id
        ]
    );

}

module.exports = {
    createNotification
};