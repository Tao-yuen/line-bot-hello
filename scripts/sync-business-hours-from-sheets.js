const { loadRepoEnv } = require("./loadEnv");
const { createPool } = require("../db");

loadRepoEnv();

const REQUIRED_COLUMNS = [
  "service_key",
  "label",
  "hours_text",
  "sort_order",
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

function normalizeSortOrder(value) {
  const text = normalizeText(value);
  if (!text) {
    return 0;
  }

  const numericValue = Number(text);
  if (!Number.isInteger(numericValue)) {
    throw new Error(`Invalid sort_order: ${value}`);
  }

  return numericValue;
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

function mapRow(headers, row, rowNumber) {
  const data = {};
  headers.forEach((header, index) => {
    data[header] = row[index] || "";
  });

  const serviceKey = normalizeText(data.service_key).toLowerCase();
  const label = normalizeText(data.label);
  const hoursText = normalizeText(data.hours_text);

  if (!serviceKey) {
    throw new Error(`Row ${rowNumber}: service_key is required`);
  }

  if (!label) {
    throw new Error(`Row ${rowNumber}: label is required`);
  }

  if (!hoursText) {
    throw new Error(`Row ${rowNumber}: hours_text is required`);
  }

  return {
    service_key: serviceKey,
    label,
    hours_text: hoursText,
    sort_order: normalizeSortOrder(data.sort_order),
    is_active: normalizeBoolean(data.is_active),
  };
}

async function fetchSheetRows() {
  const csvUrl = process.env.GOOGLE_SHEETS_BUSINESS_HOURS_CSV_URL;
  if (!csvUrl) {
    throw new Error("GOOGLE_SHEETS_BUSINESS_HOURS_CSV_URL is not configured");
  }

  const response = await fetch(csvUrl, {
    headers: {
      "User-Agent": "line-bot-hello-business-hours-sync/1.0",
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

  return rows.slice(1).map((row, index) => mapRow(headers, row, index + 2));
}

async function upsertBusinessHours(pool, items) {
  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of items) {
    const result = await pool.query(
      `
      INSERT INTO business_hours (
        service_key,
        label,
        hours_text,
        sort_order,
        is_active,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (service_key) DO UPDATE SET
        label = EXCLUDED.label,
        hours_text = EXCLUDED.hours_text,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
      RETURNING (xmax = 0) AS inserted
      `,
      [
        item.service_key,
        item.label,
        item.hours_text,
        item.sort_order,
        item.is_active,
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
  };
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const items = await fetchSheetRows();

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          totalRows: items.length,
          sample: items.slice(0, 3),
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
    const { insertedCount, updatedCount } = await upsertBusinessHours(pool, items);
    await pool.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          totalRows: items.length,
          insertedCount,
          updatedCount,
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
  console.error("Google Sheets business-hours sync failed:", error);
  process.exitCode = 1;
});
