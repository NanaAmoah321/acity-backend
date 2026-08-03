const { z } = require("zod");

const messageSchema = z.object({

    receiver_id: z.coerce
        .number()
        .int()
        .positive(),

    message: z.string()
        .trim()
        .min(1, "Message cannot be empty.")
        .max(5000, "Message is too long.")

});

module.exports = {
    messageSchema
};