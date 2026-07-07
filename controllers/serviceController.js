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

        const subscribers =
await pool.query(

    `
    SELECT
        id,
        name,
        email

    FROM users

    WHERE
        receive_marketplace_updates = TRUE
    `

);

const followers =
await pool.query(

    `
    SELECT

        users.id,

        users.name,

        users.email

    FROM store_followers

    JOIN users

    ON users.id =
    store_followers.follower_id

    WHERE
        following_user_id = $1
    `,

    [

        req.user.id

    ]

);

const recipients =
new Map();

[
    ...subscribers.rows,

    ...followers.rows

].forEach(user=>{

    recipients.set(

        user.id,

        user

    );

});

const provider = await pool.query(
`
SELECT

    users.name,

    COALESCE(
        ROUND(AVG(reviews.rating),1),
        0
    ) AS average_rating,

    COUNT(reviews.id) AS total_reviews

FROM users

LEFT JOIN reviews
ON reviews.reviewed_user_id = users.id

WHERE users.id = $1

GROUP BY
users.id,
users.name
`,
[
    req.user.id
]
);

for(const user of recipients.values()){

    await sendEmail(

    user.email,

    `🛠️ ${provider.rows[0].name} is offering "${result.rows[0].title}"`,

    newServiceTemplate(

        user.name,

        provider.rows[0].name,

        result.rows[0].title,

        result.rows[0].category,

        result.rows[0].rate,

        result.rows[0].rate_type,

        provider.rows[0].average_rating

    )

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