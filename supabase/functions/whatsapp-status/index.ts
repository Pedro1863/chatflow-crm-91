import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const body = await req.json();
    const mensagemId = body.mensagem_id;
    const whatsappMessageId = body.whatsapp_message_id || body.wamid;
    const status = body.status;
    const source = body.source; // "template" or undefined (defaults to "chat")

    // ── Flow 1: Link whatsapp_message_id to internal mensagem_id ──
    if (mensagemId && whatsappMessageId && !status) {
      if (source === "template") {
        // Link in logs_envio_template
        // Link in logs_envio_template and fetch customer_id + template_name
        const { data, error } = await supabase
          .from("logs_envio_template")
          .update({ whatsapp_message_id: whatsappMessageId })
          .eq("id", mensagemId)
          .select("id, telefone, customer_id, template_name");
        if (error) throw error;

        // Also link in the corresponding mensagens row (chat)
        if (data && data.length > 0) {
          const row = data[0];
          const telefone = row.telefone;
          if (telefone) {
            const { data: msgRows } = await supabase
              .from("mensagens")
              .select("id")
              .eq("telefone", telefone)
              .eq("direcao", "saida")
              .is("whatsapp_message_id", null)
              .ilike("mensagem", "[Template:%")
              .order("timestamp", { ascending: false })
              .limit(1);

            if (msgRows && msgRows.length > 0) {
              await supabase
                .from("mensagens")
                .update({ whatsapp_message_id: whatsappMessageId })
                .eq("id", msgRows[0].id);
            }
          }

          // ── Confirmed send: mark template_sent + insert template_sends ──
          if (row.customer_id && row.template_name) {
            const nowIso = new Date().toISOString();
            const today = nowIso.slice(0, 10);

            // Dedup: only insert if not already recorded today
            const { data: existingSend } = await supabase
              .from("template_sends")
              .select("id")
              .eq("customer_id", row.customer_id)
              .eq("template_name", row.template_name)
              .eq("sent_date", today)
              .limit(1);

            if (!existingSend || existingSend.length === 0) {
              await supabase.from("template_sends").insert({
                customer_id: row.customer_id,
                template_name: row.template_name,
                telefone: telefone,
                sent_date: today,
              });
            }

            await supabase
              .from("customer_zone_tracking")
              .update({
                template_sent: true,
                template_sent_at: nowIso,
                updated_at: nowIso,
              })
              .eq("customer_id", row.customer_id);
          }

          // Mark log as success now that n8n confirmed
          await supabase
            .from("logs_envio_template")
            .update({ status: "sucesso" })
            .eq("id", row.id);
        }

        return new Response(
          JSON.stringify({ success: true, action: "link_template", updated: data?.length || 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Link in mensagens (chat)
        const { data, error } = await supabase
          .from("mensagens")
          .update({ whatsapp_message_id: whatsappMessageId })
          .eq("id", mensagemId)
          .select("id");
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, action: "link", updated: data?.length || 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Flow 2: Update status by whatsapp_message_id ──
    if (whatsappMessageId && status) {
      const validStatuses = ["sent", "delivered", "read"];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: `status must be one of: ${validStatuses.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try mensagens first
      const { data: msgData, error: msgErr } = await supabase
        .from("mensagens")
        .update({ status })
        .eq("whatsapp_message_id", whatsappMessageId)
        .select("id");
      if (msgErr) throw msgErr;

      // Also try logs_envio_template
      const { data: tplData, error: tplErr } = await supabase
        .from("logs_envio_template")
        .update({ status })
        .eq("whatsapp_message_id", whatsappMessageId)
        .select("id");
      if (tplErr) throw tplErr;

      const totalUpdated = (msgData?.length || 0) + (tplData?.length || 0);

      return new Response(
        JSON.stringify({ success: true, action: "status_update", updated: totalUpdated }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Neither flow matched ──
    return new Response(
      JSON.stringify({
        error: "Invalid payload. Send {mensagem_id, whatsapp_message_id, source?} to link, or {whatsapp_message_id, status} to update status.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Status webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
