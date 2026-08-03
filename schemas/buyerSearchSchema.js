const { z } = require("zod");

const buyerSearchSchema = z.object({
    query: z
        .string({
            required_error: "Search query is required.",
            invalid_type_error: "Search query must be a string."
        })
        .trim()
        .min(2, "Search query must contain at least 2 characters.")
        .max(150, "Search query cannot exceed 150 characters.")
});

module.exports = {
    buyerSearchSchema
};