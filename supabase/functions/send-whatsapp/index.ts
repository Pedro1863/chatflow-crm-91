import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { contato_id, telefone, mensagem, vendedor } = await req.json();

    if (!contato_id || !telefone || !mensagem) {
      return new Response(
        JSON.stringify({ error: "contato_id, telefone and mensagem are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to send via WhatsApp Cloud API if credentials are configured
    const whatsappToken = Deno.env.get("WHATSAPP_TOKEN");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_ID");

    if (whatsappToken && whatsappPhoneId) {
      // Format phone: remove + and spaces
      const formattedPhone = telefone.replace(/[\s+\-()]/g, "");

      const waResponse = await fetch(
        `https://graph.facebook.com/v21.0/${whatsappPhoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: "text",
            text: { body: mensagem },
          }),
        }
      );

      if (!waResponse.ok) {
        const waError = await waResponse.text();
        console.error("WhatsApp API error:", waError);
        // Continue to save the message even if WhatsApp fails
      }
    } else {
      console.log("WhatsApp credentials not configured - message saved to DB only");
    }

    // Save message to database
    const { data, error: msgErr } = await supabase
      .from("mensagens")
      .insert({
        contato_id,
        telefone,
        mensagem,
        direcao: "saida",
        vendedor: vendedor || null,
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    // Update ultima_interacao
    await supabase
      .from("contatos")
      .update({ ultima_interacao: new Date().toISOString() })
      .eq("id", contato_id);

    return new Response(
      JSON.stringify({ success: true, mensagem: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send WhatsApp error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
