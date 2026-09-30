create schema if not exists private;
create table public.app_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null check (app in ('core','nexus')),
  endpoint text not null check (length(endpoint) <= 4096),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_test_at timestamptz,
  unique(app, endpoint)
);
create index app_push_subscriptions_user_app on public.app_push_subscriptions(user_id,app);
alter table public.app_push_subscriptions enable row level security;
revoke all on public.app_push_subscriptions from anon, authenticated;
grant select,delete on public.app_push_subscriptions to authenticated;
grant all on public.app_push_subscriptions to service_role;
create policy app_push_select_own on public.app_push_subscriptions for select to authenticated using ((select auth.uid())=user_id);
create policy app_push_delete_own on public.app_push_subscriptions for delete to authenticated using ((select auth.uid())=user_id);

create table private.app_push_queue (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null check (app in ('core','nexus')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  attempts integer not null default 0,
  delivered_endpoints uuid[] not null default '{}',
  delivered_at timestamptz,
  unique(event_key,user_id,app)
);
alter table private.app_push_queue enable row level security;
revoke all on private.app_push_queue from public,anon,authenticated;
create index app_push_pending on private.app_push_queue(created_at) where delivered_at is null;

create or replace function private.queue_order_push() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  customer_auth uuid;
  event_key text := gen_random_uuid()::text;
  nexus_body text;
  core_body text;
begin
  if TG_OP='INSERT' then
    core_body := 'A new order is ready to review in CORE.';
    nexus_body := 'Your order has been received. Open NEXUS for details.';
  else
    if NEW.status is distinct from OLD.status then
      nexus_body := 'Your order status has changed. Open NEXUS for details.';
    elsif NEW.payment_status is distinct from OLD.payment_status then
      nexus_body := 'Your payment status has changed. Open NEXUS for details.';
    elsif NEW.estimated_delivery_date is distinct from OLD.estimated_delivery_date then
      nexus_body := case when NEW.estimated_delivery_date is null then 'Your estimated delivery date is being updated. Check NEXUS for details.'
        else 'Your estimated delivery date is now ' || to_char(NEW.estimated_delivery_date,'Mon DD, YYYY') || '.' end;
    end if;
    if NEW.payment_status is distinct from OLD.payment_status then
      core_body := 'An order payment status has changed. Open CORE to review.';
    end if;
  end if;
  if nexus_body is not null then
    select auth_user_id into customer_auth from public.profiles where id=NEW.customer_id;
    insert into private.app_push_queue(event_key,user_id,app,payload)
      select event_key,s.user_id,'nexus',jsonb_build_object('title','NEXUS · Order update','body',nexus_body,'url','?push=orders','tag','order-'||NEW.id)
      from public.app_push_subscriptions s where s.app='nexus' and s.user_id=customer_auth group by s.user_id
      on conflict do nothing;
  end if;
  if core_body is not null then
    insert into private.app_push_queue(event_key,user_id,app,payload)
      select event_key,s.user_id,'core',jsonb_build_object('title','CORE · Order alert','body',core_body,'url','#orders','tag','order-'||NEW.id)
      from public.app_push_subscriptions s join auth.users u on u.id=s.user_id
      where s.app='core' and lower(u.raw_app_meta_data->>'role') in ('owner','admin') group by s.user_id
      on conflict do nothing;
  end if;
  return NEW;
end;
$$;
revoke all on function private.queue_order_push() from public,anon,authenticated;
create trigger order_push_events after insert or update of status,payment_status,estimated_delivery_date
on public.orders for each row execute function private.queue_order_push();

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text,'ecosystem_push_cron_secret')
where not exists(select 1 from vault.secrets where name='ecosystem_push_cron_secret');
select cron.schedule('ecosystem-push-dispatch','* * * * *',$job$
  select net.http_post(
    url:='https://tkhcvmkejzaoervocnzk.supabase.co/functions/v1/app-push?action=dispatch',
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-key',(select decrypted_secret from vault.decrypted_secrets where name='ecosystem_push_cron_secret' limit 1)),
    body:='{}'::jsonb,timeout_milliseconds:=60000);
$job$);
select cron.schedule('ecosystem-push-cleanup','20 4 * * *',$job$
  delete from private.app_push_queue where created_at<now()-interval '7 days';
$job$);
