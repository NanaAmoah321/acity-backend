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

        

        relevance DESC,

        created_at DESC

    LIMIT 30;
`;