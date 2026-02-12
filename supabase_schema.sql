-- Create Profiles Table (Stores User Balance)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  balance numeric default 10000.00,
  start_balance numeric default 10000.00,
  created_at timestamptz default now()
);

-- Create Positions Table (Active Trades)
create table positions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  symbol text not null,
  side text not null, -- 'LONG' or 'SHORT'
  entry_price numeric not null,
  size numeric not null, -- Position Size in USDT (Margin * Leverage)
  leverage int not null,
  margin numeric not null, -- Collateral
  liquidation_price numeric not null,
  stop_loss numeric,
  take_profit numeric,
  created_at timestamptz default now()
);

-- Create Trade History Table (Closed Trades)
create table trade_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  symbol text not null,
  side text not null,
  entry_price numeric not null,
  exit_price numeric not null,
  pnl numeric not null, -- Realized PnL
  roi numeric not null, -- Return on Investment %
  closed_at timestamptz default now()
);

-- Enable RLS (Row Level Security) - Optional for demo but good practice
alter table profiles enable row level security;
alter table positions enable row level security;
alter table trade_history enable row level security;

-- Policies (Allow users to see only their own data)
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can view own positions" on positions for select using (auth.uid() = user_id);
create policy "Users can insert own positions" on positions for insert with check (auth.uid() = user_id);
create policy "Users can delete own positions" on positions for delete using (auth.uid() = user_id);

create policy "Users can view own history" on trade_history for select using (auth.uid() = user_id);
create policy "Users can insert own history" on trade_history for insert with check (auth.uid() = user_id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, balance)
  values (new.id, new.email, 10000.00);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
