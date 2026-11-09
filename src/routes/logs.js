const express = require("express");
const { pool } = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  const requested = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 50;
  const before = typeof req.query.before === "string" && req.query.before ? req.query.before : null;
  const beforeId = typeof req.query.beforeId === "string" && req.query.beforeId ? req.query.beforeId : null;

  const allowedTypes = new Set(["buy", "sell", "mint", "burn"]);
  const types = typeof req.query.types === "string" && req.query.types
    ? req.query.types.split(",").filter(Boolean)
    : null;

  if ((before && !beforeId) || (!before && beforeId)) {
    res.status(400).json({ error: "分页参数不完整" });
    return;
  }
  if (types && (types.length === 0 || types.some((type) => !allowedTypes.has(type)))) {
    res.status(400).json({ error: "类型参数不正确" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, tx_hash, block_number, timestamp, type, wallet,
              amount_eth, amount_usdc, amount_usd
       FROM pool_transactions
       WHERE (
           ($1::timestamptz IS NULL AND $2::uuid IS NULL)
           OR (timestamp, id) < ($1::timestamptz, $2::uuid)
         )
         AND ($4::text[] IS NULL OR type = ANY($4::text[]))
       ORDER BY timestamp DESC, id DESC
       LIMIT $3`,
      [before, beforeId, limit + 1, types]
    );
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    res.json({
      rows: page,
      hasMore,
      next: last
        ? {
            timestamp: last.timestamp instanceof Date ? last.timestamp.toISOString() : last.timestamp,
            id: last.id,
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "查询失败" });
  }
});

const VOLUME_RANGES = {
  "1h": { seconds: 300, count: 12, caption: "过去 1 小时" },
  "1d": { seconds: 3600, count: 24, caption: "过去 1 天" },
  "1w": { seconds: 86400, count: 7, caption: "过去 1 周" },
  "1m": { seconds: 86400, count: 30, caption: "过去 1 个月" },
  "1y": { caption: "过去 1 年" },
  all: { caption: "全部" },
};
// 获取固定时间范围内的交易量
const fixedVolumeSql = `
  WITH bounds AS (
    SELECT to_timestamp(floor(extract(epoch FROM now()) / $1) * $1) AS end_bucket
  ),
  series AS (
    SELECT generate_series(
      (SELECT end_bucket FROM bounds) - make_interval(secs => $1::int * ($2::int - 1)),
      (SELECT end_bucket FROM bounds),
      make_interval(secs => $1::int)
    ) AS bucket
  )
  SELECT series.bucket,
         COALESCE(SUM(t.amount_usd), 0)::float8 AS volume,
         COALESCE(SUM(t.fee_usd), 0)::float8 AS fee
  FROM series
  LEFT JOIN pool_transactions t
    ON t.type IN ('buy', 'sell')
   AND t.timestamp >= series.bucket
   AND t.timestamp < series.bucket + make_interval(secs => $1::int)
  GROUP BY series.bucket
  ORDER BY series.bucket
`;
// 获取过去一年的交易量
const yearVolumeSql = `
  WITH bounds AS (
    SELECT date_trunc('month', now()) AS end_bucket
  ),
  series AS (
    SELECT generate_series(
      (SELECT end_bucket FROM bounds) - interval '11 months',
      (SELECT end_bucket FROM bounds),
      interval '1 month'
    ) AS bucket
  )
  SELECT series.bucket,
         COALESCE(SUM(t.amount_usd), 0)::float8 AS volume,
         COALESCE(SUM(t.fee_usd), 0)::float8 AS fee
  FROM series
  LEFT JOIN pool_transactions t
    ON t.type IN ('buy', 'sell')
   AND t.timestamp >= series.bucket
   AND t.timestamp < series.bucket + interval '1 month'
  GROUP BY series.bucket
  ORDER BY series.bucket
`;
//
// 获取所有时间范围内的交易量
const allVolumeSql = `
  WITH bounds AS (
    SELECT date_trunc('day', MIN(timestamp)) AS start_bucket
    FROM pool_transactions
    WHERE type IN ('buy', 'sell')
  ),
  series AS (
    SELECT generate_series(
      start_bucket,
      date_trunc('day', now()),
      interval '1 day'
    ) AS bucket
    FROM bounds
    WHERE start_bucket IS NOT NULL
  )
  SELECT series.bucket,
         COALESCE(SUM(t.amount_usd), 0)::float8 AS volume,
         COALESCE(SUM(t.fee_usd), 0)::float8 AS fee
  FROM series
  LEFT JOIN pool_transactions t
    ON t.type IN ('buy', 'sell')
   AND t.timestamp >= series.bucket
   AND t.timestamp < series.bucket + interval '1 day'
  GROUP BY series.bucket
  ORDER BY series.bucket
`;

router.get("/volume", async (req, res) => {
  const range = VOLUME_RANGES[req.query.range] ? req.query.range : "1h";
  const spec = VOLUME_RANGES[range];
  try {
    const { rows } = spec.seconds
      ? await pool.query(fixedVolumeSql, [spec.seconds, spec.count])
      : await pool.query(range === "1y" ? yearVolumeSql : allVolumeSql);
    res.json({ range, caption: spec.caption, points: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "查询失败" });
  }
});

module.exports = router;