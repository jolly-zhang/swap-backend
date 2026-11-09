CREATE TABLE pool_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash text NOT NULL,
  log_index integer NOT NULL,
  block_number bigint NOT NULL,
  timestamp timestamptz NOT NULL,
  type text NOT NULL CHECK (type IN ('Swap', 'Burn')),
  wallet text NOT NULL,
  amount_eth numeric,
  amount_usdc numeric,
  amount_usd numeric,
  fee_usd numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tx_hash, log_index)
);

CREATE INDEX pool_transactions_timestamp_idx
  ON pool_transactions (timestamp DESC);

CREATE TABLE pool_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  volume_usd numeric NOT NULL DEFAULT 0,
  fee_usd numeric NOT NULL DEFAULT 0
);