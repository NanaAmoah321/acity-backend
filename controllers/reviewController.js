const pool = require("../config/db");

const {
    validateReview
} = require("../utils/validators");

exports.createReview = async (req, res) => {

    const {
        reviewed_user_id,
        rating,
        comment
    } = req.body;

    const validationError =
validateReview({

    rating,
    comment

});

if(validationError){

    return res.status(400).json({

        error: validationError

    });

}

    try {

        

        const existing =
        await pool.query(
            `
            SELECT *
            FROM reviews

            WHERE
            reviewer_id = $1

            AND

            reviewed_user_id = $2
            `,
            [
                req.user.id,
                reviewed_user_id
            ]
        );

        if (
            existing.rows.length > 0
        ) {

            return res
            .status(400)
            .json({
                error:
                "You already reviewed this user"
            });

        }

        

        const result =
        await pool.query(
            `
            INSERT INTO reviews
            (
                reviewer_id,
                reviewed_user_id,
                rating,
                comment
            )
            VALUES
            ($1,$2,$3,$4)
            RETURNING *
            `,
            [
                req.user.id,
                reviewed_user_id,
                rating,
                comment
            ]
        );

        res.json(
            result.rows[0]
        );

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }



};

exports.getReviews = async (req, res) => {

    try {

        const result =
        await pool.query(
            `
            SELECT
                reviews.*,
                users.name AS reviewer_name

            FROM reviews

            JOIN users
            ON users.id =
               reviews.reviewer_id

            WHERE
            reviewed_user_id = $1

            ORDER BY
            created_at DESC
            `,
            [
                req.params.userId
            ]
        );

        res.json(
            result.rows
        );

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};

exports.getAverageRating =
async (req, res) => {

    try {

        const result =
        await pool.query(
            `
            SELECT
                ROUND(
                    AVG(rating),
                    1
                ) AS average_rating,

                COUNT(*) AS total_reviews

            FROM reviews

            WHERE
            reviewed_user_id = $1
            `,
            [
                req.params.userId
            ]
        );

        res.json(
            result.rows[0]
        );

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};