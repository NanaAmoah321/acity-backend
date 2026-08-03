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
        sortBy = "relevance",
        sortDirection = "desc",
        minPrice = null,
        maxPrice = null
    } = intent;

    const cleanedKeywords = (keywords || [])
        .map(keyword => String(keyword).trim())
        .filter(Boolean);

    if (cleanedKeywords.length === 0) {
        return [];
    }

    // Used for ts_rank()
    const searchText = cleanedKeywords.join(" ");

    // Parameter array
    const values = [searchText];

    // WHERE clauses
    const where = [
        "status = 'available'",
        "flagged = FALSE"
    ];

    // Keyword matching
    const keywordClauses = [];

    for (const keyword of cleanedKeywords) {

        values.push(keyword);

        const index = values.length;

        keywordClauses.push(`
        (
            search_vector @@ plainto_tsquery('simple', $${index})
            OR title ILIKE '%' || $${index} || '%'
            OR description ILIKE '%' || $${index} || '%'
            OR category ILIKE '%' || $${index} || '%'
        )
        `);

    }

    where.push(`(${keywordClauses.join(" AND ")})`);

    // Price filters

    if (minPrice !== null) {

        values.push(minPrice);

        where.push(`price >= $${values.length}`);

    }

    if (maxPrice !== null) {

        values.push(maxPrice);

        where.push(`price <= $${values.length}`);

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

        ${where.join("\nAND\n")}

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

    const { rows } = await pool.query(sql, values);

    return rows;

}

module.exports = {
    searchListings
};