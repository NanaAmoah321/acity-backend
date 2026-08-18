const pool = require("../config/db");

const ALLOWED_RANGES = new Set([
    "7",
    "30",
    "90",
    "365"
]);

const getRange = value =>
    ALLOWED_RANGES.has(String(value))
        ? Number(value)
        : 30;

const COMPLETED_STATUSES = [
    "accepted",
    "completed"
];

exports.getAnalytics = async (req, res) => {
    const client = await pool.connect();

    try {
        const userId = req.user.id;
        const range = getRange(req.query.range);

        const sellerMetrics = await client.query(
            `
            SELECT
                COUNT(DISTINCT orders.id)::int AS orders,
                COALESCE(
                    SUM(listings.price * orders.quantity)
                    FILTER (
                        WHERE orders.status = ANY($2::text[])
                    ),
                    0
                )::numeric(12,2) AS revenue,
                COALESCE(
                    AVG(listings.price * orders.quantity)
                    FILTER (
                        WHERE orders.status = ANY($2::text[])
                    ),
                    0
                )::numeric(12,2) AS average_order_value
            FROM orders
            JOIN listings
                ON listings.id = orders.listing_id
            WHERE orders.seller_id = $1
            AND orders.created_at >= CURRENT_DATE - ($3::int - 1)
            `,
            [
                userId,
                COMPLETED_STATUSES,
                range
            ]
        );

        const buyerMetrics = await client.query(
            `
            SELECT
                COUNT(DISTINCT orders.id)::int AS orders,
                COALESCE(
                    SUM(listings.price * orders.quantity)
                    FILTER (
                        WHERE orders.status = ANY($2::text[])
                    ),
                    0
                )::numeric(12,2) AS spending,
                COALESCE(
                    AVG(listings.price * orders.quantity)
                    FILTER (
                        WHERE orders.status = ANY($2::text[])
                    ),
                    0
                )::numeric(12,2) AS average_purchase
            FROM orders
            JOIN listings
                ON listings.id = orders.listing_id
            WHERE orders.buyer_id = $1
            AND orders.created_at >= CURRENT_DATE - ($3::int - 1)
            `,
            [
                userId,
                COMPLETED_STATUSES,
                range
            ]
        );

        const activeListings = await client.query(
            `
            SELECT COUNT(*)::int AS count
            FROM listings
            WHERE user_id = $1
            AND status NOT IN ('archived', 'sold')
            `,
            [userId]
        );

        const rating = await client.query(
            `
            SELECT
                COALESCE(ROUND(AVG(rating), 1), 0)::numeric AS rating
            FROM reviews
            WHERE reviewed_user_id = $1
            `,
            [userId]
        );

        const followers = await client.query(
            `
            SELECT COUNT(*)::int AS count
            FROM store_followers
            WHERE following_user_id = $1
            `,
            [userId]
        );

        const budget = await client.query(
            `
            SELECT COALESCE(monthly_budget, 0)::numeric AS monthly_budget
            FROM users
            WHERE id = $1
            `,
            [userId]
        );

        const sellerRevenueTrend = await client.query(
            `
            WITH days AS (
                SELECT generate_series(
                    CURRENT_DATE - ($2::int - 1),
                    CURRENT_DATE,
                    INTERVAL '1 day'
                )::date AS day
            )
            SELECT
                TO_CHAR(days.day, 'Mon DD') AS label,
                COALESCE(
                    SUM(listings.price * orders.quantity),
                    0
                )::numeric(12,2) AS value
            FROM days
            LEFT JOIN orders
                ON DATE(orders.created_at) = days.day
                AND orders.seller_id = $1
                AND orders.status = ANY($3::text[])
            LEFT JOIN listings
                ON listings.id = orders.listing_id
            GROUP BY days.day
            ORDER BY days.day
            `,
            [
                userId,
                range,
                COMPLETED_STATUSES
            ]
        );

        const buyerSpendingTrend = await client.query(
            `
            WITH days AS (
                SELECT generate_series(
                    CURRENT_DATE - ($2::int - 1),
                    CURRENT_DATE,
                    INTERVAL '1 day'
                )::date AS day
            )
            SELECT
                TO_CHAR(days.day, 'Mon DD') AS label,
                COALESCE(
                    SUM(listings.price * orders.quantity),
                    0
                )::numeric(12,2) AS value
            FROM days
            LEFT JOIN orders
                ON DATE(orders.created_at) = days.day
                AND orders.buyer_id = $1
                AND orders.status = ANY($3::text[])
            LEFT JOIN listings
                ON listings.id = orders.listing_id
            GROUP BY days.day
            ORDER BY days.day
            `,
            [
                userId,
                range,
                COMPLETED_STATUSES
            ]
        );

        const sellerOrdersTrend = await client.query(
            `
            SELECT
                TO_CHAR(DATE(orders.created_at), 'Mon DD') AS label,
                COUNT(*)::int AS value
            FROM orders
            WHERE seller_id = $1
            AND orders.created_at >= CURRENT_DATE - ($2::int - 1)
            GROUP BY DATE(orders.created_at)
            ORDER BY DATE(orders.created_at)
            `,
            [userId, range]
        );

        const listingPerformance = await client.query(
            `
            SELECT
                listings.title,
                COUNT(orders.id)::int AS orders,
                COALESCE(
                    SUM(listings.price * orders.quantity),
                    0
                )::numeric(12,2) AS revenue
            FROM listings
            LEFT JOIN orders
                ON orders.listing_id = listings.id
                AND orders.status = ANY($2::text[])
            WHERE listings.user_id = $1
            GROUP BY listings.id, listings.title
            ORDER BY orders DESC, revenue DESC
            LIMIT 8
            `,
            [
                userId,
                COMPLETED_STATUSES
            ]
        );

        const sellerCategories = await client.query(
            `
            SELECT
                COALESCE(listings.category, 'Other') AS category,
                COALESCE(
                    SUM(listings.price * orders.quantity),
                    0
                )::numeric(12,2) AS revenue
            FROM orders
            JOIN listings
                ON listings.id = orders.listing_id
            WHERE orders.seller_id = $1
            AND orders.status = ANY($2::text[])
            GROUP BY listings.category
            ORDER BY revenue DESC
            `,
            [userId, COMPLETED_STATUSES]
        );

        const buyerCategories = await client.query(
            `
            SELECT
                COALESCE(listings.category, 'Other') AS category,
                COALESCE(
                    SUM(listings.price * orders.quantity),
                    0
                )::numeric(12,2) AS spending
            FROM orders
            JOIN listings
                ON listings.id = orders.listing_id
            WHERE orders.buyer_id = $1
            AND orders.status = ANY($2::text[])
            GROUP BY listings.category
            ORDER BY spending DESC
            `,
            [userId, COMPLETED_STATUSES]
        );

        const recentPurchases = await client.query(
            `
            SELECT
                listings.title,
                listings.category,
                listings.price,
                orders.quantity,
                orders.created_at,
                (
                    listings.price * orders.quantity
                )::numeric(12,2) AS total
            FROM orders
            JOIN listings
                ON listings.id = orders.listing_id
            WHERE orders.buyer_id = $1
            ORDER BY orders.created_at DESC
            LIMIT 8
            `,
            [userId]
        );

        return res.json({
            seller: {
                metrics: {
                    revenue: Number(
                        sellerMetrics.rows[0].revenue || 0
                    ),
                    orders: Number(
                        sellerMetrics.rows[0].orders || 0
                    ),
                    averageOrderValue: Number(
                        sellerMetrics.rows[0]
                            .average_order_value || 0
                    ),
                    activeListings:
                        activeListings.rows[0].count,
                    rating: Number(
                        rating.rows[0].rating || 0
                    ),
                    followers:
                        followers.rows[0].count
                },
                revenueTrend: {
                    labels: sellerRevenueTrend.rows
                        .map(row => row.label),
                    values: sellerRevenueTrend.rows
                        .map(row => Number(row.value))
                },
                ordersTrend: {
                    labels: sellerOrdersTrend.rows
                        .map(row => row.label),
                    values: sellerOrdersTrend.rows
                        .map(row => Number(row.value))
                },
                listingPerformance:
                    listingPerformance.rows.map(row => ({
                        title: row.title,
                        orders: Number(row.orders),
                        revenue: Number(row.revenue)
                    })),
                categories:
                    sellerCategories.rows.map(row => ({
                        category: row.category,
                        value: Number(row.revenue)
                    }))
            },

            buyer: {
                metrics: {
                    spending: Number(
                        buyerMetrics.rows[0].spending || 0
                    ),
                    orders: Number(
                        buyerMetrics.rows[0].orders || 0
                    ),
                    averagePurchase: Number(
                        buyerMetrics.rows[0]
                            .average_purchase || 0
                    )
                },
                monthlyBudget: Number(
                    budget.rows[0]?.monthly_budget || 0
                ),
                spendingTrend: {
                    labels: buyerSpendingTrend.rows
                        .map(row => row.label),
                    values: buyerSpendingTrend.rows
                        .map(row => Number(row.value))
                },
                categories:
                    buyerCategories.rows.map(row => ({
                        category: row.category,
                        value: Number(row.spending)
                    })),
                recentPurchases:
                    recentPurchases.rows.map(row => ({
                        title: row.title,
                        category: row.category,
                        price: Number(row.price),
                        quantity: Number(row.quantity),
                        total: Number(row.total),
                        createdAt: row.created_at
                    }))
            },

            range
        });

    } catch (error) {
        console.error("ANALYTICS ERROR:", error);

        return res.status(500).json({
            error: "Unable to load analytics."
        });

    } finally {
        client.release();
    }
};

exports.updateBudget = async (req, res) => {
    const budget = Number(req.body.monthly_budget);

    if (!Number.isFinite(budget) || budget < 0) {
        return res.status(400).json({
            error: "Please enter a valid budget."
        });
    }

    try {
        const result = await pool.query(
            `
            UPDATE users
            SET monthly_budget = $1
            WHERE id = $2
            RETURNING monthly_budget
            `,
            [
                budget.toFixed(2),
                req.user.id
            ]
        );

        return res.json({
            monthly_budget: Number(
                result.rows[0].monthly_budget
            )
        });

    } catch (error) {
        console.error("BUDGET UPDATE ERROR:", error);

        return res.status(500).json({
            error: "Unable to update budget."
        });
    }
};