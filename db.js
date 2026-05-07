let PgPool = null;
let pgLoadError = null;

try {
  ({ Pool: PgPool } = require("pg"));
} catch (error) {
  pgLoadError = error;
}

let pool = null;

function shouldUseSsl() {
  return String(process.env.DATABASE_SSL || "").toLowerCase() === "true";
}

function createPool() {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!PgPool) {
    const message = pgLoadError
      ? pgLoadError.message
      : "pg package is not installed";
    throw new Error(`PostgreSQL client is unavailable: ${message}`);
  }

  pool = new PgPool({
    connectionString: databaseUrl,
    allowExitOnIdle: true,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  });

  pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error);
  });

  return pool;
}

function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL && PgPool);
}

module.exports = {
  createPool,
  hasDatabaseConfig,
};
