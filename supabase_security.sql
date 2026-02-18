-- Enable Row Level Security (RLS) on all tables
-- This is safe to run multiple times
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Positions
DROP POLICY IF EXISTS "Users can view own positions" ON public.positions;
CREATE POLICY "Users can view own positions" ON public.positions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own positions" ON public.positions;
CREATE POLICY "Users can insert own positions" ON public.positions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own positions" ON public.positions;
CREATE POLICY "Users can update own positions" ON public.positions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own positions" ON public.positions;
CREATE POLICY "Users can delete own positions" ON public.positions FOR DELETE USING (auth.uid() = user_id);

-- 3. Trade History
DROP POLICY IF EXISTS "Users can view own trade history" ON public.trade_history; -- Catch both naming conventions
DROP POLICY IF EXISTS "Users can view own history" ON public.trade_history;

CREATE POLICY "Users can view own trade history" ON public.trade_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trade history" ON public.trade_history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.trade_history;

CREATE POLICY "Users can insert own trade history" ON public.trade_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Pending Orders
DROP POLICY IF EXISTS "Users can view own pending orders" ON public.pending_orders;
CREATE POLICY "Users can view own pending orders" ON public.pending_orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own pending orders" ON public.pending_orders;
CREATE POLICY "Users can insert own pending orders" ON public.pending_orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending orders" ON public.pending_orders;
CREATE POLICY "Users can update own pending orders" ON public.pending_orders FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pending orders" ON public.pending_orders;
CREATE POLICY "Users can delete own pending orders" ON public.pending_orders FOR DELETE USING (auth.uid() = user_id);
