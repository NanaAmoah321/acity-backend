const pool = require("../config/db");
const { sendEmail } = require("../utils/email");
const {
    marketplaceDigestTemplate,
    serviceDigestTemplate
} = require("../utils/emailTemplates");
let workerRunning = false;
async function processEmailQueue() {

    if(workerRunning){

        console.log("Worker already running.");

        return;

    }

    workerRunning = true;
    try {
        console.log(
            `[Email Worker] Checking queue at ${new Date().toISOString()}`
        );

        // 1. Reset jobs that have been stuck in 'processing' for more than 30 minutes
        await pool.query(
            `
            UPDATE email_queue
            SET status='pending'
            WHERE status='processing'
            AND created_at < NOW() - INTERVAL '30 minutes'
            `
        );

        // 2. Fetch and lock up to 500 pending jobs
        const jobs = await pool.query(
            `
            UPDATE email_queue
            SET status='processing'
            WHERE id IN (
                SELECT id
                FROM email_queue
                WHERE status='pending'
                ORDER BY created_at ASC
                LIMIT 500
            )
            RETURNING *;
            `
        );

        if (jobs.rows.length === 0) {
            console.log("No email jobs.");
            return;
        }

        // 3. Group jobs by recipient, seller, and type to bundle notifications
        const groupedJobs = {};
        jobs.rows.forEach(job => {
            const key = `${job.user_id}_${job.seller_id}_${job.type}`;
            if (!groupedJobs[key]) {
                groupedJobs[key] = [];
            }
            groupedJobs[key].push(job);
        });

        // 4. Process each bundled group
        for (const key in groupedJobs) {
            const queueJobs = groupedJobs[key];
            const firstJob = queueJobs[0];
            const jobIds = queueJobs.map(job => job.id);

            // Fetch Recipient details
            const recipient = await pool.query(
                `
                SELECT id, name, email, unsubscribe_token
                FROM users
                WHERE id = $1
                `,
                [firstJob.user_id]
            );

            if (recipient.rows.length === 0) {
                continue; 
            }

            // Fetch Seller details along with ratings
            const seller = await pool.query(
                `
                SELECT
                    users.id,
                    users.name,
                    COALESCE(
                        ROUND(AVG(reviews.rating),1),
                        0
                    ) AS average_rating,
                    COUNT(reviews.id) AS total_reviews
                FROM users
                LEFT JOIN reviews ON reviews.reviewed_user_id = users.id
                WHERE users.id = $1
                GROUP BY users.id, users.name
                `,
                [firstJob.seller_id]
            );

            if (seller.rows.length === 0) {
                continue;
            }

            let emailSentSuccessfully = false;

            // Handle Marketplace Listings
            if (firstJob.type === "listing") {
                const itemIds = queueJobs.map(job => job.listing_id);
                const listings = await pool.query(
                    `
                    SELECT id, title, category, price, image_url
                    FROM listings
                    WHERE id = ANY($1::int[])
                    ORDER BY created_at DESC
                    `,
                    [itemIds]
                );

                if (listings.rows.length > 0) {
                    try {

                        if(!recipient.rows[0].email){

                            continue;

                        }
                        await sendEmail(
                            recipient.rows[0].email,
                            `🛒 ${seller.rows[0].name} added ${listings.rows.length} new marketplace item${listings.rows.length > 1 ? "s" : ""}`,
                            marketplaceDigestTemplate(
                                recipient.rows[0].name,
                                seller.rows[0].name,
                                listings.rows,
                                seller.rows[0].average_rating,
                                seller.rows[0].total_reviews,
                                recipient.rows[0].unsubscribe_token
                            )
                        );
                        emailSentSuccessfully = true;
                    } catch (err) {
                        console.error("Marketplace digest failed:", err.message);
                    }
                }

            // Handle Skills/Services
            } else {
                const serviceIds = queueJobs.map(job => job.service_id);
                const services = await pool.query(
                    `
                    SELECT id, title, category, rate, rate_type
                    FROM services
                    WHERE id = ANY($1::int[])
                    ORDER BY created_at DESC
                    `,
                    [serviceIds]
                );

                if (services.rows.length > 0) {
                    try {
                        await sendEmail(
                            recipient.rows[0].email,
                            `🛠 ${seller.rows[0].name} added ${services.rows.length} new service${services.rows.length > 1 ? "s" : ""}`,
                            serviceDigestTemplate(
                                recipient.rows[0].name,
                                seller.rows[0].name,
                                services.rows,
                                seller.rows[0].average_rating,
                                recipient.rows[0].unsubscribe_token
                            )
                        );
                        emailSentSuccessfully = true;
                    } catch (err) {
                        console.error("Service digest failed:", err.message);
                    }
                }
            }

            // 5. Update the queue status for the processed chunk (Moved outside the 'else' block)
            if (emailSentSuccessfully) {
                await pool.query(
                    `
                    UPDATE email_queue
                    SET processed = TRUE, status = 'sent'
                    WHERE id = ANY($1)
                    `,
                    [jobIds]
                );
            } else {
                // If the email delivery fails or has no matching records, change status back to fail/pending 
                // so it doesn't stay permanently locked in 'processing' status.
                await pool.query(
                    `
                    UPDATE email_queue
                    SET status = 'pending'
                    WHERE id = ANY($1::int[])
                    `,
                    [jobIds]
                );
            }
        }
    } catch (err) {
        console.error("Email Worker Error:", err);
    }finally{
        workerRunning=false;
    }

}

// Run the task every 10 minutes
setInterval(processEmailQueue, 10 * 60 * 1000);

// Run immediately on boot
processEmailQueue();