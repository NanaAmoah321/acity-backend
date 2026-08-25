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

exports.updateStore = async (req, res) => {
    const userId =
        Number(req.user.id);

    const {
        store_name,
        description,
        categories,
        opening_time,
        closing_time,
        phone,
        location
    } = req.body;

    if (
        !store_name ||
        store_name.trim().length < 3
    ) {
        return res.status(400).json({
            error: "Store name must be at least 3 characters."
        });
    }

    if (
        !description ||
        description.trim().length < 20
    ) {
        return res.status(400).json({
            error: "Store description must be at least 20 characters."
        });
    }

    try {
        let imageQuery = "";
        const values = [
            store_name.trim(),
            description.trim(),
            categories || "[]",
            opening_time || null,
            closing_time || null,
            phone || null,
            location || null
        ];

        if (req.file) {
            const fileName =
                `store-${userId}-${Date.now()}-${req.file.originalname}`;

            const { error } =
                await supabase.storage
                    .from("listing-images")
                    .upload(
                        fileName,
                        req.file.buffer,
                        {
                            contentType:
                                req.file.mimetype,
                            upsert: true
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

            values.push(data.publicUrl);
            imageQuery =
                ", profile_image = $8";
        }

        const query =
            `
            UPDATE stores
            SET
                store_name = $1,
                description = $2,
                categories = $3,
                opening_time = $4,
                closing_time = $5,
                phone = $6,
                location = $7
                ${imageQuery}
            WHERE user_id = $${req.file ? 9 : 8}
            RETURNING *
            `;

        values.push(userId);

        const result =
            await pool.query(
                query,
                values
            );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Store not found."
            });
        }

        return res.json({
            message: "Store updated successfully.",
            store: result.rows[0]
        });
    } catch (error) {
        console.error(
            "UPDATE STORE ERROR:",
            error
        );

        return res.status(500).json({
            error: error.message
        });
    }
};