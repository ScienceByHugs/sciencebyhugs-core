grant usage on schema private to service_role;
grant all on private.app_push_queue to service_role;
create policy app_push_queue_service on private.app_push_queue for all to service_role using (true) with check (true);
