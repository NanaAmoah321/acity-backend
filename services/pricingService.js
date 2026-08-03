const pool = require("../config/db");

async function getPricingInsight(category) {
  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS sample_size,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY price) AS low_price,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY price) AS median_price,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY price) AS high_price
    FROM listings
    WHERE category = $1
      AND status = 'sold'
      AND price > 0
      AND sold_at >= NOW() - INTERVAL '180 days'
    `,
    [category]
  );

  const data = result.rows[0];

  if (data.sample_size < 5) {
    return {
      available: false,
      message: "Not enough recent sold listings in this category for a reliable price suggestion."
    };
  }

  return {
    available: true,
    sampleSize: data.sample_size,
    suggestedPrice: Number(data.median_price),
    lowPrice: Number(data.low_price),
    highPrice: Number(data.high_price),
    message: `Based on ${data.sample_size} recently sold listings in this category.`
  };
}

module.exports = { getPricingInsight };