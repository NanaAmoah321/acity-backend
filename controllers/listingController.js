const pool = require("../config/db");
const { createNotification } = require("../utils/notifications");
const { sendEmail } = require("../utils/email");
const supabase = require("../config/supabase");

const {
    buyerOrderTemplate,
    sellerOrderTemplate
} = require("../utils/emailTemplates");


exports.createListing = async (req, res) => {

    const {

        title,
        description,
        category,
        price,
        stock_quantity

    } = req.body;

    const user_id = req.user.id;

    let image_url = null;

    try {

        if (req.file) {

            const fileName =
                `${Date.now()}-${req.file.originalname}`;

            const { error } =
                await supabase.storage
                    .from("listing-images")
                    .upload(
                        fileName,
                        req.file.buffer,
                        {
                            contentType: req.file.mimetype
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

            image_url = data.publicUrl;

        }

        const newListing = await pool.query(

            `
            INSERT INTO listings (

                user_id,
                title,
                description,
                category,
                price,
                stock_quantity,
                image_url,
                status
                

            )

            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)

            RETURNING *
            `,

            [

                user_id,

                title,

                description,

                category,

                price,

                stock_quantity,

                image_url,

                "available"

                

            ]

        );

        await pool.query(

            `
            UPDATE users

            SET store_category = $1

            WHERE id = $2
            `,

            [

                category,

                user_id

            ]

        );

        res.json(newListing.rows[0]);

    } catch (err) {

        console.error(err);

        res.status(500).json({

            error: err.message

        });

    }

};


exports.getListings = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT

        listings.*,

        users.name AS seller_name,

        ROUND(
          AVG(reviews.rating),
          1
        ) AS average_rating,

        COUNT(reviews.id)
        AS total_reviews

      FROM listings

      JOIN users
      ON listings.user_id = users.id

      LEFT JOIN reviews
      ON reviews.reviewed_user_id = users.id

      GROUP BY
        listings.id,
        users.name

      ORDER BY
        listings.created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }
};

exports.searchListings = async (req, res) => {

    const { q } = req.query;

    try {

        const result = await pool.query(

            `
            SELECT

                listings.*,

                users.name AS seller_name

            FROM listings

            JOIN users

            ON listings.user_id = users.id

            WHERE

                listings.title ILIKE $1

                OR listings.description ILIKE $1

                OR listings.category ILIKE $1

                OR users.name ILIKE $1

            ORDER BY listings.created_at DESC
            `,

            [`%${q}%`]

        );

        res.json(result.rows);

    } catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

};

