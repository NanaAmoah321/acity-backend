const pool = require("../config/db");

const SORT_COLUMNS = {
    relevance: "relevance",
    price: "price",
    created_at: "created_at"
};

const SORT_DIRECTIONS = {
    asc: "ASC",
    desc: "DESC"
};

async function searchListings(intent) {

    const {
        keywords,
        sortBy,
        sortDirection,
        minPrice,
        maxPrice
    } = intent;

    const cleanedKeywords = keywords
        .map(word => String(word).trim())
        .filter(Boolean);

    if (cleanedKeywords.length === 0) {
        return [];
    }

    const keywordQuery = cleanedKeywords.join(" ");

    const values = [keywordQuery];

    let where = `
        status = 'available'
        AND flagged = FALSE
        AND (
            search_vector @@ plainto_tsquery('simple', $1)
            OR title ILIKE '%' || $1 || '%'
            OR description ILIKE '%' || $1 || '%'
            OR category ILIKE '%' || $1 || '%'
        )
    `;

    if (minPrice !== null) {
        values.push(minPrice);
        where += ` AND price >= $${values.length}`;
    }

    if (maxPrice !== null) {
        values.push(maxPrice);
        where += ` AND price <= $${values.length}`;
    }

    const orderColumn =
        SORT_COLUMNS[sortBy] || "relevance";

    const orderDirection =
        SORT_DIRECTIONS[sortDirection] || "DESC";

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

            ts_rank(
                search_vector,
                plainto_tsquery('simple', $1)
            ) AS relevance

        FROM listings

        WHERE
            ${where}

        ORDER BY

            CASE
                WHEN stock_quantity > 0 THEN 0
                ELSE 1
            END,

            ${orderColumn} ${orderDirection},

            relevance DESC,

            created_at DESC

        LIMIT 30;
    `;

    const { rows } =
        await pool.query(sql, values);

    return rows;

}

module.exports = {
    searchListings
};