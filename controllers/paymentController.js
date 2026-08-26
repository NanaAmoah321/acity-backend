const crypto = require("crypto");
const pool = require("../config/db");
const { createNotification } =
    require("../utils/notifications");

const PAYSTACK_API =
    "https://api.paystack.co";

function getReference() {
    return `ACITY-${Date.now()}-${crypto
        .randomBytes(5)
        .toString("hex")
        .toUpperCase()}`;
}

function getFrontendUrl(req) {
    const requestOrigin =
        req.get("origin");

    const allowedOrigins = [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://acityconnect.com",
        "https://www.acityconnect.com"
    ];

    if (
        requestOrigin &&
        allowedOrigins.includes(requestOrigin)
    ) {
        return requestOrigin;
    }

    return (
        process.env.FRONTEND_URL ||
        "https://acityconnect.com"
    ).replace(/\/$/, "");
}

async function getCheckoutTotal(items) {
    let total = 0;
    const verifiedItems = [];

    for (const item of items) {
        const result = await pool.query(
            `
            SELECT
                id,
                user_id,
                title,
                price,
                stock_quantity
            FROM listings
            WHERE id = $1
            AND status <> 'archived'
            `,
            [item.listing_id]
        );

        if (result.rows.length === 0) {
            throw new Error(
                `Listing ${item.listing_id} was not found.`
            );
        }

        const listing = result.rows[0];
        const quantity = Number(item.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error(
                "Every item must have a valid quantity."
            );
        }

        if (quantity > Number(listing.stock_quantity)) {
            throw new Error(
                `Only ${listing.stock_quantity} item(s) left for "${listing.title}".`
            );
        }

        

        const selectedOptions =
            Array.isArray(item.selected_options)
                ? item.selected_options
                : [];

        const optionsTotal =
            selectedOptions.reduce(
                (sum, option) =>
                    sum + Number(option.price || 0),
                0
            );

        total += (
            Number(listing.price) +
            optionsTotal
        ) * quantity;

        verifiedItems.push({
            listing_id: listing.id,
            seller_id: listing.user_id,
            title: listing.title,
            price: Number(listing.price),
            quantity,
            selected_options: selectedOptions,
            special_instructions:
                item.special_instructions || "",
            allergy_note:
                item.allergy_note || ""
        });
    }

    return {
        total,
        items: verifiedItems
    };
}

