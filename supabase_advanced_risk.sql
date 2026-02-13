-- Advanced risk controls: trailing SL, risk update, partial close

alter table positions add column if not exists trailing_sl_enabled boolean not null default false;
alter table positions add column if not exists trailing_sl_percent numeric;

alter table pending_orders add column if not exists trailing_sl_enabled boolean not null default false;
alter table pending_orders add column if not exists trailing_sl_percent numeric;

create or replace function public.update_position_risk(
  p_user_id uuid,
  p_position_id uuid,
  p_take_profit numeric default null,
  p_stop_loss numeric default null,
  p_trailing_sl_enabled boolean default false,
  p_trailing_sl_percent numeric default null
)
returns positions
language plpgsql
security definer
as $$
declare
  v_position positions;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  if p_take_profit is not null and p_take_profit <= 0 then
    raise exception 'Invalid TP';
  end if;

  if p_stop_loss is not null and p_stop_loss <= 0 then
    raise exception 'Invalid SL';
  end if;

  if p_trailing_sl_enabled and (p_trailing_sl_percent is null or p_trailing_sl_percent <= 0 or p_trailing_sl_percent > 50) then
    raise exception 'Invalid trailing percent';
  end if;

  update positions
  set take_profit = p_take_profit,
      stop_loss = p_stop_loss,
      trailing_sl_enabled = p_trailing_sl_enabled,
      trailing_sl_percent = case when p_trailing_sl_enabled then p_trailing_sl_percent else null end
  where id = p_position_id and user_id = p_user_id
  returning * into v_position;

  if v_position.id is null then
    raise exception 'Position not found';
  end if;

  return v_position;
end;
$$;

create or replace function public.close_position_partial_tx(
  p_user_id uuid,
  p_position_id uuid,
  p_exit_price numeric,
  p_close_percent numeric
)
returns positions
language plpgsql
security definer
as $$
declare
  v_position positions;
  v_fraction numeric;
  v_close_margin numeric;
  v_remain_margin numeric;
  v_close_size numeric;
  v_remain_size numeric;
  v_quantity_closed numeric;
  v_pnl numeric;
  v_roi numeric;
  v_balance numeric;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Unauthorized';
  end if;

  if p_exit_price <= 0 then
    raise exception 'Invalid exit price';
  end if;

  if p_close_percent <= 0 or p_close_percent > 100 then
    raise exception 'Invalid close percent';
  end if;

  select * into v_position
  from positions
  where id = p_position_id and user_id = p_user_id
  for update;

  if v_position.id is null then
    raise exception 'Position not found';
  end if;

  v_fraction := p_close_percent / 100.0;
  v_close_margin := v_position.margin * v_fraction;
  v_close_size := v_position.size * v_fraction;

  v_remain_margin := v_position.margin - v_close_margin;
  v_remain_size := v_position.size - v_close_size;

  v_quantity_closed := v_close_size / v_position.entry_price;

  if v_position.side = 'LONG' then
    v_pnl := (p_exit_price - v_position.entry_price) * v_quantity_closed;
  else
    v_pnl := (v_position.entry_price - p_exit_price) * v_quantity_closed;
  end if;

  v_roi := (v_pnl / nullif(v_close_margin, 0)) * 100;

  insert into trade_history (user_id, symbol, side, entry_price, exit_price, pnl, roi, closed_at)
  values (p_user_id, v_position.symbol, v_position.side, v_position.entry_price, p_exit_price, v_pnl, coalesce(v_roi,0), now());

  select balance into v_balance from profiles where id = p_user_id for update;
  if v_balance is null then
    raise exception 'Profile not found';
  end if;

  update profiles set balance = v_balance + v_close_margin + v_pnl where id = p_user_id;

  if v_remain_margin <= 0.000001 or v_remain_size <= 0.000001 then
    delete from positions where id = v_position.id;
    return null;
  end if;

  update positions
  set margin = v_remain_margin,
      size = v_remain_size
  where id = v_position.id
  returning * into v_position;

  return v_position;
end;
$$;

grant execute on function public.update_position_risk(uuid, uuid, numeric, numeric, boolean, numeric) to authenticated;
grant execute on function public.close_position_partial_tx(uuid, uuid, numeric, numeric) to authenticated;
