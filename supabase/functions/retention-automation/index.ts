import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isValidBrazilPhoneE164, normalizeBrazilPhoneE164 } from "../_shared/phone.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zone classification: same logic as frontend
function classifyHealth(lastOrderDate: string | null, referenceDate: Date): "saudavel" | "em_risco" | "inativo" {
  if (!lastOrderDate) return "inativo";
  const diffMs = referenceDate.getTime() - new Date(lastOrderDate).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 15) return "saudavel";
  if (days <= 30) return "em_risco";
  return "inativo";
}

const TEMPLATE_MAP: Record<string, string> = {
  saudavel: "template_saudaveis",
  em_risco: "tamplate_cliente_risco",
  inativo: "template_retencao_inativos",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();

    // 1. Check which zones have automation enabled
    const { data: settings, error: settingsErr } = await supabase
      .from("automation_settings")
      .select("zone, enabled");
    if (settingsErr) throw settingsErr;

    const enabledZones = new Set(
      (settings || []).filter((s: any) => s.enabled).map((s: any) => s.zone)
    );

    if (enabledZones.size === 0) {
      return new Response(JSON.stringify({ message: "No zones enabled", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch all customers with their last order date
    const { data: customers, error: custErr } = await supabase
      .from("customers")
      .select("id, nome, telefone, data_ultimo_pedido, data_conversao");
    if (custErr) throw custErr;

    // Only consider customers with a conversion date (actual customers)
    const activeCustomers = (customers || []).filter((c: any) => c.data_conversao);

    // 3. Fetch current zone tracking
    const { data: tracking, error: trackErr } = await supabase
      .from("customer_zone_tracking")
      .select("*");
    if (trackErr) throw trackErr;

    const trackingMap = new Map<string, any>();
    (tracking || []).forEach((t: any) => trackingMap.set(t.customer_id, t));

    // 4. Get n8n webhook URL from system_settings table
    const { data: webhookSetting, error: whErr } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "n8n_webhook_url")
      .maybeSingle();
    if (whErr) throw whErr;
    const webhookUrl = webhookSetting?.value || "";

    // 5. Process each customer
    const results: { customer_id: string; zone: string; action: string }[] = [];
    const pendingSends: { customer_id: string; telefone: string; nome: string; zone: string }[] = [];

    for (const customer of activeCustomers) {
      const currentZone = classifyHealth(customer.data_ultimo_pedido, now);
      const existing = trackingMap.get(customer.id);

      if (!existing) {
        // First time tracking - insert current zone
        await supabase.from("customer_zone_tracking").insert({
          customer_id: customer.id,
          current_zone: currentZone,
          zone_entered_at: now.toISOString(),
          template_sent: false,
        });
        results.push({ customer_id: customer.id, zone: currentZone, action: "created" });

        // Queue template send if zone automation is enabled
        if (enabledZones.has(currentZone)) {
          pendingSends.push({
            customer_id: customer.id,
            telefone: customer.telefone,
            nome: customer.nome || "",
            zone: currentZone,
          });
        }
      } else if (existing.current_zone !== currentZone) {
        // Zone changed - update tracking and reset template_sent
        await supabase
          .from("customer_zone_tracking")
          .update({
            current_zone: currentZone,
            zone_entered_at: now.toISOString(),
            template_sent: false,
            template_sent_at: null,
            updated_at: now.toISOString(),
          })
          .eq("customer_id", customer.id);
        results.push({ customer_id: customer.id, zone: currentZone, action: "zone_changed" });

        // Queue template send if zone automation is enabled
        if (enabledZones.has(currentZone)) {
          pendingSends.push({
            customer_id: customer.id,
            telefone: customer.telefone,
            nome: customer.nome || "",
            zone: currentZone,
          });
        }
      } else if (!existing.template_sent && enabledZones.has(currentZone)) {
        // Same zone, template not yet sent - queue it
        pendingSends.push({
          customer_id: customer.id,
          telefone: customer.telefone,
          nome: customer.nome || "",
          zone: currentZone,
        });
      }
    }

    // 6. Send templates
    let sentCount = 0;
    let failCount = 0;

    for (const pending of pendingSends) {
      const phone = normalizeBrazilPhoneE164(pending.telefone);
      if (!isValidBrazilPhoneE164(phone)) {
        results.push({ customer_id: pending.customer_id, zone: pending.zone, action: "invalid_phone" });
        continue;
      }

      const templateName = TEMPLATE_MAP[pending.zone];
      if (!templateName) continue;

      // Check if we already sent this template today (dedup via template_sends)
      const today = now.toISOString().slice(0, 10);
      const { data: alreadySent } = await supabase
        .from("template_sends")
        .select("id")
        .eq("customer_id", pending.customer_id)
        .eq("template_name", templateName)
        .eq("sent_date", today)
        .limit(1);

      if (alreadySent && alreadySent.length > 0) {
        results.push({ customer_id: pending.customer_id, zone: pending.zone, action: "already_sent_today" });
        continue;
      }

      // Send via n8n webhook if URL provided
      if (webhookUrl) {
        // Insert log BEFORE sending to get mensagem_id
        const { data: logRow } = await supabase
          .from("logs_envio_template")
          .insert({
            customer_id: pending.customer_id,
            telefone: phone,
            template_name: templateName,
            status: "pendente",
          })
          .select("id")
          .single();

        const mensagemId = logRow?.id || null;

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const sendUrl = webhookUrl.replace(/\/$/, "");
          const res = await fetch(sendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telefone: phone,
              nome: pending.nome,
              template: templateName,
              variaveis: [pending.nome],
              mensagem_id: mensagemId,
            }),
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!res.ok) {
            const errText = await res.text().catch(() => `HTTP ${res.status}`);
            const errorMsg = `HTTP ${res.status}: ${errText.slice(0, 200)}`;
            if (mensagemId) {
              await supabase.from("logs_envio_template")
                .update({ status: "erro", erro: errorMsg })
                .eq("id", mensagemId);
            }
            failCount++;
            results.push({ customer_id: pending.customer_id, zone: pending.zone, action: "send_failed" });
            continue;
          }
        } catch (err: any) {
          const errorMsg = err.name === "AbortError"
            ? "Timeout: servidor não respondeu em 5s"
            : err.message || "Erro desconhecido";
          if (mensagemId) {
            await supabase.from("logs_envio_template")
              .update({ status: "erro", erro: errorMsg })
              .eq("id", mensagemId);
          }
          failCount++;
          results.push({ customer_id: pending.customer_id, zone: pending.zone, action: "send_error" });
          continue;
        }

        // Update log to success
        if (mensagemId) {
          await supabase.from("logs_envio_template")
            .update({ status: "sucesso" })
            .eq("id", mensagemId);
        }
      }

      // Record send in template_sends
      await supabase.from("template_sends").insert({
        customer_id: pending.customer_id,
        template_name: templateName,
        telefone: phone,
        sent_date: today,
      });

      // Mark as sent in zone tracking
      await supabase
        .from("customer_zone_tracking")
        .update({
          template_sent: true,
          template_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("customer_id", pending.customer_id);

      sentCount++;
      results.push({ customer_id: pending.customer_id, zone: pending.zone, action: "sent" });
    }

    return new Response(
      JSON.stringify({
        message: "Automation completed",
        total_customers: activeCustomers.length,
        sent: sentCount,
        failed: failCount,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Retention automation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
