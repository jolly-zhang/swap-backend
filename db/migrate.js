require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pool } = require("../src/db");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const applied = await client.query("SELECT filename FROM schema_migrations");
    const done = new Set(applied.rows.map((row) => row.filename));

    const dir = path.join(__dirname, "migrations");
    const files = fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const filename of files) {
      if (done.has(filename)) continue;

      const sql = fs.readFileSync(path.join(dir, filename), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [filename]
        );
        await client.query("COMMIT");
        console.log("已执行", filename);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
