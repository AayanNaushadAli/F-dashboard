-- Transaction-safe trade functions for Supabase/Postgres

-- Optional hardening constraints
alter table profiles
  alter column balance set not null,
  alter column start_balance set not null;

alter table positions
  add constraint positions_margin_positive check (margin > 0),
  add constraint positions_size_positive check (size > 0),
  add constraint positions_leverage_range check (leverage between 1 and 50),
  add constraint positions_side_valid check (side in ('LONG', 'SHORT'));

create or replace function public.open_position_tx(
  p_user_id uuid,
  p_symbol text,
  p_side text,
  p_entry_price numeric,
  p_margin numeric,
  p_leverage int,
  p_take_profit numeric default null,
  p_stop_loss numeric default null
)
returns positions
language plpgsql
security definer
as $$
declare
  v_balance numeric;
  v_fee numeric;
  v_cost numeric;
  v_liq_price numeric;
  v_position positions;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  if p_margin <= 0 then
    raise exception 'Invalid margin';
  end if;

  if p_leverage < 1 or p_leverage > 50 then
    raise exception 'Invalid leverage';
  end if;

  if p_entry_price <= 0 then
    raise exception 'Invalid entry price';
  end if;

  if p_side not in ('LONG', 'SHORT') then
    raise exception 'Invalid side';
  end if;

  select balance into v_balance
  from profiles
  where id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'Profile not found';
  end if;

  v_fee := p_margin * 0.001;
  v_cost := p_margin + v_fee;

  if v_balance < v_cost then
    raise exception 'Insufficient Balance';
  end if;

  v_liq_price := case
    when p_side = 'LONG' then p_entry_price * (1 - 1::numeric / p_leverage + 0.005)
    else p_entry_price * (1 + 1::numeric / p_leverage - 0.005)
  end;

  update profiles
  set balance = v_balance - v_cost
  where id = p_user_id;

  insert into positions (
    user_id, symbol, side, entry_price, size, leverage, margin,
    liquidation_price, take_profit, stop_loss
  )
  values (
    p_user_id,
    p_symbol,
    p_side,
    p_entry_price,
    p_margin * p_leverage,
    p_leverage,
    p_margin,
    v_liq_price,
    p_take_profit,
    p_stop_loss
  )
  returning * into v_position;

  return v_position;
end;
$$;

create or replace function public.close_position_tx(
  p_user_id uuid,
  p_position_id uuid,
  p_exit_price numeric
)
returns trade_history
language plpgsql
security definer
as $$
declare
  v_position positions;
  v_quantity numeric;
  v_pnl numeric;
  v_roi numeric;
  v_return_amount numeric;
  v_balance numeric;
  v_history trade_history;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  if p_exit_price <= 0 then
    raise exception 'Invalid exit price';
  end if;

  select * into v_position
  from positions
  where id = p_position_id and user_id = p_user_id
  for update;

  if v_position.id is null then
    raise exception 'Position not found';
  end if;

  v_quantity := v_position.size / v_position.entry_price;

  if v_position.side = 'LONG' then
    v_pnl := (p_exit_price - v_position.entry_price) * v_quantity;
  else
    v_pnl := (v_position.entry_price - p_exit_price) * v_quantity;
  end if;

  v_roi := (v_pnl / v_position.margin) * 100;
  v_return_amount := v_position.margin + v_pnl;

  insert into trade_history (
    user_id, symbol, side, entry_price, exit_price, pnl, roi, closed_at
  )
  values (
    p_user_id,
    v_position.symbol,
    v_position.side,
    v_position.entry_price,
    p_exit_price,
    v_pnl,
    v_roi,
    now()
  )
  returning * into v_history;

  delete from positions
  where id = v_position.id;

  select balance into v_balance
  from profiles
  where id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'Profile not found';
  end if;

  update profiles
  set balance = v_balance + v_return_amount
  where id = p_user_id;

  return v_history;
end;
$$;

grant execute on function public.open_position_tx(uuid, text, text, numeric, numeric, int, numeric, numeric) to authenticated;
grant execute on function public.close_position_tx(uuid, uuid, numeric) to authenticated;
