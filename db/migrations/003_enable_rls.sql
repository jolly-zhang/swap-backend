-- 开启 RLS（拒绝 Supabase 前端 SDK 直接访问）
ALTER TABLE pool_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_daily_stats ENABLE ROW LEVEL SECURITY;