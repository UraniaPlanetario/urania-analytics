import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Grupos de refresh executados em paralelo dentro do grupo.
// Grupo 1: RPCs independentes. Grupo 2: RPCs que dependem de tabelas do grupo 1.
const GROUP_1 = [
  { name: "user_activities", rpc: "refresh_user_activities" },
  { name: "leads_movements", rpc: "refresh_leads_movements" },
  { name: "historico_mensagens", rpc: "refresh_historico_mensagens" },
  { name: "alteracao_campos", rpc: "refresh_alteracao_campos" },
  { name: "leads_consolidado", rpc: "refresh_leads_consolidado" },
];

// leads_closed depende de leads_movements (grupo 1)
// tempo_resposta depende de historico_mensagens (grupo 1)
const GROUP_2 = [
  { name: "leads_closed", rpc: "refresh_leads_closed" },
  { name: "tempo_resposta", rpc: "refresh_tempo_resposta" },
];

async function runRpc(t: { name: string; rpc: string }): Promise<string> {
  const t0 = Date.now();
  try {
    const { data, error } = await supabase.rpc(t.rpc);
    const dt = Date.now() - t0;
    if (error) {
      return `${t.name} FAILED (${dt}ms): ${error.message}`;
    }
    return `${t.name} (${dt}ms): ${data || "ok"}`;
  } catch (e) {
    const dt = Date.now() - t0;
    return `${t.name} EXCEPTION (${dt}ms): ${String(e)}`;
  }
}

Deno.serve(async (_req) => {
  try {
    console.log("=== Refresh Gold Tables (parallel) ===");
    const results: string[] = [];

    // Grupo 1: rodar em paralelo
    console.log("Group 1 starting (parallel)...");
    const g1 = await Promise.all(GROUP_1.map(runRpc));
    results.push(...g1);
    g1.forEach((r) => console.log(r));

    // Grupo 2: só após grupo 1 terminar
    console.log("Group 2 starting (parallel)...");
    const g2 = await Promise.all(GROUP_2.map(runRpc));
    results.push(...g2);
    g2.forEach((r) => console.log(r));

    const failed = results.filter((r) => r.includes("FAILED") || r.includes("EXCEPTION"));

    return new Response(
      JSON.stringify({
        message: failed.length === 0 ? "Refresh concluido" : "Refresh concluido com falhas",
        failures: failed.length,
        results,
      }),
      {
        status: failed.length === 0 ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
