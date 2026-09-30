-- Rollback-only verification. No test notification can leave this transaction.
begin;
do $$
declare
  target public.orders%rowtype;
  customer_user uuid;
  staff_user uuid;
  other_user uuid;
  before_count integer;
begin
  select o.* into target from public.orders o join public.profiles p on p.id=o.customer_id
    where p.auth_user_id is not null limit 1;
  if target.id is null then raise exception 'A linked order is needed for this test'; end if;
  select auth_user_id into customer_user from public.profiles where id=target.customer_id;
  select id into staff_user from auth.users where lower(raw_app_meta_data->>'role') in ('owner','admin') limit 1;
  select id into other_user from auth.users where id<>customer_user limit 1;
  if staff_user is null or other_user is null then raise exception 'Staff and separate customer accounts required'; end if;
  insert into public.app_push_subscriptions(user_id,app,endpoint,p256dh,auth) values
    (customer_user,'nexus','https://fcm.googleapis.com/test/customer','test','test'),
    (staff_user,'core','https://fcm.googleapis.com/test/staff','test','test'),
    (other_user,'nexus','https://fcm.googleapis.com/test/unrelated','test','test');
  update public.orders set estimated_delivery_date=coalesce(estimated_delivery_date,current_date)+1 where id=target.id;
  if not exists(select 1 from private.app_push_queue where user_id=customer_user and app='nexus' and payload->>'body' like '%estimated delivery%') then raise exception 'Customer delivery-date alert missing'; end if;
  if exists(select 1 from private.app_push_queue where user_id=other_user and app='nexus' and payload->>'tag'='order-'||target.id) then raise exception 'Alert leaked to another customer'; end if;
  select count(*) into before_count from private.app_push_queue;
  update public.orders set estimated_delivery_date=estimated_delivery_date where id=target.id;
  if (select count(*) from private.app_push_queue)<>before_count then raise exception 'No-op update queued an alert'; end if;
  update public.orders set payment_status=case when payment_status='paid' then 'pending' else 'paid' end where id=target.id;
  if not exists(select 1 from private.app_push_queue where user_id=staff_user and app='core' and payload->>'body' like '%payment status%') then raise exception 'Staff payment alert missing'; end if;
  target.id := gen_random_uuid();
  target.order_number := 'PUSH-TEST-'||target.id;
  insert into public.orders select (target).*;
  if not exists(select 1 from private.app_push_queue where app='core' and payload->>'tag'='order-'||target.id and payload->>'body' like '%new order%') then raise exception 'New order alert missing'; end if;
  perform set_config('push_test.customer',customer_user::text,true);
  perform set_config('push_test.other',other_user::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('push_test.customer'),true);
do $$ begin
  if exists(select 1 from public.app_push_subscriptions where user_id<>auth.uid()) then raise exception 'RLS exposed another account subscription'; end if;
  if has_table_privilege('authenticated','public.app_push_subscriptions','INSERT') or has_table_privilege('authenticated','public.app_push_subscriptions','UPDATE') then raise exception 'Client can bypass endpoint validation'; end if;
  if has_table_privilege('authenticated','private.app_push_queue','SELECT') then raise exception 'Client can read internal queue'; end if;
end $$;
reset role;
rollback;
