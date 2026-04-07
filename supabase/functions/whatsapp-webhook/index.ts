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

    if (!rawTelefone) {
      return new Response(JSON.stringify({ error: "telefone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize phone to match DB format (without +)
    const telefone = normalizeBrazilPhoneE164(rawTelefone);

    // Localizar contato pelo telefone (use limit(1) to handle duplicates gracefully)
    const { data: contatos } = await supabase
      .from("contatos")
      .select("*")
      .eq("telefone", telefone)
      .order("ultima_interacao", { ascending: false, nullsFirst: false })
      .limit(1);

    let contato = contatos && contatos.length > 0 ? contatos[0] : null;

    // Se não existe, criar com dados mínimos
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

    // Atualizar ultima_interacao do contato
    await supabase
      .from("contatos")
      .update({ ultima_interacao: new Date().toISOString() })
      .eq("id", contato.id);

    // Salvar mensagem
    const { error: msgErr } = await supabase.from("mensagens").insert({
      contato_id: contato.id,
      telefone,
      mensagem,
      direcao,
      vendedor,
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
