const pool = require("../config/db");
const { createNotification } = require("../utils/notifications");
/*const { sendEmail } = require("../utils/email");*/
const supabase = require("../config/supabase");
const { validateListing, validateOrder } = require("../utils/validators");
const {
    buyerOrderTemplate,
    sellerOrderTemplate,
    /*newListingTemplate*/
} = require("../utils/emailTemplates");

const ORDER_STATUS = {
    PLACED: "placed",
    PREPARING: "preparing",
    PACKAGED: "packaged",
    READY: "ready",
    OUT_FOR_DELIVERY: "out_for_delivery",
    COMPLETED: "completed",
    CANCELLED: "cancelled"
};

const STATUS_ALIASES = {
    pending: "placed",
    accepted: "preparing",
    rejected: "cancelled"
};

const VALID_ORDER_STATUSES = new Set([
    "placed",
    "preparing",
    "packaged",
    "ready",
    "out_for_delivery",
    "completed",
    "cancelled",
    "pending",
    "accepted",
    "rejected"
]);

const STATUS_TRANSITIONS = {
    placed: ["preparing", "cancelled"],
    preparing: ["packaged", "cancelled"],
    packaged: ["ready", "cancelled"],
    ready: ["out_for_delivery", "completed"],
    out_for_delivery: ["completed"],
    completed: [],
    cancelled: [],

    // Compatibility with existing records
    pending: ["accepted", "cancelled"],
    accepted: ["completed", "cancelled"],
    rejected: []
};

function normalizeOrderStatus(status) {
    const aliases = {
        pending: "placed",
        accepted: "preparing",
        rejected: "cancelled"
    };

    return aliases[
        String(status || "").toLowerCase()
    ] || String(status || "").toLowerCase();
}

function canUpdateOrderStatus(
    currentStatus,
    requestedStatus
) {
    const current =
        normalizeOrderStatus(
            String(currentStatus || "")
                .toLowerCase()
        );

    const requested =
        normalizeOrderStatus(
            String(requestedStatus || "")
                .toLowerCase()
        );

    const allowedStatuses =
        STATUS_TRANSITIONS[current] || [];

    return allowedStatuses.includes(requested);
}

async function addOrderStatusHistory(
    orderId,
    status,
    changedBy,
    note = null
) {
    await pool.query(
        `
        INSERT INTO order_status_history
        (
            order_id,
            status,
            changed_by,
            note
        )
        VALUES ($1, $2, $3, $4)
        `,
        [
            orderId,
            status,
            changedBy,
            note
        ]
    );
}