async function createOrdersFromPayment(
    client,
    userId,
    intent,
    paymentStatus
) {
    const checkout =
    typeof intent.checkout_data === "string"
        ? JSON.parse(intent.checkout_data)
        : intent.checkout_data;

    const delivery =
        checkout.delivery || {};


    const createdOrders = [];

    for (const item of checkout.items) {
        const stockResult = await client.query(
            `
            UPDATE listings
            SET stock_quantity = stock_quantity - $1
            WHERE id = $2
            AND stock_quantity >= $1
            RETURNING id
            `,
            [
                item.quantity,
                item.listing_id
            ]
        );

        if (stockResult.rows.length === 0) {
            throw new Error(
                `Insufficient stock for "${item.title}".`
            );
        }

        const orderResult = await client.query(
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
                payment_method,
                payment_status,
                payment_reference,
                selected_options,
                special_instructions,
                allergy_note,
                updated_at
                
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,
                'pending',
                $9,$10,$11,$12::jsonb,$13,$14,NOW()
            )
            RETURNING *
            `,
            [
                userId,
                item.seller_id,
                item.listing_id,
                item.quantity,
                delivery.delivery_method,
                delivery.hostel || null,
                delivery.room_number || null,
                delivery.meeting_location || null,
                "pending",
                "online",
                paymentStatus,
                intent.reference,
                JSON.stringify(item.selected_options || []),
                String(item.special_instructions || ""),
                String(item.allergy_note || "")
            ]
        );

        const order = orderResult.rows[0];

        createdOrders.push(order);

        await createNotification(
            item.seller_id,
            "New Order",
            `A buyer ordered "${item.title}".`,
            "order",
            order.id,
            `incoming-orders.html?id=${order.id}`
        );

        await createNotification(
            userId,
            "Order Placed",
            `Your order for "${item.title}" was placed.`,
            "order",
            order.id,
            `orders.html?id=${order.id}`
        );
    }

    return createdOrders;
}

exports.initializePayment = async (req, res) => {
    const userId = req.user.id;
    const { items, delivery } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            error: "Payment items are required."
        });
    }

    if (!delivery?.delivery_method) {
        return res.status(400).json({
            error: "Delivery information is required."
        });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
        return res.status(500).json({
            error: "Paystack is not configured."
        });
    }

    try {
        const userResult = await pool.query(
            `
            SELECT email
            FROM users
            WHERE id = $1
            `,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: "User account not found."
            });
        }

        const customerEmail =
            userResult.rows[0].email;

        const verified =
            await getCheckoutTotal(items);

        const reference =
            getReference();

        const checkoutData = {
            items: verified.items,
            delivery
        };

        await pool.query(
            `
            INSERT INTO payment_intents
            (
                user_id,
                reference,
                amount,
                currency,
                status,
                checkout_data
            )
            VALUES ($1,$2,$3,'GHS','pending',$4)
            `,
            [
                userId,
                reference,
                Math.round(verified.total * 100),
                JSON.stringify(checkoutData)
            ]
        );

        const paystackResponse =
            await fetch(
                `${PAYSTACK_API}/transaction/initialize`,
                {
                    method: "POST",
                    headers: {
                        Authorization:
                            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        email: customerEmail,
                        amount: String(
                            Math.round(
                                verified.total * 100
                            )
                        ),
                        currency: "GHS",
                        reference,
                        callback_url:
                            `${getFrontendUrl(req)}/payment.html`,
                        metadata: JSON.stringify({
                            user_id: userId,
                            payment_reference: reference
                        }),
                        channels: [
                            "card",
                            "mobile_money",
                            "bank",
                            "bank_transfer",
                            "ussd"
                        ]
                    })
                }
            );

        const data =
            await paystackResponse.json();

        if (
            !paystackResponse.ok ||
            !data.status
        ) {
            throw new Error(
                data.message ||
                "Paystack initialization failed."
            );
        }

        return res.json({
            authorization_url:
                data.data.authorization_url,
            reference:
                data.data.reference
        });

    } catch (error) {
        console.error(
            "Initialize Payment Error:",
            error
        );

        return res.status(500).json({
            error: error.message
        });
    }
};

exports.verifyPayment = async (req, res) => {
    const userId = req.user.id;
    const reference =
        String(req.query.reference || "").trim();

    if (!reference) {
        return res.status(400).json({
            error: "Payment reference is required."
        });
    }

    try {
        const intentResult = await pool.query(
            `
            SELECT *
            FROM payment_intents
            WHERE reference = $1
            AND user_id = $2
            `,
            [
                reference,
                userId
            ]
        );

        if (intentResult.rows.length === 0) {
            return res.status(404).json({
                error: "Payment session not found."
            });
        }

        const intent =
            intentResult.rows[0];

        if (intent.status === "success") {
            return res.json({
                message: "Payment already verified.",
                status: "success"
            });
        }

        const paystackResponse =
            await fetch(
                `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                    }
                }
            );

        const data =
            await paystackResponse.json();

        const transaction =
            data.data || {};

        if (
            !paystackResponse.ok ||
            !data.status ||
            transaction.status !== "success"
        ) {
            await pool.query(
                `
                UPDATE payment_intents
                SET
                    status = $1,
                    updated_at = NOW()
                WHERE reference = $2
                `,
                [
                    transaction.status ||
                        "failed",
                    reference
                ]
            );

            return res.status(402).json({
                error: "Payment was not successful.",
                status:
                    transaction.status ||
                    "failed"
            });
        }

        if (
            Number(transaction.amount) !==
            Number(intent.amount)
        ) {
            return res.status(400).json({
                error: "Payment amount mismatch."
            });
        }

        const client =
            await pool.connect();

        try {
            await client.query("BEGIN");

            await client.query(
                `
                UPDATE payment_intents
                SET
                    status = 'success',
                    updated_at = NOW()
                WHERE reference = $1
                `,
                [reference]
            );

            const orders =
                await createOrdersFromPayment(
                    client,
                    userId,
                    intent,
                    "paid"
                );

            await client.query("COMMIT");

            return res.json({
                message: "Payment verified.",
                status: "success",
                orders
            });

        } catch (transactionError) {
            await client.query("ROLLBACK");
            throw transactionError;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error(
            "Verify Payment Error:",
            error
        );

        return res.status(500).json({
            error: error.message
        });
    }
};