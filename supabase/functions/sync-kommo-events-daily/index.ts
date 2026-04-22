import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KOMMO_TOKEN = Deno.env.get("KOMMO_ACCESS_TOKEN")!;
const KOMMO_BASE = Deno.env.get("KOMMO_BASE_URL")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: "bronze" } });

async function kommoGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(KOMMO_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const resp = await fetch(url.toString(), {
    headers: { Authorization: "Bearer " + KOMMO_TOKEN },
  });
  if (resp.status === 204) return null;
  if (!resp.ok) throw new Error("Kommo " + resp.status + ": " + (await resp.text()));
  return resp.json();
}

async function syncUsers() {
  const data = await kommoGet("/api/v4/users");
  const users = data._embedded?.users ?? [];
  const records = users.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.rights?.is_admin ? "admin" : "user",
    synced_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("kommo_users").upsert(records, { onConflict: "id" });
  if (error) throw new Error("Supabase users: " + error.message);
  return records.length;
}

function transformEvents(events: any[]) {
  return events.map((e: any) => ({
    id: e.id,
    type: e.type,
    entity_id: e.entity_id,
    entity_type: e.entity_type,
    created_by: e.created_by,
    created_at: new Date(e.created_at * 1000).toISOString(),
    value_before: e.value_before,
    value_after: e.value_after,
    account_id: e.account_id,
  }));
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") ?? "1");
    const maxPages = Number(url.searchParams.get("maxPages") ?? "500");

    console.log("=== Sync Kommo Events -> bronze (days=" + days + ") ===");

    const usersCount = await syncUsers();
    console.log("Users: " + usersCount);

    const now = Math.floor(Date.now() / 1000);
    const startTs = now - days * 24 * 60 * 60;

    let totalUpserted = 0;
    let page = 1;

    // Streaming: upsert por página em vez de acumular tudo em memória + dedupe
    while (page <= maxPages) {
      const data = await kommoGet("/api/v4/events", {
        limit: "250",
        page: String(page),
        "filter[created_at][from]": String(startTs),
        "filter[created_at][to]": String(now),
      });
      if (!data) break;
      const events = data._embedded?.events ?? [];
      if (!events.length) break;

      const records = transformEvents(events);
      const { error } = await supabase
        .from("kommo_events_raw")
        .upsert(records, { onConflict: "id" });

      if (error) {
        console.error("Page " + page + " upsert error: " + error.message);
        return new Response(
          JSON.stringify({ error: error.message, totalUpserted, stoppedAtPage: page }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
      totalUpserted += records.length;
      console.log("Page " + page + ": " + records.length + " events (total: " + totalUpserted + ")");

      if (records.length < 250) break;
      if (page % 6 === 0) await new Promise((r) => setTimeout(r, 1000));
      else await new Promise((r) => setTimeout(r, 150));
      page++;
    }

    return new Response(
      JSON.stringify({
        message: "Sync concluido",
        events: totalUpserted,
        users: usersCount,
        lastPage: page,
        days,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