exports.createListing = async (req, res) => {
    const {
        title,
        description,
        category,
        food_subcategory,
        price,
        stock_quantity,
        prep_time_minutes,
        spice_level,
        serving_temperature,
        portion_size,
        ingredients,
        allergens,
        is_preorder
    } = req.body;

    let foodOptions = [];

    try {
        foodOptions = JSON.parse(
            req.body.food_options || "[]"
        );

        if (!Array.isArray(foodOptions)) {
            foodOptions = [];
        }
    } catch {
        foodOptions = [];
    }

    const validationError = validateListing({
        title,
        description,
        category,
        price,
        stock_quantity
    });

    if (validationError) {
        return res.status(400).json({
            error: validationError
        });
    }

    const user_id = req.user.id;
    let image_url = null;

    try {
        if (req.file) {
            const fileName =
                `${Date.now()}-${req.file.originalname}`;

            const { error } =
                await supabase.storage
                    .from("listing-images")
                    .upload(
                        fileName,
                        req.file.buffer,
                        {
                            contentType:
                                req.file.mimetype
                        }
                    );

            if (error) {
                return res.status(500).json({
                    error: error.message
                });
            }

            const { data } =
                supabase.storage
                    .from("listing-images")
                    .getPublicUrl(fileName);

            image_url =
                data.publicUrl;
        }

        const result =
            await pool.query(
                `
                INSERT INTO listings (
                    user_id,
                    title,
                    description,
                    category,
                    food_subcategory,
                    food_options,
                    price,
                    stock_quantity,
                    image_url,
                    status,
                    prep_time_minutes,
                    spice_level,
                    serving_temperature,
                    portion_size,
                    ingredients,
                    allergens,
                    is_preorder
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9, $10, $11, $12,
                    $13, $14, $15, $16, $17
                )
                RETURNING *
                `,
                [
                    user_id,
                    title.trim(),
                    description.trim(),
                    category,
                    food_subcategory || null,
                    JSON.stringify(foodOptions),
                    Number(price),
                    Number(stock_quantity),
                    image_url,
                    Number(stock_quantity) > 0
                        ? "available"
                        : "sold",
                    prep_time_minutes
                        ? Number(prep_time_minutes)
                        : null,
                    spice_level || null,
                    serving_temperature || null,
                    portion_size || null,
                    ingredients || null,
                    allergens || null,
                    is_preorder === true ||
                    is_preorder === "true"
                ]
            );

        await pool.query(
            `
            UPDATE users
            SET store_category = $1
            WHERE id = $2
            `,
            [
                category,
                user_id
            ]
        );

        return res.status(201).json(
            result.rows[0]
        );
    } catch (error) {
        console.error(
            "CREATE LISTING ERROR:",
            error
        );

        return res.status(500).json({
            error: error.message
        });
    }
};

