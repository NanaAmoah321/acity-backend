const pool = require("../config/db");
const supabase = require("../config/supabase");

exports.getMyStore = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT *
            FROM stores
            WHERE user_id = $1
            `,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.json({
                hasStore: false
            });
        }

        res.json({
            hasStore: true,
            store: result.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message
        });
    }
};

exports.createStore = async (req, res) => {
    const {
        store_name,
        description,
        opening_time,
        closing_time,
        phone,
        location
    } = req.body;

    let categories = [];

    try {
        categories = JSON.parse(req.body.categories || "[]");
    } catch {
        categories = [];
    }

    try {

        const existing = await pool.query(
            `
            SELECT id
            FROM stores
            WHERE user_id = $1
            `,
            [req.user.id]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                error: "You already have a store."
            });
        }

        let profile_image = null;
        

        if (req.file) {

            const file = req.file;

            const fileName = `store-profile-${Date.now()}-${file.originalname}`;

            const { error } = await supabase.storage
                .from("listing-images")
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype
                });

            if (error) {
                return res.status(500).json({
                    error: error.message
                });
            }

            profile_image = supabase.storage
                .from("listing-images")
                .getPublicUrl(fileName).data.publicUrl;
        }

        

        const store = await pool.query(
            `
            INSERT INTO stores(
                user_id,
                store_name,
                description,
                profile_image,
                categories,
                opening_time,
                closing_time,
                phone,
                location
            )

            VALUES(
                $1,$2,$3,$4,$5,$6,$7,$8,$9
            )

            RETURNING *
            `,
            [
                req.user.id,
                store_name,
                description,
                profile_image,
                categories,
                opening_time,
                closing_time,
                phone,
                location
            ]
        );

        res.status(201).json(store.rows[0]);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }
};