exports.getUserListings = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      "SELECT * FROM listings WHERE user_id = $1 ORDER BY created_at DESC",
      [user_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    category,
    price,
    stock_quantity,
    image_url,
    status
  } = req.body;

  const user_id = req.user.id;

  try {

    console.log("REQ USER:", req.user);
    console.log("USER ID:", user_id);
    console.log("LISTING ID:", id);
    console.log("BODY:", req.body);

    const result = await pool.query(
    `
    UPDATE listings
    SET
      title = $1,
      description = $2,
      category = $3,
      price = $4,
      image_url = $5,
      status = $6,
      stock_quantity = $9,
      sold_at =
        CASE
          WHEN status <> 'sold'
              AND $6::varchar = 'sold'
          THEN NOW()
          ELSE sold_at
        END
    WHERE id = $7
    AND user_id = $8
    RETURNING *
    `,
    [
      title,
      description,
      category,
      price,
      image_url,
      status,
      id,
      user_id,
      stock_quantity
    ]
    );

    console.log("UPDATED ROWS:", result.rows);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Listing not found or unauthorized"
      });
    }

    res.json({
      message: "Listing updated",
      listing: result.rows[0]
    });

    } catch (err) {

    console.error("UPDATE ERROR:", err);

    res.status(500).json({
      error: err.message
    });

   

   }
};
exports.deleteListing = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      "DELETE FROM listings WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Listing not found or unauthorized" });
    }

    res.json({ message: "Listing deleted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addInterest = async (req, res) => {

    const user_id = req.user.id;
    const { listing_id } = req.body;

    try{

        const existing = await pool.query(

            `
            SELECT *
            FROM interests
            WHERE user_id=$1
            AND listing_id=$2
            `,

            [user_id, listing_id]

        );

        if(existing.rows.length > 0){

            await pool.query(

                `
                UPDATE interests
                SET quantity = quantity + 1
                WHERE user_id=$1
                AND listing_id=$2
                `,

                [user_id, listing_id]

            );

            return res.json({

                message:"Quantity updated."

            });

        }

        await pool.query(

            `
            INSERT INTO interests
            (
                user_id,
                listing_id,
                quantity
            )
            VALUES($1,$2,1)
            `,

            [user_id, listing_id]

        );

        res.json({

            message:"Added to cart."

        });

    }catch(err){

        res.status(500).json({

            error:err.message

        });

    }

};

exports.getInterestedListings = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(

`
SELECT

    listings.*,

    interests.quantity,

    orders.status AS order_status

FROM interests

JOIN listings
ON interests.listing_id = listings.id

LEFT JOIN orders
ON orders.listing_id = listings.id
AND orders.buyer_id = interests.user_id

WHERE interests.user_id = $1

ORDER BY interests.created_at DESC
`,

[user_id]

);


    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCartQuantity = async (req, res) => {

    const user_id = req.user.id;

    const { listing_id } = req.params;

    const { change } = req.body;

    try {

        // Check current quantity
        const current = await pool.query(

            `
            SELECT quantity
            FROM interests
            WHERE user_id = $1
            AND listing_id = $2
            `,

            [user_id, listing_id]

        );

        if (current.rows.length === 0) {

            return res.status(404).json({

                message: "Item not found in cart."

            });

        }

        const newQuantity =
            current.rows[0].quantity + change;

        // Remove item if quantity reaches 0
        if (newQuantity <= 0) {

            await pool.query(

                `
                DELETE FROM interests
                WHERE user_id = $1
                AND listing_id = $2
                `,

                [user_id, listing_id]

            );

            return res.json({

                message: "Item removed from cart."

            });

        }

        // Update quantity
        await pool.query(

            `
            UPDATE interests
            SET quantity = $1
            WHERE user_id = $2
            AND listing_id = $3
            `,

            [

                newQuantity,

                user_id,

                listing_id

            ]

        );

        res.json({

            message: "Quantity updated."

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            error: err.message

        });

    }

};

exports.removeFromCart = async (req, res) => {
  const user_id = req.user.id;
  const { listing_id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM interests WHERE user_id = $1 AND listing_id = $2 RETURNING *",
      [user_id, listing_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    res.json({ message: "Removed from cart" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.flagListing = async (req, res) => {
  const { id } = req.params;

  await pool.query(
    "UPDATE listings SET flagged = true WHERE id = $1",
    [id]
  );

  res.json({ message: "Listing flagged" });

};
exports.adminDeleteListing = async (req, res) => {
  const { id } = req.params;

  try {
   
    await pool.query(
      "DELETE FROM interests WHERE listing_id = $1",
      [id]
    );

    await pool.query(
      "DELETE FROM listings WHERE id = $1",
      [id]
    );

    res.json({ message: "Listing deleted by admin" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getListingById = async (req, res) => {

    try {

        const result =
        await pool.query(
        `
        SELECT
            listings.*,
            users.name
            AS seller_name

        FROM listings

        JOIN users
        ON users.id =
           listings.user_id

        WHERE listings.id = $1
        `,
        [
            req.params.id
        ]
        );

        console.log("PARAM ID:", req.params.id);
        console.log("ROWS:", result.rows);

        res.json(
            result.rows[0]
        );

    } catch (err) {

        res.status(500).json({
            error:
            err.message
        });

    }

};

async function deleteOldSoldListings() {

    await pool.query(
        `
        DELETE FROM listings
        WHERE
            status = 'sold'
        AND
            sold_at <
            NOW() - INTERVAL '30 days'
        `
    );

}

exports.getStores = async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        users.id AS user_id,

        users.name AS store_name,

        users.store_category,

        COUNT(listings.id)
        AS total_products,

        ROUND(
          AVG(reviews.rating),
          1
        ) AS average_rating,

        COUNT(reviews.id)
        AS total_reviews,

        (
          SELECT image_url
          FROM listings l
          WHERE l.user_id = users.id
          ORDER BY created_at DESC
          LIMIT 1
        ) AS cover_image

      FROM users

      JOIN listings
      ON listings.user_id = users.id

      LEFT JOIN reviews
      ON reviews.reviewed_user_id = users.id

      GROUP BY
        users.id,
        users.name,
        users.store_category

      ORDER BY users.name
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }

};

exports.getStore = async (req, res) => {
  const { userId } = req.params;

  try {

    const seller = await pool.query(
      `
      SELECT
        users.id,
        users.name AS seller_name,

        (
          SELECT category
          FROM listings
          WHERE user_id = users.id
          LIMIT 1
        ) AS store_category,

        ROUND(
          AVG(reviews.rating),
          1
        ) AS average_rating,

        COUNT(reviews.id)
        AS total_reviews

      FROM users

      LEFT JOIN reviews
      ON reviews.reviewed_user_id = users.id

      WHERE users.id = $1

      GROUP BY users.id
      `,
      [userId]
    );

    const products = await pool.query(
      `
      SELECT *
      FROM listings
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.json({
      seller: seller.rows[0],
      products: products.rows
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
};

exports.createOrder = async (req, res) => {

    const buyer_id = req.user.id;

    const {
        listing_id,
        seller_id,
        quantity,
        delivery_method,
        hostel,
        room_number,
        meeting_location
    } = req.body;

    try {

      const stock = await pool.query(

    `
    SELECT stock_quantity
    FROM listings
    WHERE id = $1
    `,

    [listing_id]

);

if (stock.rows.length === 0) {

    return res.status(404).json({

        message: "Listing not found."

    });

}

if (quantity > stock.rows[0].stock_quantity) {

    return res.status(400).json({

        message: `Only ${stock.rows[0].stock_quantity} item(s) left in stock.`

    });

}

        const order = await pool.query(
            `
            INSERT INTO orders (

                buyer_id,
                seller_id,
                listing_id,
                quantity,
                delivery_method,
                hostel,
                room_number,
                meeting_location

            )

            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8
            )

            RETURNING *
            `,
            [
                buyer_id,
                seller_id,
                listing_id,
                quantity,
                delivery_method,
                hostel,
                room_number,
                meeting_location
            ]
        );

        // Get buyer's name
        const buyer = await pool.query(
            `
            SELECT name
            FROM users
            WHERE id = $1
            `,
            [buyer_id]
        );

        // Get listing title
        const listing = await pool.query(
            `
            SELECT title
            FROM listings
            WHERE id = $1
            `,
            [listing_id]
        );

        const buyerInfo = await pool.query(
        `
        SELECT
          name,
          email
        FROM users
        WHERE id = $1
        `,
        [buyer_id]
        );

        const sellerInfo = await pool.query(
        `
        SELECT
          name,
          email
        FROM users
        WHERE id = $1
        `,
        [seller_id]
        );

        // Create notification for seller
        await createNotification(

            seller_id,

            "New Order",

            `${buyer.rows[0].name} ordered "${listing.rows[0].title}".`,

            "order",

            listing_id,

            "profile.html#orders"

        );

        await sendEmail(

          buyerInfo.rows[0].email,

          "🎉 Order Confirmed",

          buyerOrderTemplate(

          buyerInfo.rows[0].name,

          listing.rows[0].title

         )

        );

        await sendEmail(

          sellerInfo.rows[0].email,

          "📦 New Order Received",

          sellerOrderTemplate(

            sellerInfo.rows[0].name,

            buyerInfo.rows[0].name,

            listing.rows[0].title

          )

        );

        res.json({
            message: "Order created",
            order: order.rows[0]
        });


        await pool.query(

`
UPDATE listings

SET stock_quantity=

stock_quantity-$1

WHERE id=$2
`,

[

quantity,

listing_id

]

);

    } catch(err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }

};

exports.getSellerOrders = async (req, res) => {

    const seller_id =
    req.user.id;

    try {

        const orders =
        await pool.query(
            `
            SELECT

                orders.*,

                listings.title,

                listings.price,

                users.name AS buyer_name

            FROM orders

            JOIN listings
            ON listings.id = orders.listing_id

            JOIN users
            ON users.id = orders.buyer_id

            WHERE orders.seller_id = $1

            ORDER BY orders.created_at DESC
            `,
            [seller_id]
        );

        res.json(
            orders.rows
        );

    } catch(err) {

        res.status(500).json({
            error: err.message
        });

    }

};

exports.updateOrderStatus = async (req, res) => {

    const { id } =
    req.params;

    const { status } =
    req.body;

    try {

        const result =
        await pool.query(
            `
            UPDATE orders

            SET status = $1

            WHERE id = $2

            RETURNING *
            `,
            [
                status,
                id
            ]
        );

        res.json({
            message:
            "Order updated",
            order:
            result.rows[0]
        });

    } catch(err) {

        res.status(500).json({
            error:
            err.message
        });

    }

};

exports.markListingSold = async (req, res) => {

    const { id } = req.params;

    const user_id = req.user.id;

    try{

        const result = await pool.query(

            `
            UPDATE listings
            SET
                status='sold',
                sold_at=NOW()
            WHERE id=$1
            AND user_id=$2
            RETURNING *
            `,

            [id, user_id]

        );

        if(result.rows.length===0){

            return res.status(404).json({

                message:"Listing not found."

            });

        }

        res.json({

            message:"Listing marked as sold.",

            listing:result.rows[0]

        });

    }catch(err){

        console.error(err);

        res.status(500).json({

            error:err.message

        });

    }

};

exports.updateCartQuantity = async(req,res)=>{

    const user_id=req.user.id;

    const {listing_id}=req.params;

    const {change}=req.body;

    try{

        await pool.query(

            `
            UPDATE interests
            SET quantity = quantity + $1
            WHERE
                user_id=$2
            AND
                listing_id=$3
            `,

            [

                change,

                user_id,

                listing_id

            ]

        );

        await pool.query(

            `
            DELETE FROM interests

            WHERE quantity<=0
            `
        );

        res.json({

            message:"Updated"

        });

    }catch(err){

        res.status(500).json({

            error:err.message

        });

    }

};