exports.getListings = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                listings.*,
                users.name AS seller_name,
                stores.store_name AS store_name,
                ROUND(AVG(reviews.rating), 1) AS average_rating,
                COUNT(reviews.id) AS total_reviews
            FROM listings
            JOIN users
                ON listings.user_id = users.id
            LEFT JOIN stores
                ON stores.user_id = listings.user_id
            LEFT JOIN reviews
                ON reviews.reviewed_user_id = users.id
            WHERE listings.status <> 'archived'
            GROUP BY
                listings.id,
                users.name,
                stores.store_name
            ORDER BY listings.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.searchListings = async (req, res) => {
    const { q } = req.query;
    try {
        const result = await pool.query(
            `
            SELECT listings.*, users.name AS seller_name
            FROM listings
            JOIN users ON listings.user_id = users.id
            WHERE listings.title ILIKE $1
               OR listings.description ILIKE $1
               OR listings.category ILIKE $1
               OR users.name ILIKE $1
            ORDER BY listings.created_at DESC
            `,
            [`%${q}%`]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUserListings = async (req, res) => {
    const user_id = req.user.id;
    try {
        const result = await pool.query(
            "SELECT * FROM listings WHERE user_id = $1 AND status <> 'archived' ORDER BY created_at DESC",
            [user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateListing = async (req, res) => {
    const {
        id
    } = req.params;

    const user_id =
        req.user.id;

    try {
        const existing =
            await pool.query(
                `
                SELECT *
                FROM listings
                WHERE id = $1
                AND user_id = $2
                `,
                [
                    id,
                    user_id
                ]
            );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                error: "Listing not found."
            });
        }

        const current =
            existing.rows[0];

        const title =
            req.body.title ??
            current.title;

        const description =
            req.body.description ??
            current.description;

        const category =
            req.body.category ??
            current.category;

        const price =
            req.body.price ??
            current.price;

        const stock_quantity =
            req.body.stock_quantity ??
            current.stock_quantity;

        const image_url =
            req.body.image_url ??
            current.image_url;

        const quantity =
            Number(stock_quantity);

        if (
            !Number.isFinite(Number(price)) ||
            Number(price) < 0
        ) {
            return res.status(400).json({
                error: "Invalid price."
            });
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {
            return res.status(400).json({
                error: "Quantity must be a whole number of zero or more."
            });
        }

        let status =
            req.body.status ??
            current.status;

        if (quantity === 0) {
            status = "sold";
        }

        if (
            quantity > 0 &&
            (
                status === "sold" ||
                status === "archived"
            ) &&
            req.body.status !== "archived"
        ) {
            status = "available";
        }

        const result =
            await pool.query(
                `
                UPDATE listings
                SET
                    title = $1::text,
                    description = $2::text,
                    category = $3::text,
                    food_subcategory = COALESCE($4::text, food_subcategory),
                    price = $5::numeric,
                    stock_quantity = $6::integer,
                    image_url = $7::text,
                    status = $8::text,
                    prep_time_minutes =
                        COALESCE($9::integer, prep_time_minutes),
                    spice_level =
                        COALESCE($10::text, spice_level),
                    serving_temperature =
                        COALESCE($11::text, serving_temperature),
                    portion_size =
                        COALESCE($12::text, portion_size),
                    ingredients =
                        COALESCE($13::text, ingredients),
                    allergens =
                        COALESCE($14::text, allergens),
                    is_preorder =
                        COALESCE($15::boolean, is_preorder),
                    sold_at = CASE
                        WHEN $8::text = 'sold'
                        THEN COALESCE(sold_at, NOW())
                        ELSE NULL
                    END
                WHERE id = $16::integer
                AND user_id = $17::integer
                RETURNING *
                `,
                [
                    title.trim(),
                    description.trim(),
                    category,
                    req.body.food_subcategory || null,
                    Number(price),
                    quantity,
                    image_url || null,
                    status,
                    req.body.prep_time_minutes
                        ? Number(req.body.prep_time_minutes)
                        : null,
                    req.body.spice_level || null,
                    req.body.serving_temperature || null,
                    req.body.portion_size || null,
                    req.body.ingredients || null,
                    req.body.allergens || null,
                    req.body.is_preorder === undefined
                        ? null
                        : (
                            req.body.is_preorder === true ||
                            req.body.is_preorder === "true"
                        ),
                    Number(id),
                    Number(user_id)
                ]
            );

        return res.json({
            message: "Listing updated successfully.",
            listing: result.rows[0]
        });
    } catch (error) {
        console.error(
            "UPDATE LISTING ERROR:",
            error
        );

        return res.status(500).json({
            error: error.message
        });
    }
};

exports.deleteListing = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    try {
        const orders = await pool.query("SELECT id FROM orders WHERE listing_id = $1", [id]);

        if (orders.rows.length > 0) {
            await pool.query(
                "UPDATE listings SET status = 'archived' WHERE id = $1 AND user_id = $2",
                [id, user_id]
            );
            return res.json({ message: "Listing archived because it has existing orders." });
        }

        const result = await pool.query(
            "DELETE FROM listings WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ message: "You are not authorized to modify this listing." });
        }

        res.json({ message: "Listing deleted." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addInterest = async (req, res) => {
    const user_id =
        req.user.id;

    const {
        listing_id,
        quantity = 1,
        selected_options = [],
        special_instructions = "",
        allergy_note = ""
    } = req.body;

    let options = [];

    try {
        options =
            Array.isArray(selected_options)
                ? selected_options
                : JSON.parse(
                    selected_options || "[]"
                );
    } catch {
        options = [];
    }

    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
        return res.status(400).json({
            error: "Quantity must be at least 1."
        });
    }

    try {
        const existing =
            await pool.query(
                `
                SELECT *
                FROM interests
                WHERE user_id = $1
                AND listing_id = $2
                `,
                [
                    user_id,
                    listing_id
                ]
            );

        if (existing.rows.length > 0) {
            await pool.query(
                `
                UPDATE interests
                SET
                    quantity = quantity + $1,
                    selected_options = $2::jsonb,
                    special_instructions = $3,
                    allergy_note = $4
                WHERE user_id = $5
                AND listing_id = $6
                `,
                [
                    Number(quantity),
                    JSON.stringify(options),
                    String(special_instructions || ""),
                    String(allergy_note || ""),
                    user_id,
                    listing_id
                ]
            );

            return res.json({
                message: "Cart item updated."
            });
        }

        await pool.query(
            `
            INSERT INTO interests (
                user_id,
                listing_id,
                quantity,
                selected_options,
                special_instructions,
                allergy_note
            )
            VALUES (
                $1,
                $2,
                $3,
                $4::jsonb,
                $5,
                $6
            )
            `,
            [
                user_id,
                listing_id,
                Number(quantity),
                JSON.stringify(options),
                String(special_instructions || ""),
                String(allergy_note || "")
            ]
        );

        return res.json({
            message: "Added to cart."
        });
    } catch (error) {
        console.error(
            "ADD TO CART ERROR:",
            error
        );

        return res.status(500).json({
            error: error.message
        });
    }
};

exports.getInterestedListings = async (req, res) => {
    const user_id = req.user.id;
    try {
        const result = await pool.query(
            `
            SELECT
                listings.*,
                users.id AS seller_id,
                users.name AS seller_name,
                interests.quantity,
                interests.selected_options,
                interests.special_instructions,
                interests.allergy_note,
                orders.status AS order_status
            FROM interests
            JOIN listings ON interests.listing_id = listings.id
            JOIN users ON users.id = listings.user_id
            LEFT JOIN orders ON orders.listing_id = listings.id AND orders.buyer_id = interests.user_id
            WHERE interests.user_id = $1
            ORDER BY interests.created_at DESC
            `,
            [user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateCartQuantity = async (req, res) => {
    const user_id = req.user.id;
    const { listing_id } = req.params;
    const { change } = req.body;

    try {
        const current = await pool.query(
            "SELECT quantity FROM interests WHERE user_id = $1 AND listing_id = $2",
            [user_id, listing_id]
        );

        if (current.rows.length === 0) {
            return res.status(404).json({ message: "Item not found in cart." });
        }

        const newQuantity = current.rows[0].quantity + change;

        if (newQuantity <= 0) {
            await pool.query(
                "DELETE FROM interests WHERE user_id = $1 AND listing_id = $2",
                [user_id, listing_id]
            );
            return res.json({ message: "Item removed from cart." });
        }

        await pool.query(
            "UPDATE interests SET quantity = $1 WHERE user_id = $2 AND listing_id = $3",
            [newQuantity, user_id, listing_id]
        );
        res.json({ message: "Quantity updated." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.removeFromCart = async (req, res) => {
    const user_id = req.user.id;
    const { listing_id } = req.params;
    try {
        const result = await pool.query(
            "DELETE FROM interests WHERE user_id = $1 AND listing_id = $2 RETURNING *",
            [user_id, listing_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Item not found in cart" });
        }
        res.json({ message: "Removed from cart" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.flagListing = async (req, res) => {
    const { id } = req.params;
    await pool.query("UPDATE listings SET flagged = true WHERE id = $1", [id]);
    res.json({ message: "Listing flagged" });
};

exports.adminDeleteListing = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM interests WHERE listing_id = $1", [id]);
        await pool.query("DELETE FROM listings WHERE id = $1", [id]);
        res.json({ message: "Listing deleted by admin" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.getListingById = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT listings.*, users.name AS seller_name
            FROM listings
            JOIN users ON users.id = listings.user_id
            WHERE listings.id = $1
            `,
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getStores = async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT

                stores.user_id,

                stores.store_name,

                stores.profile_image,

                stores.categories,

                stores.opening_time,

                stores.closing_time,

                COUNT(listings.id) AS total_products,

                ROUND(AVG(reviews.rating),1) AS average_rating,

                COUNT(DISTINCT reviews.id) AS total_reviews

            FROM stores

            LEFT JOIN listings
                ON listings.user_id = stores.user_id
                AND listings.status <> 'archived'

            LEFT JOIN reviews
                ON reviews.reviewed_user_id = stores.user_id

            GROUP BY

                stores.id,
                stores.user_id,
                stores.store_name,
                stores.profile_image,
                stores.categories,
                stores.opening_time,
                stores.closing_time

            ORDER BY stores.store_name ASC
            `
        );

        res.json(result.rows);

    } catch(err){

        console.error(err);

        res.status(500).json({
            error:err.message
        });

    }

};

exports.getStore = async (req, res) => {

    const { userId } = req.params;

    try {

        const store = await pool.query(
            `
            SELECT

                stores.user_id,

                stores.store_name,

                stores.description,

                stores.profile_image,

                stores.categories,

                stores.opening_time,

                stores.closing_time,

                stores.phone,

                stores.location,

                ROUND(AVG(reviews.rating),1) AS average_rating,

                COUNT(DISTINCT reviews.id) AS total_reviews

            FROM stores

            LEFT JOIN reviews
                ON reviews.reviewed_user_id = stores.user_id

            WHERE stores.user_id = $1

            GROUP BY

                stores.id,
                stores.user_id,
                stores.store_name,
                stores.description,
                stores.profile_image,
                stores.categories,
                stores.opening_time,
                stores.closing_time,
                stores.phone,
                stores.location
            `,
            [userId]
        );

        if(store.rows.length === 0){

            return res.status(404).json({
                error:"Store not found."
            });

        }

        const products = await pool.query(
            `
            SELECT *
            FROM listings
            WHERE user_id = $1
            AND status <> 'archived'
            ORDER BY created_at DESC
            `,
            [userId]
        );

        res.json({

            store: store.rows[0],

            products: products.rows

        });

    } catch(err){

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }

};

exports.createOrder = async (req, res) => {
    const buyer_id = req.user.id;

    const {
        listing_id,
        quantity,
        delivery_method,
        hostel,
        room_number,
        meeting_location,
        selected_options = [],
        special_instructions = "",
        allergy_note = "",
        payment_status = "unpaid"
    } = req.body;

    let parsedOptions = [];

    try {
        parsedOptions =
            Array.isArray(selected_options)
                ? selected_options
                : JSON.parse(
                    selected_options || "[]"
                );
    } catch {
        parsedOptions = [];
    }

    const validationError = validateOrder({
        quantity,
        delivery_method,
        room_number
    });

    if (validationError) {
        return res.status(400).json({
            error: validationError
        });
    }

    try {
        const listingResult = await pool.query(
            `
            SELECT
                id,
                user_id,
                stock_quantity,
                title,
                price
            FROM listings
            WHERE id = $1
            `,
            [listing_id]
        );

        if (listingResult.rows.length === 0) {
            return res.status(404).json({
                error: "Listing not found."
            });
        }

        const listing = listingResult.rows[0];
        const seller_id = listing.user_id;

        if (Number(seller_id) === Number(buyer_id)) {
            return res.status(400).json({
                error: "You cannot buy your own listing."
            });
        }

        const requestedQuantity = Number(quantity);

        if (
            !Number.isInteger(requestedQuantity) ||
            requestedQuantity < 1
        ) {
            return res.status(400).json({
                error: "Quantity must be at least 1."
            });
        }

        if (
            requestedQuantity >
            Number(listing.stock_quantity)
        ) {
            return res.status(400).json({
                error:
                    `Only ${listing.stock_quantity} item(s) left.`
            });
        }

        const stockUpdate = await pool.query(
            `
            UPDATE listings
            SET stock_quantity = stock_quantity - $1
            WHERE id = $2
            AND stock_quantity >= $1
            RETURNING id, stock_quantity
            `,
            [
                requestedQuantity,
                listing_id
            ]
        );

        if (stockUpdate.rows.length === 0) {
            return res.status(409).json({
                error:
                    "Insufficient stock due to a simultaneous purchase."
            });
        }

        const totalAmount =
            Number(listing.price) *
            requestedQuantity;

        const orderResult = await pool.query(
            `
            INSERT INTO orders
            (
                buyer_id,
                seller_id,
                listing_id,
                quantity,
                delivery_method,
                hostel,
                room_number,
                meeting_location,
                status,
                payment_status,
                selected_options,
                special_instructions,
                allergy_note,
                updated_at
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
                $9,
                $10,
                $11::jsonb,
                $12,
                $13,
                NOW()
            )
            `,
            [
                buyer_id,
                seller_id,
                listing_id,
                requestedQuantity,
                delivery_method,
                hostel || null,
                room_number || null,
                meeting_location || null,
                ORDER_STATUS.PLACED,
                payment_status || "unpaid",
                JSON.stringify(parsedOptions),
                String(special_instructions || ""),
                String(allergy_note || "")
            ]
        );

        const createdOrder = orderResult.rows[0];

        try {
            await addOrderStatusHistory(
                createdOrder.id,
                ORDER_STATUS.PLACED,
                buyer_id,
                "Order placed successfully."
            );
        } catch (historyError) {
            console.error(
                "Order history error:",
                historyError
            );
        }

        await Promise.allSettled([
            createNotification(
                seller_id,
                "New Order",
                `A buyer ordered "${listing.title}".`,
                "order",
                createdOrder.id,
                `incoming-orders.html?id=${createdOrder.id}`
            ),

            createNotification(
                buyer_id,
                "Order Placed",
                `Your order for "${listing.title}" was placed.`,
                "order",
                createdOrder.id,
                `orders.html?id=${createdOrder.id}`
            )
        ]);

        return res.status(201).json({
            message: "Order created",
            order: {
                ...createdOrder,
                total_amount: totalAmount
            }
        });

    } catch (err) {
        console.error("Create Order Error:", err);

        return res.status(500).json({
            error: "Could not create order."
        });
    }
};

exports.getSellerOrders = async (req, res) => {
    const seller_id = req.user.id;
    try {
        
        const orders = await pool.query(
            `
            SELECT
                orders.*,
                listings.title,
                listings.price,
                listings.image_url AS listing_image_url,
                listings.category,
                users.name AS buyer_name
            FROM orders
            JOIN listings
                ON listings.id = orders.listing_id
            JOIN users
                ON users.id = orders.buyer_id
            WHERE orders.seller_id = $1
            ORDER BY orders.created_at DESC
            `,
            [seller_id]
        );

        const revenue = orders.rows.reduce((total, order) => {
            if (order.status === "accepted" || order.status === "completed") {
                return total + (Number(order.price) * Number(order.quantity));
            }
            return total;
        }, 0);

        res.json({ orders: orders.rows, revenue });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const requestedStatus =
        String(req.body.status || "").toLowerCase();

    if (!VALID_ORDER_STATUSES.has(requestedStatus)) {
        return res.status(400).json({
            error: "Invalid order status."
        });
    }

    try {
        const orderResult = await pool.query(
            `
            SELECT
                orders.*,
                listings.title,
                listings.price,
                users.name AS buyer_name
            FROM orders
            JOIN listings
                ON listings.id = orders.listing_id
            JOIN users
                ON users.id = orders.buyer_id
            WHERE orders.id = $1
            `,
            [id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                error: "Order not found."
            });
        }

        const existingOrder = orderResult.rows[0];

        if (
            Number(existingOrder.seller_id) !==
            Number(req.user.id)
        ) {
            return res.status(403).json({
                error: "Unauthorized."
            });
        }

        if (
            !canUpdateOrderStatus(
                existingOrder.status,
                requestedStatus
            )
        ) {
            return res.status(400).json({
                error:
                    `Cannot change order from ` +
                    `"${existingOrder.status}" to ` +
                    `"${requestedStatus}".`
            });
        }

        const normalizedStatus =
            normalizeOrderStatus(requestedStatus);

        const updatedOrderResult = await pool.query(
            `
            UPDATE orders
            SET
                status = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
            `,
            [
                normalizedStatus,
                id
            ]
        );

        if (normalizedStatus === "completed") {
            await pool.query(
                `
                UPDATE orders
                SET completed_at = NOW()
                WHERE id = $1
                `,
                [id]
            );
        }

        if (normalizedStatus === "cancelled") {
            await pool.query(
                `
                UPDATE orders
                SET cancelled_at = NOW()
                WHERE id = $1
                `,
                [id]
            );
        }

        const updatedOrder =
            updatedOrderResult.rows[0];

        const statusNotes = {
            preparing: "Seller started preparing the order.",
            packaged: "Order has been packaged.",
            ready: "Order is ready for pickup or delivery.",
            out_for_delivery: "Order is out for delivery.",
            completed: "Order has been completed.",
            cancelled: "Order was cancelled."
        };

        await addOrderStatusHistory(
            updatedOrder.id,
            normalizedStatus,
            req.user.id,
            statusNotes[normalizedStatus] || null
        );

        const buyerMessages = {
            preparing:
                `Your order for "${existingOrder.title}" ` +
                `is being prepared.`,

            packaged:
                `Your order for "${existingOrder.title}" ` +
                `has been packaged.`,

            ready:
                `Your order for "${existingOrder.title}" ` +
                `is ready.`,

            out_for_delivery:
                `Your order for "${existingOrder.title}" ` +
                `is out for delivery.`,

            completed:
                `Your order for "${existingOrder.title}" ` +
                `has been completed.`,

            cancelled:
                `Your order for "${existingOrder.title}" ` +
                `was cancelled.`
        };

        if (buyerMessages[normalizedStatus]) {
            await createNotification(
                existingOrder.buyer_id,
                normalizedStatus === "cancelled"
                    ? "Order Cancelled"
                    : "Order Update",
                buyerMessages[normalizedStatus],
                normalizedStatus === "cancelled"
                    ? "rejected"
                    : "accepted",
                updatedOrder.id,
                `orders.html?id=${updatedOrder.id}`
            );
        }

        return res.json({
            message: "Order status updated.",
            order: updatedOrder
        });

    } catch (err) {
        console.error(
            "Update Order Status Error:",
            err
        );

        return res.status(500).json({
            error: err.message
        });
    }
};
exports.markListingSold = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    try {
        const result = await pool.query(
            "UPDATE listings SET status='sold', sold_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *",
            [id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Listing not found." });
        }

        res.json({ message: "Listing marked as sold.", listing: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.getBuyerOrders = async (req, res) => {
    const buyer_id = req.user.id;

    try {
        const result = await pool.query(
            `
            SELECT
                orders.*,
                listings.title,
                listings.image_url,
                listings.category,
                listings.price,
                stores.store_name,
                sellers.name AS seller_name
            FROM orders
            JOIN listings
                ON listings.id = orders.listing_id
            LEFT JOIN stores
                ON stores.user_id = orders.seller_id
            JOIN users sellers
                ON sellers.id = orders.seller_id
            WHERE orders.buyer_id = $1
            ORDER BY orders.created_at DESC
            `,
            [buyer_id]
        );

        return res.json({
            orders: result.rows
        });

    } catch (err) {
        console.error(
            "Get Buyer Orders Error:",
            err
        );

        return res.status(500).json({
            error: "Could not load buyer orders."
        });
    }
};

exports.getOrderDetails = async (req, res) => {
    const user_id = req.user.id;
    const { id } = req.params;

    try {
        const orderResult = await pool.query(
            `
            SELECT
                orders.*,
                listings.title,
                listings.image_url,
                listings.category,
                listings.price,
                buyer.name AS buyer_name,
                seller.name AS seller_name,
                stores.store_name
            FROM orders
            JOIN listings
                ON listings.id = orders.listing_id
            JOIN users buyer
                ON buyer.id = orders.buyer_id
            JOIN users seller
                ON seller.id = orders.seller_id
            LEFT JOIN stores
                ON stores.user_id = orders.seller_id
            WHERE orders.id = $1
            AND (
                orders.buyer_id = $2
                OR orders.seller_id = $2
            )
            `,
            [
                id,
                user_id
            ]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                error: "Order not found."
            });
        }

        const historyResult = await pool.query(
            `
            SELECT
                order_status_history.*,
                users.name AS changed_by_name
            FROM order_status_history
            LEFT JOIN users
                ON users.id =
                    order_status_history.changed_by
            WHERE order_id = $1
            ORDER BY created_at ASC
            `,
            [id]
        );

        return res.json({
            order: orderResult.rows[0],
            history: historyResult.rows
        });

    } catch (err) {
        console.error(
            "Get Order Details Error:",
            err
        );

        return res.status(500).json({
            error: "Could not load order details."
        });
    }
};

exports.getSellerAnalytics = async (req, res) => {
    const sellerId =
        Number(req.user.id);

    try {
        const summary =
            await pool.query(
                `
                SELECT
                    COUNT(DISTINCT listings.id)
                        FILTER (
                            WHERE listings.status <> 'archived'
                        ) AS active_listings,

                    COUNT(orders.id)
                        FILTER (
                            WHERE orders.status NOT IN (
                                'cancelled',
                                'rejected'
                            )
                        ) AS total_orders,

                    COALESCE(
                        SUM(
                            listings.price *
                            orders.quantity
                        ) FILTER (
                            WHERE orders.status IN (
                                'accepted',
                                'completed'
                            )
                        ),
                        0
                    ) AS total_revenue,

                    COALESCE(
                        AVG(
                            listings.price *
                            orders.quantity
                        ) FILTER (
                            WHERE orders.status IN (
                                'accepted',
                                'completed'
                            )
                        ),
                        0
                    ) AS average_order_value
                FROM listings
                LEFT JOIN orders
                    ON orders.listing_id = listings.id
                WHERE listings.user_id = $1
                `,
                [sellerId]
            );

        const revenueByCategory =
            await pool.query(
                `
                SELECT
                    listings.category,
                    COALESCE(
                        SUM(
                            listings.price *
                            orders.quantity
                        ),
                        0
                    ) AS revenue
                FROM orders
                JOIN listings
                    ON listings.id = orders.listing_id
                WHERE orders.seller_id = $1
                AND orders.status IN (
                    'accepted',
                    'completed'
                )
                GROUP BY listings.category
                ORDER BY revenue DESC
                `,
                [sellerId]
            );

        const dailyRevenue =
            await pool.query(
                `
                SELECT
                    DATE(orders.created_at) AS date,
                    COALESCE(
                        SUM(
                            listings.price *
                            orders.quantity
                        ),
                        0
                    ) AS revenue,
                    COUNT(orders.id) AS orders
                FROM orders
                JOIN listings
                    ON listings.id = orders.listing_id
                WHERE orders.seller_id = $1
                AND orders.status IN (
                    'accepted',
                    'completed'
                )
                AND orders.created_at >=
                    CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(orders.created_at)
                ORDER BY date ASC
                `,
                [sellerId]
            );

        const topListings =
            await pool.query(
                `
                SELECT
                    listings.id,
                    listings.title,
                    listings.category,
                    SUM(orders.quantity) AS units_sold,
                    SUM(
                        listings.price *
                        orders.quantity
                    ) AS revenue
                FROM orders
                JOIN listings
                    ON listings.id = orders.listing_id
                WHERE orders.seller_id = $1
                AND orders.status IN (
                    'accepted',
                    'completed'
                )
                GROUP BY
                    listings.id,
                    listings.title,
                    listings.category
                ORDER BY units_sold DESC
                LIMIT 5
                `,
                [sellerId]
            );

        return res.json({
            summary: summary.rows[0],
            revenueByCategory:
                revenueByCategory.rows,
            dailyRevenue:
                dailyRevenue.rows,
            topListings:
                topListings.rows
        });
    } catch (error) {
        console.error(
            "SELLER ANALYTICS ERROR:",
            error
        );

        return res.status(500).json({
            error: "Unable to load seller analytics."
        });
    }
};