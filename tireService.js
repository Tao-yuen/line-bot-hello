const { createPool } = require("./db");

function getRandomLimit() {
  const min = 3;
  const max = 5;

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function findRandomTiresBySize(sizeStandard) {
  if (!sizeStandard) {
    return [];
  }

  const pool = createPool();
  const limit = getRandomLimit();

  const result = await pool.query(
    `
    SELECT
      id,
      brand,
      pattern,
      size_standard,
      load_index,
      speed_rating,
      price,
      image_url
    FROM tires
    WHERE size_standard = $1
      AND is_active = true
    ORDER BY RANDOM()
    LIMIT $2
    `,
    [sizeStandard, limit]
  );

  return result.rows;
}

module.exports = {
  findRandomTiresBySize,
};
