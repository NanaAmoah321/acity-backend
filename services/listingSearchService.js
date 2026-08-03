const pool = require("../config/db");

/**
 * Search marketplace listings using PostgreSQL Full-Text Search.
 * Returns real candidate listings for Gemini to rank.
 */
async function searchListings(query) {
    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
        return [];
    }

    const sql = `
        SELECT
            id,
            user_id,
            title,
            description,
            category,
            price,
            image_url,
            created_at,
            ts_rank(
                search_vector,
                plainto_tsquery('simple', $1)
            ) AS relevance
        FROM listings
        WHERE
            status = 'available'
            AND flagged = FALSE
            AND stock_quantity > 0
            AND search_vector @@ plainto_tsquery('simple', $1)
        ORDER BY
            relevance DESC,
            created_at DESC
        LIMIT 30;
    `;

    const { rows } = await pool.query(sql, [cleanedQuery]);

    return rows;
}

module.exports = {
    searchListings
};