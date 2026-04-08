import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeBrazilPhoneE164 } from "../_shared/phone.ts";

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

    const rawTelefone = body.telefone || body.phone || body.from || body.wa_id;
    const mensagem = body.mensagem || body.message || body.text || body.body || "";
    const direcao = body.direcao || body.direction || "entrada";
    const vendedor = body.vendedor || body.seller || null;

    // Media fields
    const type = body.type || "text";
    const media_url = body.media_url || null;
    const media_id = body.media_id || null;
    const mime_type = body.mime_type || null;
    const file_name = body.file_name || null;

    if (!rawTelefone) {
      return new Response(JSON.stringify({ error: "telefone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const telefone = normalizeBrazilPhoneE164(rawTelefone);

    const { data: contatos } = await supabase
      .from("contatos")
      .select("*")
      .eq("telefone", telefone)
      .order("ultima_interacao", { ascending: false, nullsFirst: false })
      .limit(1);

    let contato = contatos && contatos.length > 0 ? contatos[0] : null;

    if (!contato) {
      const { data: novo, error: errContato } = await supabase
        .from("contatos")
        .insert({
          telefone,
          nome: body.nome || body.name || null,
          empresa: body.empresa || null,
          cidade: body.cidade || null,
          origem: body.origem || "WhatsApp",
        })
        .select()
        .single();
      if (errContato) throw errContato;
      contato = novo;
    }

    await supabase
      .from("contatos")
      .update({ ultima_interacao: new Date().toISOString() })
      .eq("id", contato.id);

    const { error: msgErr } = await supabase.from("mensagens").insert({
      contato_id: contato.id,
      telefone,
      mensagem: mensagem || (type !== "text" ? `[${type}]` : ""),
      direcao,
      vendedor,
      type,
      media_url,
      media_id,
      mime_type,
      file_name,
    });

    if (msgErr) throw msgErr;

    return new Response(
      JSON.stringify({ success: true, contato_id: contato.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
