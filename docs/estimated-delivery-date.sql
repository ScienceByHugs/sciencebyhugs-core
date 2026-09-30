-- Applied to the shared CORE/NEXUS database through migration orders_estimated_delivery_date.
alter table public.orders add column if not exists estimated_delivery_date date;
comment on column public.orders.estimated_delivery_date is 'Calendar date entered by CORE administrators and displayed as an estimate in NEXUS.';
