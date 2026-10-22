import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Phone normalization (inline, no shared folder needed) ──
function normalizeBrazilPhoneE164(rawPhone: string | null | undefined): string {
  if (!rawPhone) return "";
  const trimmed = rawPhone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("bling_")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;
  if (/^55\d{11}$/.test(digits)) return digits;
  if (/^55\d{10}$/.test(digits)) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    if (/^[6-9]/.test(local)) return `55${ddd}9${local}`;
    return digits;
  }
  if (/^\d{11}$/.test(digits)) return `55${digits}`;
  if (/^\d{10}$/.test(digits)) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);
    if (/^[6-9]/.test(local)) return `55${ddd}9${local}`;
    return `55${digits}`;
  }
  return trimmed;
}
function isValidBrazilPhoneE164(phone: string | null | undefined): boolean {
  return /^55\d{10,11}$/.test(normalizeBrazilPhoneE164(phone));
}

function classifyHealth(lastOrderDate: string | null, referenceDate: Date): "saudavel" | "em_risco" | "inativo" {
  if (!lastOrderDate) return "inativo";
  const days = Math.floor((referenceDate.getTime() - new Date(lastOrderDate).getTime()) / 86400000);
  if (days <= 15) return "saudavel";
  if (days <= 30) return "em_risco";
  return "inativo";
}

const TEMPLATE_MAP: Record<string, string> = {
  saudavel: "template_saudaveis",
  em_risco: "tamplate_cliente_risco",
  inativo: "template_retencao_inativos",
};

