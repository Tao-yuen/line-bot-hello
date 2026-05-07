const fs = require("fs");
const path = require("path");
const { loadRepoEnv } = require("./loadEnv");
const { createPool } = require("../db");

loadRepoEnv();

function readSqlFile(filename) {
  return fs.readFileSync(path.join(__dirname, "..", "sql", filename), "utf8");
}

async function runSqlFile(filename) {
  const sql = readSqlFile(filename);
  const pool = createPool();

  await pool.query(sql);
  console.log(`Completed ${filename}`);
}

async function main() {
  const command = process.argv[2];

  if (!command || !["init", "seed", "setup"].includes(command)) {
    console.error("Usage: node scripts/db-maintenance.js <init|seed|setup>");
    process.exitCode = 1;
    return;
  }

  try {
    const pool = createPool();

    if (command === "init") {
      await pool.query(readSqlFile("tires_schema.sql"));
      console.log("Completed tires_schema.sql");
      return;
    }

    if (command === "seed") {
      await pool.query(readSqlFile("tires_seed.sql"));
      console.log("Completed tires_seed.sql");
      return;
    }

    await pool.query(readSqlFile("tires_schema.sql"));
    console.log("Completed tires_schema.sql");
    await pool.query(readSqlFile("tires_seed.sql"));
    console.log("Completed tires_seed.sql");
  } catch (error) {
    console.error("Database maintenance failed:", error);
    process.exitCode = 1;
  } finally {
    const pool = createPool();
    if (pool) {
      await pool.end();
    }
  }
}

main();
