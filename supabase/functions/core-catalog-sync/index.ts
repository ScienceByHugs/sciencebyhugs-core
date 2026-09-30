import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const allowedOrigins = new Set([
  "https://core.sciencebyhugs.com",
  "https://sciencebyhugs.github.io",
]);

const corsFor = (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  const allowOrigin = allowedOrigins.has(origin) ? origin : "https://core.sciencebyhugs.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });

const lower = (value: unknown) => String(value ?? "").trim().toLowerCase();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(req, { error: "Authentication required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!);
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!);

  const userClient = createClient(supabaseUrl, publishableKeys.default, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const admin = createClient(supabaseUrl, secretKeys.default, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json(req, { error: "Invalid session" }, 401);

  const role = lower(user.app_metadata?.role);
  if (!["owner", "admin"].includes(role)) {
    return json(req, { error: "Core administrator access required" }, 403);
  }

  const { data: configRow, error: configError } = await admin
    .from("internal_runtime_config")
    .select("value")
    .eq("key", "checkout")
    .maybeSingle();

  if (configError || !configRow?.value) {
    return json(req, { error: "Catalog sync configuration is unavailable" }, 500);
  }

  const config = configRow.value as Record<string, unknown>;
  const catalogSyncUrl = String(config.catalogSyncUrl || "").trim();

  if (!catalogSyncUrl) {
    return json(req, { error: "Catalog sync URL is not configured" }, 500);
  }

  const endpoint = new URL(catalogSyncUrl);
  if (endpoint.protocol !== "https:" || endpoint.hostname !== "script.google.com" || !/^\/macros\/s\/[^/]+\/exec$/.test(endpoint.pathname)) {
    return json(req, { error: "Catalog sync must use a deployed Google Apps Script URL" }, 500);
  }
  endpoint.searchParams.set("api", "syncCatalog");
  const requestedAt = new Date().toISOString();

  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestedBy: user.email || user.id,
        requestedAt,
        bridgeKey: secretKeys.default,
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(90000),
    });
  } catch {
    return json(req, { success: false, error: "Could not reach the catalog sync bridge" }, 200);
  }

  const raw = await response.text();
  let payload: Record<string, unknown> = {};

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { message: raw.slice(0, 500) };
  }

  if (!response.ok || payload.success !== true) {
    const rawError = String(payload.error || "Catalog sync bridge did not return a successful JSON response");
    const bridgeError = /unknown post api|unsupported request/i.test(rawError)
      ? "The Google Apps Script deployment does not include the catalog sync route. Deploy the catalog bridge and update CORE's catalog sync URL."
      : rawError;
    console.error("Catalog sync bridge failure", {
      status: response.status,
      error: bridgeError,
      contentType: response.headers.get("content-type") || "",
    });

    return json(req, {
      success: false,
      error: bridgeError,
      bridgeStatus: response.status,
      stage: "apps_script_bridge",
    }, 200);
  }

  const { data: latestRun } = await admin
    .from("catalog_sync_runs")
    .select("id,status,received_count,upserted_count,deactivated_count,started_at,completed_at,error_message")
    .gte("started_at", requestedAt)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestRun) {
    return json(req, { success: false, error: "The bridge responded, but no completed catalog sync was recorded. Check the Apps Script deployment." });
  }

  return json(req, {
    success: true,
    sync: latestRun || null,
    bridge: payload,
  });
});