// Limits
const N8N_TIMEOUT_MS = 30000;      // wait up to 30s for n8n
const INTERVAL_MS = 15000;         // 15s between sends
const TIME_BUDGET_MS = 90000;      // stop starting new sends after 90s, then continue in a new run
const MAX_HTTP_ATTEMPTS = 3;       // retries ONLY for clear HTTP errors, never for timeouts
const MAX_CHAIN = 100;             // safety: max chained runs per day

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  let chain = 0;
  try {
    const body = await req.json().catch(() => ({}));
    chain = Number(body?.chain || 0);
  } catch { /* ignore */ }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // 1. Enabled zones
    const { data: settings, error: settingsErr } = await supabase
      .from("automation_settings").select("zone, enabled");
    if (settingsErr) throw settingsErr;
    const enabledZones = new Set((settings || []).filter((s: any) => s.enabled).map((s: any) => s.zone));
    if (enabledZones.size === 0) {
      return json({ message: "No zones enabled", sent: 0 });
    }

    // 2. Customers
    const { data: customers, error: custErr } = await supabase
      .from("customers").select("id, nome, telefone, data_ultimo_pedido, data_conversao");
    if (custErr) throw custErr;
    const activeCustomers = (customers || []).filter((c: any) => c.data_conversao);

    // 3. Zone tracking
    const { data: tracking, error: trackErr } = await supabase.from("customer_zone_tracking").select("*");
    if (trackErr) throw trackErr;
    const trackingMap = new Map<string, any>();
    (tracking || []).forEach((t: any) => trackingMap.set(t.customer_id, t));

    // 4. Webhook URL
    const { data: webhookSetting, error: whErr } = await supabase
      .from("system_settings").select("value").eq("key", "n8n_webhook_url").maybeSingle();
    if (whErr) throw whErr;
    const webhookUrl = (webhookSetting?.value || "").replace(/\/$/, "");
    if (!webhookUrl) return json({ error: "n8n_webhook_url not configured" }, 500);

    // 5. Build pending list
    const results: { customer_id: string; zone: string; action: string }[] = [];
    const pendingSends: { customer_id: string; telefone: string; nome: string; zone: string }[] = [];

    for (const customer of activeCustomers) {
      const currentZone = classifyHealth(customer.data_ultimo_pedido, now);
      const existing = trackingMap.get(customer.id);
      const pending = { customer_id: customer.id, telefone: customer.telefone, nome: customer.nome || "", zone: currentZone };

      if (!existing) {
        await supabase.from("customer_zone_tracking").insert({
          customer_id: customer.id, current_zone: currentZone,
          zone_entered_at: now.toISOString(), template_sent: false,
        });
        if (enabledZones.has(currentZone)) pendingSends.push(pending);
      } else if (existing.current_zone !== currentZone) {
        await supabase.from("customer_zone_tracking").update({
          current_zone: currentZone, zone_entered_at: now.toISOString(),
          template_sent: false, template_sent_at: null, updated_at: now.toISOString(),
        }).eq("customer_id", customer.id);
        if (enabledZones.has(currentZone)) pendingSends.push(pending);
      } else if (!existing.template_sent && enabledZones.has(currentZone)) {
        pendingSends.push(pending);
      }
    }

    // 6. Send, respecting time budget
    let sentCount = 0;
    let failCount = 0;
    let processed = 0;
    let isFirstSend = true;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const markAttempted = async (customerId: string) => {
      // Marks the customer as handled so the next run never sends again,
      // even if the whatsapp-status confirmation arrives later.
      await supabase.from("customer_zone_tracking").update({
        template_sent: true, template_sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("customer_id", customerId);
    };

    for (const pending of pendingSends) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
      processed++;

      const phone = normalizeBrazilPhoneE164(pending.telefone);
      if (!isValidBrazilPhoneE164(phone)) {
        await markAttempted(pending.customer_id);
        results.push({ customer_id: pending.customer_id, zone: pending.zone, action: "invalid_phone" });
        continue;
      }
      const templateName = TEMPLATE_MAP[pending.zone];
      if (!templateName) continue;

      // Dedup: already sent today?
      const { data: alreadySent } = await supabase.from("template_sends").select("id")
        .eq("customer_id", pending.customer_id).eq("template_name", templateName)
        .eq("sent_date", today).limit(1);
      if (alreadySent && alreadySent.length > 0) {
        await markAttempted(pending.customer_id);
        results.push({ customer_id: pending.customer_id, zone: pending.zone, action: "already_sent_today" });
        continue;
      }

      let delivered = false;   // n8n accepted OR timed out (probably sent)
      let lastError = "";

      for (let attempt = 1; attempt <= MAX_HTTP_ATTEMPTS; attempt++) {
        if (!isFirstSend) await sleep(INTERVAL_MS);
        isFirstSend = false;

        const { data: logRow } = await supabase.from("logs_envio_template").insert({
          customer_id: pending.customer_id, telefone: phone, template_name: templateName,
          status: "pendente", erro: attempt > 1 ? `Tentativa ${attempt}/${MAX_HTTP_ATTEMPTS}` : null,
        }).select("id").single();
        const mensagemId = logRow?.id || null;

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telefone: phone, nome: pending.nome, template: templateName,
              variaveis: [pending.nome], mensagem_id: mensagemId, tentativa: attempt,
            }),
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!res.ok) {
            const errText = await res.text().catch(() => `HTTP ${res.status}`);
            lastError = `HTTP ${res.status}: ${errText.slice(0, 200)} (tentativa ${attempt}/${MAX_HTTP_ATTEMPTS})`;
            if (mensagemId) await supabase.from("logs_envio_template").update({ status: "erro", erro: lastError }).eq("id", mensagemId);
            continue; // clear error → retry
          }

          if (mensagemId) await supabase.from("logs_envio_template").update({ status: "sucesso" }).eq("id", mensagemId);
          delivered = true;
          break;
        } catch (err: any) {
          if (err?.name === "AbortError") {
            // n8n is slow but usually DID send. Never retry, to avoid duplicates.
            lastError = `Sem resposta do n8n em ${N8N_TIMEOUT_MS / 1000}s (sem nova tentativa para evitar duplicidade)`;
            if (mensagemId) await supabase.from("logs_envio_template").update({ status: "sucesso", erro: lastError }).eq("id", mensagemId);
            delivered = true;
            break;
          }
          lastError = `${err?.message || "Erro desconhecido"} (tentativa ${attempt}/${MAX_HTTP_ATTEMPTS})`;
          if (mensagemId) await supabase.from("logs_envio_template").update({ status: "erro", erro: lastError }).eq("id", mensagemId);
          continue;
        }
      }

      // Always mark as handled so a later run doesn't send again
      await markAttempted(pending.customer_id);

      if (!delivered) {
        failCount++;
        results.push({ customer_id: pending.customer_id, zone: pending.zone, action: `failed_after_${MAX_HTTP_ATTEMPTS}_attempts` });
        continue;
      }

      // Create message in chat
      try {
        let contatoId: string | null = null;
        const { data: existingContato } = await supabase.from("contatos").select("id")
          .eq("telefone", phone).limit(1).maybeSingle();
        if (existingContato) {
          contatoId = existingContato.id;
        } else {
          const { data: newContato } = await supabase.from("contatos").insert({
            telefone: phone, nome: pending.nome || null, status_funil: "novo_lead", origem: "template",
          }).select("id").single();
          contatoId = newContato?.id || null;
        }
        if (contatoId) {
          const { data: msgSetting } = await supabase.from("system_settings").select("value")
            .eq("key", `template_msg_${templateName}`).maybeSingle();
          const customMsg = msgSetting?.value?.trim();
          const messageText = customMsg || `[Template: ${templateName.replace(/_/g, " ")}]`;
          await supabase.from("mensagens").insert({
            contato_id: contatoId, telefone: phone, mensagem: messageText,
            direcao: "saida", vendedor: "automação", status: "sent",
          });
          await supabase.from("contatos").update({ ultima_interacao: new Date().toISOString() }).eq("id", contatoId);
        }
      } catch (chatErr) {
        console.error("Erro ao criar mensagem no chat:", chatErr);
      }

      sentCount++;
      results.push({ customer_id: pending.customer_id, zone: pending.zone, action: "sent" });
    }

    // 7. Continue in a new run if there are still customers left
    const remaining = pendingSends.length - processed;
    let continued = false;
    if (remaining > 0 && chain < MAX_CHAIN) {
      const nextCall = fetch(`${SUPABASE_URL}/functions/v1/retention-automation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify({ chain: chain + 1 }),
      }).catch((e) => console.error("Falha ao continuar automação:", e));
      // @ts-ignore EdgeRuntime exists on Supabase
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(nextCall);
      } else {
        await Promise.race([nextCall, sleep(3000)]);
      }
      continued = true;
    }

    return json({
      message: "Automation run completed",
      run: chain + 1,
      total_pending: pendingSends.length,
      processed_this_run: processed,
      remaining,
      continued,
      sent: sentCount,
      failed: failCount,
      details: results,
    });
  } catch (error) {
    console.error("Retention automation error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
