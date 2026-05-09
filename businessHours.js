const { createPool } = require("./db");

const DEFAULT_BUSINESS_HOUR_LABELS = ["保養廠", "洗車廠", "驗車廠"];

async function listActiveBusinessHours() {
  const pool = createPool();
  const result = await pool.query(
    `
    SELECT
      service_key,
      label,
      hours_text,
      sort_order
    FROM business_hours
    WHERE is_active = true
    ORDER BY sort_order ASC, id ASC
    `
  );

  return result.rows;
}

async function findBusinessHoursByLabel(label) {
  if (!label) {
    return null;
  }

  const pool = createPool();
  const result = await pool.query(
    `
    SELECT
      service_key,
      label,
      hours_text,
      sort_order
    FROM business_hours
    WHERE is_active = true
      AND label = $1
    LIMIT 1
    `,
    [label]
  );

  return result.rows[0] || null;
}

module.exports = {
  DEFAULT_BUSINESS_HOUR_LABELS,
  findBusinessHoursByLabel,
  listActiveBusinessHours,
};
