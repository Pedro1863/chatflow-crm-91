import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Status order: a status never goes backwards (e.g. a late "sent" never overwrites "read").
const RANK: Record<string, number> = { pendente: 0, sucesso: 0, erro: 0, sent: 1, delivered: 2, read: 3, failed: 2 };
function canApply(current: string | null | undefined, next: string): boolean {
  const cur = current || "";
  if (next === "failed") return cur !== "delivered" && cur !== "read";
  if (cur === "failed") return true; // a real delivery confirmation wins over failure
  return (RANK[next] ?? 0) > (RANK[cur] ?? 0);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const raw = await req.json();
    // n8n sometimes wraps the JSON inside a "body" key
    const body = (raw && typeof raw === "object" && raw.body && typeof raw.body === "object" && !Array.isArray(raw.body))
      ? raw.body
      : raw;
    const mensagemId = body.mensagem_id;
    const whatsappMessageId = body.whatsapp_message_id || body.wamid;
    const status = body.status;
    const source = body.source; // "template" or undefined (chat)
    const errorText: string | null =
      body.erro || body.error ||
      (Array.isArray(body.errors) && body.errors[0]
        ? `${body.errors[0].code ?? ""} ${body.errors[0].title ?? body.errors[0].message ?? ""}`.trim()
        : null);

    // Finds the chat message of a template send (created by the app, without Meta ID yet)
    const findTemplateChatMsg = async (telefone: string, createdAt?: string | null) => {
      let q = supabase.from("mensagens").select("id, status")
        .eq("telefone", telefone).eq("direcao", "saida").eq("vendedor", "automação")
        .is("whatsapp_message_id", null);
      if (createdAt) {
        const t = new Date(createdAt).getTime();
        q = q.gte("timestamp", new Date(t - 5 * 60000).toISOString())
             .lte("timestamp", new Date(t + 10 * 60000).toISOString());
      }
      const { data } = await q.order("timestamp", { ascending: false }).limit(1);
      return data && data.length > 0 ? data[0] : null;
    };

    // ── Flow 1: link Meta ID to internal ID ──
    if (mensagemId && whatsappMessageId && !status) {
      if (source === "template") {
        const { data, error } = await supabase
          .from("logs_envio_template")
          .update({ whatsapp_message_id: whatsappMessageId })
          .eq("id", mensagemId)
          .select("id, telefone, customer_id, template_name, status, created_at");
        if (error) throw error;

        if (data && data.length > 0) {
          const row = data[0];
          const telefone = row.telefone;

          // Link the chat message too (if the app already created it; otherwise the app copies the ID later)
          if (telefone) {
            const msg = await findTemplateChatMsg(telefone, row.created_at);
            if (msg) {
              await supabase.from("mensagens")
                .update({ whatsapp_message_id: whatsappMessageId }).eq("id", msg.id);
            }
          }

          if (row.customer_id && row.template_name) {
            const nowIso = new Date().toISOString();
            const today = nowIso.slice(0, 10);
            const { data: existingSend } = await supabase.from("template_sends").select("id")
              .eq("customer_id", row.customer_id).eq("template_name", row.template_name)
              .eq("sent_date", today).limit(1);
            if (!existingSend || existingSend.length === 0) {
              await supabase.from("template_sends").insert({
                customer_id: row.customer_id, template_name: row.template_name,
                telefone, sent_date: today,
              });
            }
            await supabase.from("customer_zone_tracking").update({
              template_sent: true, template_sent_at: nowIso, updated_at: nowIso,
            }).eq("customer_id", row.customer_id);
          }

          // Only mark "sucesso" if no delivery status arrived yet
          if (!row.status || ["pendente", "erro"].includes(row.status)) {
            await supabase.from("logs_envio_template").update({ status: "sucesso" }).eq("id", row.id);
          }
        }
        return json({ success: true, action: "link_template", updated: data?.length || 0 });
      }

      const { data, error } = await supabase.from("mensagens")
        .update({ whatsapp_message_id: whatsappMessageId }).eq("id", mensagemId).select("id");
      if (error) throw error;
      return json({ success: true, action: "link", updated: data?.length || 0 });
    }

    // ── Flow 2: status update by Meta ID ──
    if (whatsappMessageId && status) {
      const validStatuses = ["sent", "delivered", "read", "failed"];
      if (!validStatuses.includes(status)) {
        return json({ error: `status must be one of: ${validStatuses.join(", ")}` }, 400);
      }

      let updated = 0;

      // Chat messages
      const { data: msgs, error: msgErr } = await supabase.from("mensagens")
        .select("id, status").eq("whatsapp_message_id", whatsappMessageId);
      if (msgErr) throw msgErr;
      for (const m of msgs || []) {
        if (canApply(m.status, status)) {
          await supabase.from("mensagens").update({ status }).eq("id", m.id);
          updated++;
        }
      }

      // Template send log
      const { data: logs, error: logErr } = await supabase.from("logs_envio_template")
        .select("id, status, telefone, created_at").eq("whatsapp_message_id", whatsappMessageId);
      if (logErr) throw logErr;
      for (const l of logs || []) {
        if (canApply(l.status, status)) {
          const patch: Record<string, unknown> = { status };
          if (status === "failed") patch.erro = errorText || "Meta informou falha na entrega";
          await supabase.from("logs_envio_template").update(patch).eq("id", l.id);
          updated++;
        }
        // Self-heal: template log has the Meta ID but the chat message does not → link it now
        if ((!msgs || msgs.length === 0) && l.telefone) {
          const msg = await findTemplateChatMsg(l.telefone, l.created_at);
          if (msg) {
            const patch: Record<string, unknown> = { whatsapp_message_id: whatsappMessageId };
            if (canApply(msg.status, status)) patch.status = status;
            await supabase.from("mensagens").update(patch).eq("id", msg.id);
            updated++;
          }
        }
      }

      return json({ success: true, action: "status_update", updated });
    }

    return json({
      error: "Invalid payload. Send {mensagem_id, whatsapp_message_id, source?} to link, or {whatsapp_message_id, status} to update status.",
    }, 400);
  } catch (error) {
    console.error("Status webhook error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
