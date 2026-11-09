//负责连接池
const { Pool } = require("pg");
require("dotenv").config();          // ← 加这行，确保 .env 已加载

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("缺少 DATABASE_URL");

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

module.exports = { pool };