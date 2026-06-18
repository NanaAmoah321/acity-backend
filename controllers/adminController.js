const pool = require("../config/db");

exports.getStats = async (req, res) => {

    try {

        const users =
        await pool.query(
            "SELECT COUNT(*) FROM users"
        );

        const listings =
        await pool.query(
            "SELECT COUNT(*) FROM listings"
        );

        const services =
        await pool.query(
            "SELECT COUNT(*) FROM services"
        );

        const messages =
        await pool.query(
            "SELECT COUNT(*) FROM messages"
        );

        res.json({

            users:
            users.rows[0].count,

            listings:
            listings.rows[0].count,

            services:
            services.rows[0].count,

            messages:
            messages.rows[0].count

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }

};

exports.getRecentListings = async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                listings.*,
                users.name AS seller_name

            FROM listings

            JOIN users
            ON users.id = listings.user_id

            ORDER BY
            listings.created_at DESC

            LIMIT 10
            `
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

exports.deleteListing =
async (req, res) => {

    try {

        await pool.query(
            `
            DELETE FROM listings
            WHERE id = $1
            `,
            [
                req.params.id
            ]
        );

        res.json({
            message:
            "Listing deleted"
        });

    } catch (err) {

        res.status(500).json({
            error:
            err.message
        });

    }

};

exports.getRecentServices = async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                services.*,
                users.name AS provider_name

            FROM services

            JOIN users
            ON users.id = services.user_id

            ORDER BY
            services.created_at DESC

            LIMIT 10
            `
        );

        res.json(result.rows);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};

exports.deleteService = async (req, res) => {

    try {

        await pool.query(
            `
            DELETE FROM services
            WHERE id = $1
            `,
            [req.params.id]
        );

        res.json({
            message: "Service deleted"
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};

exports.getUsers = async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                role,
                created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 20
            `
        );

        res.json(result.rows);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};

exports.makeAdmin = async (req, res) => {

    try {

        await pool.query(
            `
            UPDATE users
            SET role = 'admin'
            WHERE id = $1
            `,
            [req.params.id]
        );

        res.json({
            message: "User promoted"
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};

exports.suspendUser = async (req, res) => {

    try {

        await pool.query(
            `
            UPDATE users
            SET suspended = TRUE
            WHERE id = $1
            `,
            [req.params.id]
        );

        res.json({
            message: "User suspended"
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};

exports.deleteUser = async (req, res) => {

    try {

        await pool.query(
            `
            DELETE FROM users
            WHERE id = $1
            `,
            [req.params.id]
        );

        res.json({
            message: "User deleted"
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

};
