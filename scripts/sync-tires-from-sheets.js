const { loadRepoEnv } = require("./loadEnv");
const { createPool } = require("../db");
const { normalizeTireSize } = require("../tireSizeNormalizer");

loadRepoEnv();

const REQUIRED_COLUMNS = [
  "tire_code",
  "brand",
  "pattern",
  "size_standard",
  "load_index",
  "speed_rating",
  "price",
  "image_url",
  "is_active",
];

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current !== "" || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function canonicalHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeOptionalText(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizePrice(value) {
  const text = normalizeText(value).replace(/,/g, "");
  if (!text) {
    return null;
  }

  const numericValue = Number(text);
  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw new Error(`Invalid price: ${value}`);
  }

  return numericValue;
}

function normalizeBoolean(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) {
    return true;
  }

  if (["true", "1", "yes", "y"].includes(text)) {
    return true;
  }

  if (["false", "0", "no", "n"].includes(text)) {
    return false;
  }

  throw new Error(`Invalid is_active value: ${value}`);
}

function validateHeaders(headers) {
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !headers.includes(column)
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `Google Sheets 缺少必要欄位: ${missingColumns.join(", ")}`
    );
  }
}

function mapRowToTire(headers, row, rowNumber) {
  const data = {};
  headers.forEach((header, index) => {
    data[header] = row[index] || "";
  });

  const tireCode = normalizeText(data.tire_code).toUpperCase();
  const sizeStandard = normalizeTireSize(data.size_standard);

  if (!tireCode) {
    throw new Error(`Row ${rowNumber}: tire_code is required`);
  }

  if (!normalizeText(data.brand)) {
    throw new Error(`Row ${rowNumber}: brand is required`);
  }

  if (!normalizeText(data.pattern)) {
    throw new Error(`Row ${rowNumber}: pattern is required`);
  }

  if (!sizeStandard) {
    throw new Error(`Row ${rowNumber}: invalid size_standard "${data.size_standard}"`);
  }

  return {
    tire_code: tireCode,
    brand: normalizeText(data.brand),
    pattern: normalizeText(data.pattern),
    size_standard: sizeStandard,
    load_index: normalizeOptionalText(data.load_index),
    speed_rating: normalizeOptionalText(data.speed_rating),
    price: normalizePrice(data.price),
    image_url: normalizeOptionalText(data.image_url),
    is_active: normalizeBoolean(data.is_active),
  };
}

async function fetchSheetRows() {
  const csvUrl = process.env.GOOGLE_SHEETS_CSV_URL;
  if (!csvUrl) {
    throw new Error("GOOGLE_SHEETS_CSV_URL is not configured");
  }

  const response = await fetch(csvUrl, {
    headers: {
      "User-Agent": "line-bot-hello-sheet-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheets CSV: ${response.status}`);
  }

  const csvText = await response.text();
  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    throw new Error("Google Sheets CSV does not contain data rows");
  }

  const headers = rows[0].map(canonicalHeader);
  validateHeaders(headers);

  return rows.slice(1).map((row, index) => mapRowToTire(headers, row, index + 2));
}

async function upsertTires(pool, tires) {
  let insertedCount = 0;
  let updatedCount = 0;
  const syncedCodes = [];

  for (const tire of tires) {
    syncedCodes.push(tire.tire_code);

    const result = await pool.query(
      `
      INSERT INTO tires (
        tire_code,
        brand,
        pattern,
        size_standard,
        load_index,
        speed_rating,
        price,
        image_url,
        is_active,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (tire_code) DO UPDATE SET
        brand = EXCLUDED.brand,
        pattern = EXCLUDED.pattern,
        size_standard = EXCLUDED.size_standard,
        load_index = EXCLUDED.load_index,
        speed_rating = EXCLUDED.speed_rating,
        price = EXCLUDED.price,
        image_url = EXCLUDED.image_url,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
      RETURNING (xmax = 0) AS inserted
      `,
      [
        tire.tire_code,
        tire.brand,
        tire.pattern,
        tire.size_standard,
        tire.load_index,
        tire.speed_rating,
        tire.price,
        tire.image_url,
        tire.is_active,
      ]
    );

    if (result.rows[0].inserted) {
      insertedCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  return {
    insertedCount,
    updatedCount,
    syncedCodes,
  };
}

async function deactivateMissingTires(pool, syncedCodes) {
  if (String(process.env.SYNC_DEACTIVATE_MISSING || "").toLowerCase() !== "true") {
    return 0;
  }

  const result = await pool.query(
    `
    UPDATE tires
    SET is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE tire_code <> ALL($1::text[])
    `,
    [syncedCodes]
  );

  return result.rowCount;
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const tires = await fetchSheetRows();

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          totalRows: tires.length,
          sample: tires.slice(0, 3),
        },
        null,
        2
      )
    );
    return;
  }

  const pool = createPool();

  try {
    await pool.query("BEGIN");
    const { insertedCount, updatedCount, syncedCodes } = await upsertTires(pool, tires);
    const deactivatedCount = await deactivateMissingTires(pool, syncedCodes);
    await pool.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          totalRows: tires.length,
          insertedCount,
          updatedCount,
          deactivatedCount,
        },
        null,
        2
      )
    );
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Google Sheets sync failed:", error);
  process.exitCode = 1;
});
