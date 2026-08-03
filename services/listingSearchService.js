const pool = require("../config/db");

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
            stock_quantity,
            created_at,
            GREATEST(
                ts_rank(
                    search_vector,
                    plainto_tsquery('simple', $1)
                ),
                0
            ) AS relevance
        FROM listings
        WHERE
            status = 'available'
            AND flagged = FALSE
            AND (
                search_vector @@ plainto_tsquery('simple', $1)
                OR title ILIKE '%' || $1 || '%'
                OR description ILIKE '%' || $1 || '%'
                OR category ILIKE '%' || $1 || '%'
            )
        ORDER BY
            CASE
                WHEN stock_quantity > 0 THEN 0
                ELSE 1
            END,
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