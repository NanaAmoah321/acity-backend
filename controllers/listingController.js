const pool = require("../config/db");


exports.createListing = async (req, res) => {
  const { title, description, category } = req.body;
  const user_id = req.user.id;

  try {
    const newListing = await pool.query(
      "INSERT INTO listings (user_id, title, description, category, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [user_id, title, description, category, "available"]
    );

    res.json(newListing.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


exports.getListings = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM listings");
    res.json(result.rows);
  } catch (err) {
    console.error("GET LISTINGS ERROR:", err);
    res.status(500).json({ error: err.message || "Database error" });
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
  const { title, description, category, status } = req.body;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE listings 
       SET title = $1, description = $2, category = $3, status = $4
       WHERE id = $5 AND user_id = $6 
       RETURNING *`,
      [title, description, category, status, id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Listing not found or unauthorized" });
    }

    res.json({
      message: "Listing updated",
      listing: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
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

  try {
    const existing = await pool.query(
      "SELECT * FROM interests WHERE user_id = $1 AND listing_id = $2",
      [user_id, listing_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Already interested" });
    }

    await pool.query(
      "INSERT INTO interests (user_id, listing_id) VALUES ($1, $2)",
      [user_id, listing_id]
    );

    res.json({ message: "Interest added!" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInterestedListings = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT listings.* 
       FROM interests
       JOIN listings ON interests.listing_id = listings.id
       WHERE interests.user_id = $1
       ORDER BY interests.created_at DESC`,
      [user_id]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
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