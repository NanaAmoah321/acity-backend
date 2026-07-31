const pool = require("../config/db");
const {
    validateService
} = require("../utils/validators");

const { sendEmail } =
require("../utils/email");

const {

    newServiceTemplate

} = require("../utils/emailTemplates");

function formatServiceRequestMessage(service, details) {
    const labels = {
        pickup_location: "Pickup",
        dropoff_location: "Drop-off",
        preferred_date: "Date",
        preferred_time: "Time",
        item_size: "Item size",
        quantity: "Quantity",
        additional_details: "Notes",
        course: "Course",
        topic: "Topic",
        level: "Level",
        session_format: "Session format",
        project_type: "Project type",
        required_features: "Features",
        deadline: "Deadline",
        design_type: "Design type",
        dimensions: "Dimensions",
        event_type: "Event type",
        location: "Location",
        duration: "Duration",
        document_type: "Document type",
        word_count: "Word count",
        what_you_need: "Request",
        preferred_location: "Preferred location",
        budget: "Budget"
    };

    const lines = [
        `📋 Service request: ${service.title}`
    ];

    Object.entries(details)
        .filter(([, value]) => {
            return String(value || "").trim() !== "";
        })
        .forEach(([key, value]) => {
            const label = labels[key] || key.replaceAll("_", " ");

            lines.push(`${label}: ${String(value).trim()}`);
        });

    return lines.join("\n");
}

exports.createService =
async (req, res) => {

    const {
        title,
        description,
        category,
        rate,
        rate_type,
        portfolio_url
    } = req.body;

    const validationError =
validateService({

    title,
    description,
    category,
    rate

});

if(validationError){

    return res.status(400).json({

        error: validationError

    });

}

    try {

        const result =
        await pool.query(
            `
            INSERT INTO services
            (
                user_id,
                title,
                description,
                category,
                rate,
                rate_type,
                portfolio_url
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *
            `,
            [
                req.user.id,
                title,
                description,
                category,
                rate,
                rate_type,
                portfolio_url
            ]
        );

        const subscribers = await pool.query(
`
SELECT
    id
FROM users
WHERE
    receive_marketplace_updates = TRUE
`
);

const followers = await pool.query(
`
SELECT
    follower_id AS id
FROM store_followers
WHERE
    following_user_id = $1
`,
[
    req.user.id
]
);

const recipients = new Set();

subscribers.rows.forEach(user=>{

    recipients.add(user.id);

});

followers.rows.forEach(user=>{

    recipients.add(user.id);

});

for(const userId of recipients){

    await pool.query(
    `
    INSERT INTO email_queue(

        user_id,

        seller_id,

        service_id,

        type,

        status,

        processed

    )

    VALUES(

        $1,

        $2,

        $3,

        'service',

        'pending',

        FALSE

    )
    `,
    [

        userId,

        req.user.id,

        result.rows[0].id

    ]
    );

}

        res.json(
            result.rows[0]
        );

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};

exports.getServices = async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT

                services.*,

                users.name
                AS provider_name,

                ROUND(
                    AVG(reviews.rating),
                    1
                ) AS average_rating,

                COUNT(reviews.id)
                AS total_reviews

            FROM services

            JOIN users
            ON users.id = services.user_id

            LEFT JOIN reviews
            ON reviews.reviewed_user_id = users.id

            GROUP BY
                services.id,
                users.name

            ORDER BY
                services.created_at DESC
        `);

        res.json(result.rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }

};

exports.getMyServices = async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT *
      FROM services
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};

exports.createServiceRequest = async (req, res) => {
    const serviceId = Number(req.params.id);
    const requestDetails = req.body.request_details;

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
        return res.status(400).json({
            error: "Invalid service ID."
        });
    }

    if (
        !requestDetails ||
        typeof requestDetails !== "object" ||
        Array.isArray(requestDetails)
    ) {
        return res.status(400).json({
            error: "Request details are required."
        });
    }

    try {
        const serviceResult = await pool.query(
            `
            SELECT
                id,
                user_id,
                title,
                category,
                availability
            FROM services
            WHERE id = $1
            `,
            [serviceId]
        );

        if (serviceResult.rows.length === 0) {
            return res.status(404).json({
                error: "Service not found."
            });
        }

        const service = serviceResult.rows[0];

        if (Number(service.user_id) === Number(req.user.id)) {
            return res.status(400).json({
                error: "You cannot request your own service."
            });
        }

        if (service.availability !== "available") {
            return res.status(409).json({
                error: "This service is currently unavailable."
            });
        }

        const requestMessage =
            formatServiceRequestMessage(
                service,
                requestDetails
            );

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const requestResult = await client.query(
                `
                INSERT INTO service_requests
                (
                    service_id,
                    requester_id,
                    provider_id,
                    category,
                    request_details
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
                `,
                [
                    service.id,
                    req.user.id,
                    service.user_id,
                    service.category,
                    requestDetails
                ]
            );

            const messageResult = await client.query(
                `
                INSERT INTO messages
                (
                    sender_id,
                    receiver_id,
                    message
                )
                VALUES ($1, $2, $3)
                RETURNING *
                `,
                [
                    req.user.id,
                    service.user_id,
                    requestMessage
                ]
            );

            await client.query("COMMIT");

            
            const io = req.app.get("io");

            if (io) {
                const socketMessage = messageResult.rows[0];

                io.to(`user_${service.user_id}`)
                    .emit("new_message", socketMessage);

                io.to(`user_${req.user.id}`)
                    .emit("new_message", socketMessage);
            }

            return res.status(201).json({
                request: requestResult.rows[0],
                message: messageResult.rows[0]
            });

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;

        } finally {
            client.release();
        }

    } catch (err) {
        console.error("Create service request error:", err);

        return res.status(500).json({
            error: "Could not send service request."
        });
    }
};

exports.getServiceById = async (req, res) => {
    const serviceId = Number(req.params.id);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
        return res.status(400).json({
            error: "Invalid service ID."
        });
    }

    try {
        const result = await pool.query(
            `
            SELECT
                services.*,
                users.name AS provider_name,
                users.profile_picture AS provider_profile_picture,

                COALESCE(
                    ROUND(AVG(reviews.rating), 1),
                    0
                ) AS average_rating,

                COUNT(reviews.id)::INT AS total_reviews

            FROM services

            JOIN users
                ON users.id = services.user_id

            LEFT JOIN reviews
                ON reviews.reviewed_user_id = users.id

            WHERE services.id = $1

            GROUP BY
                services.id,
                users.id,
                users.name,
                users.profile_picture
            `,
            [serviceId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Service not found."
            });
        }

        return res.json(result.rows[0]);

    } catch (err) {
        console.error("Get service error:", err);

        return res.status(500).json({
            error: "Could not load service."
        });
    }
};