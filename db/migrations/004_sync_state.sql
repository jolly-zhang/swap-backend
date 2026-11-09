ALTER TABLE pool_transactions DROP CONSTRAINT IF EXISTS pool_transactions_type_check;
ALTER TABLE pool_transactions
  ADD CONSTRAINT pool_transactions_type_check
  CHECK (type IN ('buy', 'sell', 'mint', 'burn'));

CREATE TABLE IF NOT EXISTS sync_state (
  name text PRIMARY KEY,
  last_synced_block bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;
