-- Additional order features: reduce-only pending orders

alter table pending_orders add column if not exists reduce_only boolean not null default false;
