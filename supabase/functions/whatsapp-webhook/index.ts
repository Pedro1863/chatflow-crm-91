import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Standalone phone normalization — no external imports
function normalizeBrazilPhoneE164(rawPhone: string | null | undefined): string {
  if (!rawPhone) return "";

  const trimmed = rawPhone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("bling_")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  // Already in correct format: 55 + DDD(2) + 9digits = 13 digits
  if (/^55\d{11}$/.test(digits)) return digits;

  // 55 + DDD(2) + 8 digits (mobile missing the leading 9)
  if (/^55\d{10}$/.test(digits)) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    if (/^[6-9]/.test(local)) {
      return `55${ddd}9${local}`;
    }
    return digits;
  }

  // Local number without country code: 11 digits (DDD + 9 + 8)
  if (/^\d{11}$/.test(digits)) return `55${digits}`;

  // Local number without country code: 10 digits (DDD + 8)
  if (/^\d{10}$/.test(digits)) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);
    if (/^[6-9]/.test(local)) {
      return `55${ddd}9${local}`;
    }
    return `55${digits}`;
  }

  return trimmed;
}


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
    const mensagem = body.mensagem || body.message || body.text || body.body || body.caption || "";
    const direcao = body.direcao || body.direction || "entrada";
    const vendedor = body.vendedor || body.seller || null;

    // Media fields
    const type = body.type || "text";
    const media_url = body.media_url || null;
    const media_id = body.media_id || null;
    const mime_type = body.mime_type || null;
    const file_name = body.file_name || null;

    // Reply context (when client taps "responder" on a message in WhatsApp)
    // Meta sends: messages[0].context.id with the original wamid
    const reply_to_wamid =
      body.reply_to_wamid ||
      body.context_id ||
      body?.context?.id ||
      body?.context?.message_id ||
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.context?.id ||
      null;

    // Original wamid of the message being sent (so we can match replies later)
    const whatsapp_message_id =
      body.whatsapp_message_id ||
      body.wamid ||
      body.message_id ||
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ||
      null;

    // WhatsApp account identification
    // Accept multiple shapes: top-level, or Meta's nested metadata
    const phoneNumberId =
      body.phone_number_id ||
      body.phoneNumberId ||
      body?.metadata?.phone_number_id ||
      body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ||
      null;

    if (!rawTelefone) {
      return new Response(JSON.stringify({ error: "telefone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const telefone = normalizeBrazilPhoneE164(rawTelefone);

    // Resolve account
    let whatsappAccountId: string | null = null;
    if (phoneNumberId) {
      const { data: acc } = await supabase
        .from("whatsapp_accounts")
        .select("id")
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();
      whatsappAccountId = acc?.id || null;
    }

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
          whatsapp_account_id: whatsappAccountId,
        })
        .select()
        .single();
      if (errContato) throw errContato;
      contato = novo;
    }

    const interactionAt = new Date().toISOString();
    let shouldResetCustomerStatus = false;

    if (direcao === "entrada" && contato.status_funil === "cliente") {
      const { data: customer } = await supabase
        .from("customers")
        .select("data_ultimo_pedido")
        .eq("telefone", telefone)
        .order("data_ultimo_pedido", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      const lastOrderAt = customer?.data_ultimo_pedido ? new Date(customer.data_ultimo_pedido).getTime() : null;
      shouldResetCustomerStatus = !!lastOrderAt && new Date(interactionAt).getTime() > lastOrderAt;
    }

    await supabase
      .from("contatos")
      .update({
        ultima_interacao: interactionAt,
        ...(shouldResetCustomerStatus ? { status_funil: "novo_lead" } : {}),
        ...(whatsappAccountId ? { whatsapp_account_id: whatsappAccountId } : {}),
      })
      .eq("id", contato.id);

    // Try to resolve internal id of the message being replied to
    let reply_to_id: string | null = null;
    if (reply_to_wamid) {
      const { data: orig } = await supabase
        .from("mensagens")
        .select("id")
        .eq("whatsapp_message_id", reply_to_wamid)
        .maybeSingle();
      reply_to_id = orig?.id || null;
    }

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
      whatsapp_account_id: whatsappAccountId,
      whatsapp_message_id,
      reply_to_wamid,
      reply_to_id,
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
