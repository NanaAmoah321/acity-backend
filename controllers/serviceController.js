const pool = require("../config/db");
const {
    validateService
} = require("../utils/validators");

const { sendEmail } =
require("../utils/email");

const {
    messageTemplate
} = require("../utils/emailTemplates");

const {
    createNotification
} = require("../utils/notifications");

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
                users.name AS provider_name,
                stores.store_name AS store_name,
                ROUND(AVG(reviews.rating), 1) AS average_rating,
                COUNT(reviews.id) AS total_reviews
            FROM services
            JOIN users
                ON users.id = services.user_id
            LEFT JOIN stores
                ON stores.user_id = services.user_id
            LEFT JOIN reviews
                ON reviews.reviewed_user_id = users.id
            GROUP BY
                services.id,
                users.name,
                stores.store_name
            ORDER BY services.created_at DESC
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
                services.id,
                services.user_id,
                services.title,
                services.category,
                services.availability,

                users.name AS provider_name,
                users.email AS provider_email

            FROM services

            JOIN users
                ON users.id = services.user_id

            WHERE services.id = $1
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

        const requesterResult = await pool.query(
            `
            SELECT name
            FROM users
            WHERE id = $1
            `,
            [req.user.id]
        );

        const requesterName =
            requesterResult.rows[0]?.name || "A student";

        const requestMessage =
            formatServiceRequestMessage(
                service,
                requestDetails
            );

        const client = await pool.connect();

        let request;
        let message;

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

            request = requestResult.rows[0];
            message = messageResult.rows[0];

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;

        } finally {
            client.release();
        }

        const io = req.app.get("io");

        if (io) {
            io.to(`user_${service.user_id}`)
                .emit("new_message", message);

            io.to(`user_${req.user.id}`)
                .emit("new_message", message);
        }

        const onlineUsers = req.app.get("onlineUsers");

        const backgroundTasks = [
            createNotification(
                service.user_id,
                "New Service Request",
                `${requesterName} requested ${service.title}.`,
                "message",
                request.id,
                null,
                req.user.id
            )
        ];

        const isProviderOnline =
            onlineUsers &&
            onlineUsers.has(Number(service.user_id));

        if (!isProviderOnline && service.provider_email) {
            backgroundTasks.push(
                sendEmail({
                    from: process.env.EMAIL_FROM,
                    to: service.provider_email,
                    subject: `📋 New request for ${service.title}`,
                    html: messageTemplate(
                        service.provider_name,
                        requesterName,
                        requestMessage
                    )
                })
            );
        }

        Promise.allSettled(backgroundTasks)
            .then(results => {
                results.forEach(result => {
                    if (result.status === "rejected") {
                        console.error(
                            "Service request background task failed:",
                            result.reason
                        );
                    }
                });
            });

        return res.status(201).json({
            request,
            message
        });

    } catch (err) {
        console.error("Create service request error:", err);

        return res.status(500).json({
            error: "Could not send service request."
        });
    }
};

exports.getIncomingServiceRequests = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                service_requests.*,

                services.title AS service_title,
                services.rate AS service_rate,
                services.rate_type AS service_rate_type,

                users.name AS requester_name,
                users.profile_picture AS requester_profile_picture

            FROM service_requests

            JOIN services
                ON services.id = service_requests.service_id

            JOIN users
                ON users.id = service_requests.requester_id

            WHERE service_requests.provider_id = $1

            ORDER BY
                CASE
                    WHEN service_requests.status = 'pending'
                        THEN 0
                    ELSE 1
                END,
                service_requests.created_at DESC
            `,
            [req.user.id]
        );

        return res.json(result.rows);

    } catch (err) {
        console.error(
            "Get incoming service requests error:",
            err
        );

        return res.status(500).json({
            error: "Could not load incoming service requests."
        });
    }
};

exports.updateServiceRequestStatus = async (req, res) => {
    const requestId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.status(400).json({
            error: "Invalid service request ID."
        });
    }

    if (!["accepted", "declined"].includes(status)) {
        return res.status(400).json({
            error: "Status must be accepted or declined."
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const requestResult = await client.query(
            `
            SELECT
                service_requests.*,

                services.title AS service_title,

                requester.name AS requester_name,
                requester.email AS requester_email,

                provider.name AS provider_name

            FROM service_requests

            JOIN services
                ON services.id = service_requests.service_id

            JOIN users requester
                ON requester.id = service_requests.requester_id

            JOIN users provider
                ON provider.id = service_requests.provider_id

            WHERE service_requests.id = $1
              AND service_requests.provider_id = $2

            FOR UPDATE
            `,
            [requestId, req.user.id]
        );

        if (requestResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "Service request not found."
            });
        }

        const request = requestResult.rows[0];

        if (request.status !== "pending") {
            await client.query("ROLLBACK");

            return res.status(409).json({
                error: "This request has already been updated."
            });
        }

        const statusMessage =
            status === "accepted"
                ? `✅ Your request for ${request.service_title} has been accepted. You can continue the conversation here.`
                : `❌ Your request for ${request.service_title} was declined. You can message the provider for more information.`;

        const updatedRequest = await client.query(
            `
            UPDATE service_requests
            SET
                status = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
            `,
            [status, requestId]
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
                request.requester_id,
                statusMessage
            ]
        );

        await client.query("COMMIT");

        const message = messageResult.rows[0];

        const io = req.app.get("io");

        if (io) {
            io.to(`user_${request.requester_id}`)
                .emit("new_message", message);

            io.to(`user_${req.user.id}`)
                .emit("new_message", message);
        }

        const onlineUsers = req.app.get("onlineUsers");

        const backgroundTasks = [
            createNotification(
                request.requester_id,
                status === "accepted"
                    ? "Service Request Accepted"
                    : "Service Request Declined",
                `${request.provider_name} ${status} your request for ${request.service_title}.`,
                "message",
                requestId,
                null,
                req.user.id
            )
        ];

        const isRequesterOnline =
            onlineUsers &&
            onlineUsers.has(
                Number(request.requester_id)
            );

        if (
            !isRequesterOnline &&
            request.requester_email
        ) {
            backgroundTasks.push(
                sendEmail({
                    from: process.env.EMAIL_FROM,
                    to: request.requester_email,
                    subject:
                        status === "accepted"
                            ? `✅ Your ${request.service_title} request was accepted`
                            : `❌ Your ${request.service_title} request was declined`,
                    html: messageTemplate(
                        request.requester_name,
                        request.provider_name,
                        statusMessage
                    )
                })
            );
        }

        Promise.allSettled(backgroundTasks)
            .then(results => {
                results.forEach(result => {
                    if (result.status === "rejected") {
                        console.error(
                            "Service status background task failed:",
                            result.reason
                        );
                    }
                });
            });

        return res.json({
            message:
                status === "accepted"
                    ? "Service request accepted."
                    : "Service request declined.",
            request: updatedRequest.rows[0]
        });

    } catch (err) {
        await client.query("ROLLBACK");

        console.error(
            "Update service request status error:",
            err
        );

        return res.status(500).json({
            error: "Could not update service request."
        });

    } finally {
        client.release();
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