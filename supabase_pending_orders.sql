-- Pending orders table for LIMIT/STOP functionality

create table if not exists pending_orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  symbol text not null default 'BTCUSDT',
  order_type text not null check (order_type in ('LIMIT', 'STOP')),
  side text not null check (side in ('LONG', 'SHORT')),
  trigger_price numeric not null check (trigger_price > 0),
  margin numeric not null check (margin > 0),
  leverage int not null check (leverage between 1 and 50),
  take_profit numeric,
  stop_loss numeric,
  created_at timestamptz default now()
);

alter table pending_orders enable row level security;

create policy "Users can view own pending orders"
  on pending_orders for select using (auth.uid() = user_id);

create policy "Users can insert own pending orders"
  on pending_orders for insert with check (auth.uid() = user_id);

create policy "Users can delete own pending orders"
  on pending_orders for delete using (auth.uid() = user_id);
