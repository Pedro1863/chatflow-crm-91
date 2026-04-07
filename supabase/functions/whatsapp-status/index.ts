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

    // ── Flow 1: Link whatsapp_message_id to internal mensagem_id ──
    if (mensagemId && whatsappMessageId && !status) {
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

    // ── Flow 2: Update status by whatsapp_message_id ──
    if (whatsappMessageId && status) {
      const validStatuses = ["sent", "delivered", "read"];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: `status must be one of: ${validStatuses.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("mensagens")
        .update({ status })
        .eq("whatsapp_message_id", whatsappMessageId)
        .select("id");

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, action: "status_update", updated: data?.length || 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Neither flow matched ──
    return new Response(
      JSON.stringify({
        error: "Invalid payload. Send {mensagem_id, whatsapp_message_id} to link, or {whatsapp_message_id, status} to update status.",
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
