const pool = require("../config/db");
const {
    validateService
} = require("../utils/validators");

const { sendEmail } =
require("../utils/email");

const {

    newServiceTemplate

} = require("../utils/emailTemplates");

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