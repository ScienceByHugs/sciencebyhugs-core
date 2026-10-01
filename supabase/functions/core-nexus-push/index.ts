import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import postgres from "npm:postgres@3.4.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const lower = (v: unknown) => String(v || "").trim().toLowerCase();
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const pub = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!);
  const sec = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!);
  const userClient = createClient(url, pub.default, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url, sec.default, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Invalid session" }, 401);
  const role = lower(user.app_metadata?.role);
  if (!["owner", "admin"].includes(role)) return json({ error: "Core administrator access required" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}
  const action = clean(body.action || "list", 40);

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("app_push_subscriptions")
    .select("user_id")
    .eq("app", "nexus");
  if (subscriptionsError) return json({ error: "Could not load Nexus push subscriptions" }, 500);

  const subscribedIds = new Set((subscriptions || []).map(row => String(row.user_id)));

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id,auth_user_id,customer_number,first_name,last_name,email,account_status")
    .not("auth_user_id", "is", null)
    .order("customer_number", { ascending: true });
  if (profilesError) return json({ error: "Could not load Nexus customers" }, 500);

  const recipients = (profiles || []).map(profile => ({
    id: profile.id,
    authUserId: profile.auth_user_id,
    customerNumber: profile.customer_number,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    accountStatus: profile.account_status,
    pushEnabled: subscribedIds.has(String(profile.auth_user_id)),
  }));

  if (action === "list") {
    return json({
      success: true,
      recipients,
      subscribedCount: recipients.filter(r => r.pushEnabled).length,
    });
  }

  if (action !== "send") return json({ error: "Unsupported action" }, 400);

  const mode = clean(body.mode, 20);
  const customerId = clean(body.customerId, 80);
  const title = clean(body.title, 80);
  const message = clean(body.message, 240);
  const targetUrl = clean(body.url || "./", 300) || "./";

  if (!["all", "individual"].includes(mode)) return json({ error: "Choose all users or one customer" }, 400);
  if (!title || !message) return json({ error: "Title and message are required" }, 400);

  let targets = recipients.filter(r => r.pushEnabled && lower(r.accountStatus) === "active");
  if (mode === "individual") {
    if (!customerId) return json({ error: "Choose a customer" }, 400);
    targets = targets.filter(r => r.id === customerId);
    if (!targets.length) return json({ error: "That customer does not currently have Nexus push notifications enabled" }, 409);
  }

  if (!targets.length) return json({ error: "No eligible Nexus push recipients were found" }, 409);

  const eventKey = crypto.randomUUID();
  const payload = {
    title,
    body: message,
    url: targetUrl,
    tag: "core-custom-" + eventKey,
  };

  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
    prepare: false,
    max: 1,
    idle_timeout: 1,
    connect_timeout: 10,
  });
  try {
    for (const target of targets) {
      await sql`
        insert into private.app_push_queue(event_key,user_id,app,payload)
        values (${eventKey}, ${target.authUserId}::uuid, 'nexus', ${sql.json(payload)})
        on conflict do nothing
      `;
    }
  } catch (error) {
    console.error("Could not queue Nexus notifications", error);
    return json({ error: "Could not queue Nexus notifications" }, 500);
  } finally {
    await sql.end({ timeout: 1 });
  }

  const auditMetadata = {
    mode,
    customer_id: mode === "individual" ? customerId : null,
    recipient_count: targets.length,
    title,
    message_length: message.length,
    target_url: targetUrl,
  };
  const { error: auditError } = await admin.from("core_audit_events").insert({
    actor_user_id: user.id,
    actor_email: user.email || null,
    actor_role: role,
    action: "notification.nexus.send",
    entity_type: "push_notification",
    entity_id: eventKey,
    before_data: null,
    after_data: { title, message, mode },
    metadata: auditMetadata,
  });
  if (auditError) console.error("Notification audit insert failed", auditError.message);

  return json({
    success: true,
    queued: targets.length,
    recipients: targets.map(target => ({
      id: target.id,
      customerNumber: target.customerNumber,
      firstName: target.firstName,
      lastName: target.lastName,
      email: target.email,
    })),
  });
});