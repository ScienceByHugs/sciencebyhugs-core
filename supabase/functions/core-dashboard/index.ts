import { readWithRetry, transientRead } from "./read-retry.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const lower = (value: unknown) => String(value ?? "").toLowerCase();
const withinDays = (value: unknown, days: number) => {
  if (!value) return false;
  const when = new Date(String(value)).getTime();
  return Number.isFinite(when) && when >= Date.now() - days * 86400000;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!);
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || secretKeys.default;

  const userClient = createClient(supabaseUrl, publishableKeys.default, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Invalid session" }, 401);
  const role = lower(user.app_metadata?.role);
  if (!["owner", "admin"].includes(role)) return json({ error: "Core administrator access required" }, 403);

  const [ordersRes, profilesRes, invoicesRes, paymentsRes, referralsRes, rewardsRes, productsRes, membershipsRes, syncRes] = await Promise.all([
    readWithRetry(() => admin.from("orders").select("id,order_number,customer_id,status,payment_status,payment_method,total,created_at,updated_at,submitted_at,paid_at,ordered_at,shipped_at,delivered_at,delayed_at,cancelled_at").order("created_at",{ascending:false}).limit(1000)),
    readWithRetry(() => admin.from("profiles").select("id,customer_number,first_name,last_name,email,membership_id,account_status,created_at,last_login_at").limit(1000)),
    readWithRetry(() => admin.from("invoices").select("id,invoice_number,order_id,status,pdf_status,send_status,total,created_at,updated_at,sent_at").order("created_at",{ascending:false}).limit(1000)),
    readWithRetry(() => admin.from("payments").select("id,order_id,provider,amount,status,submitted_at,verified_at,paid_at,created_at").order("created_at",{ascending:false}).limit(1000)),
    readWithRetry(() => admin.from("referrals").select("id,referrer_id,status,referred_at,qualified_at,converted_at").limit(1000)),
    readWithRetry(() => admin.from("customer_rewards").select("id,customer_id,status,reward_type,reward_value,created_at").limit(1000)),
    readWithRetry(() => admin.from("products").select("id,active,featured,category_id,coa_url,storefront_status,updated_at").limit(1000)),
    readWithRetry(() => admin.from("memberships").select("id,name,slug").limit(100)),
    readWithRetry(() => admin.from("catalog_sync_runs").select("id,source,status,received_count,upserted_count,deactivated_count,error_message,started_at,completed_at").order("started_at",{ascending:false}).limit(1)),
  ]);

  const failures = [ordersRes,profilesRes,invoicesRes,paymentsRes,referralsRes,rewardsRes,productsRes,membershipsRes,syncRes].filter(r => r.error);
  if (failures.length) {
    console.error("core-dashboard reads failed", failures.map(result => ({ code: result.error?.code, status: result.status })));
    return json({ error: "Could not load dashboard data. Please try again.", retryable: failures.every(transientRead) }, 500);
  }

  const orders = ordersRes.data || [];
  const profiles = profilesRes.data || [];
  const invoices = invoicesRes.data || [];
  const payments = paymentsRes.data || [];
  const referrals = referralsRes.data || [];
  const rewards = rewardsRes.data || [];
  const products = productsRes.data || [];
  const memberships = membershipsRes.data || [];
  const reportableOrders = orders.filter(o => lower(o.status) !== "checkout_pending");
  const paidOrders = reportableOrders.filter(o => lower(o.payment_status) === "paid");
  const paidRevenue = paidOrders.reduce((sum,o) => sum + Number(o.total || 0), 0);
  const ordersByCustomer = new Map<string, number>();
  for (const order of reportableOrders) if (order.customer_id) ordersByCustomer.set(order.customer_id, (ordersByCustomer.get(order.customer_id) || 0) + 1);
  const paymentMix = new Map<string, { count:number; amount:number }>();
  for (const order of paidOrders) {
    const key = String(order.payment_method || "Unknown");
    const current = paymentMix.get(key) || { count:0, amount:0 };
    current.count += 1; current.amount += Number(order.total || 0);
    paymentMix.set(key,current);
  }
  const fulfillment = new Map<string, number>();
  for (const order of reportableOrders) fulfillment.set(lower(order.status) || "unknown", (fulfillment.get(lower(order.status) || "unknown") || 0) + 1);
  const membershipById = new Map(memberships.map(m => [String(m.id), String(m.name)]));
  const membershipMix = new Map<string, number>();
  for (const profile of profiles) {
    const name = profile.membership_id ? membershipById.get(String(profile.membership_id)) || "Unknown" : "No membership";
    membershipMix.set(name, (membershipMix.get(name) || 0) + 1);
  }
  const profileById = new Map(profiles.map(p => [String(p.id),p]));
  const topCustomers = [...ordersByCustomer.entries()].map(([id,count]) => {
    const profile = profileById.get(id);
    const customerOrders = paidOrders.filter(o => String(o.customer_id) === id);
    return {
      id,
      customer_number: profile?.customer_number || null,
      name: [profile?.first_name,profile?.last_name].filter(Boolean).join(" ") || "Customer",
      order_count: count,
      paid_spend: customerOrders.reduce((sum,o)=>sum+Number(o.total||0),0),
    };
  }).sort((a,b)=>b.paid_spend-a.paid_spend).slice(0,5);

  const attention = {
    awaiting_invoice_approval: invoices.filter(i => lower(i.status) === "awaiting_approval").length,
    ready_to_send: invoices.filter(i => lower(i.status) === "approved" && lower(i.pdf_status) === "created" && lower(i.send_status) !== "sent").length,
    payment_submitted: payments.filter(p => lower(p.status) === "submitted").length,
    delayed_orders: reportableOrders.filter(o => lower(o.status) === "delayed").length,
    active_unpaid_orders: reportableOrders.filter(o => !["paid","cancelled"].includes(lower(o.payment_status)) && lower(o.status) !== "cancelled").length,
    missing_coa: products.filter(p => p.active && !p.coa_url).length,
    uncategorized_products: products.filter(p => p.active && !p.category_id).length,
  };

  return json({
    success: true,
    generated_at: new Date().toISOString(),
    attention,
    business: {
      paid_revenue: paidRevenue,
      paid_orders: paidOrders.length,
      average_paid_order: paidOrders.length ? paidRevenue / paidOrders.length : 0,
      customers: profiles.length,
      active_customers: profiles.filter(p => lower(p.account_status) === "active").length,
      repeat_customers: [...ordersByCustomer.values()].filter(count => count > 1).length,
      new_customers_30d: profiles.filter(p => withinDays(p.created_at,30)).length,
      revenue_7d: paidOrders.filter(o => withinDays(o.paid_at || o.created_at,7)).reduce((s,o)=>s+Number(o.total||0),0),
      revenue_30d: paidOrders.filter(o => withinDays(o.paid_at || o.created_at,30)).reduce((s,o)=>s+Number(o.total||0),0),
      orders_7d: reportableOrders.filter(o => withinDays(o.created_at,7)).length,
      orders_30d: reportableOrders.filter(o => withinDays(o.created_at,30)).length,
    },
    operations: {
      fulfillment: Object.fromEntries(fulfillment),
      payment_mix: [...paymentMix.entries()].map(([method,value]) => ({ method, ...value })).sort((a,b)=>b.amount-a.amount),
      recent_orders: reportableOrders.slice(0,8),
    },
    customers: {
      membership_mix: [...membershipMix.entries()].map(([membership,count]) => ({ membership,count })).sort((a,b)=>b.count-a.count),
      referrals_total: referrals.length,
      qualified_referrals: referrals.filter(r => ["qualified","converted"].includes(lower(r.status))).length,
      available_rewards: rewards.filter(r => lower(r.status) === "available").length,
      top_customers: topCustomers,
    },
    catalog: {
      total: products.length,
      active: products.filter(p=>p.active).length,
      available: products.filter(p=>lower(p.storefront_status)==="available").length,
      featured: products.filter(p=>p.featured).length,
      with_coa: products.filter(p=>Boolean(p.coa_url)).length,
      missing_coa: attention.missing_coa,
      uncategorized: attention.uncategorized_products,
      latest_sync: syncRes.data?.[0] || null,
    },
  });
});

