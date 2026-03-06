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

    // Extract message data from n8n webhook payload
    const phone = body.phone || body.from || body.wa_id;
    const message = body.message || body.text || body.body || "";
    const messageId = body.message_id || body.id;
    const direction = body.direction || "inbound";

    if (!phone) {
      return new Response(JSON.stringify({ error: "phone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert contact
    let { data: contact } = await supabase
      .from("contacts")
      .select("*")
      .eq("phone", phone)
      .single();

    if (!contact) {
      const { data: newContact, error: contactErr } = await supabase
        .from("contacts")
        .insert({ phone, name: body.name || null })
        .select()
        .single();
      if (contactErr) throw contactErr;
      contact = newContact;
    }

    // Update last_message_at
    await supabase
      .from("contacts")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", contact.id);

    // Get or create conversation
    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("contact_id", contact.id)
      .eq("is_active", true)
      .single();

    if (!conversation) {
      const { data: newConv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          contact_id: contact.id,
          whatsapp_chat_id: body.chat_id || null,
          last_message_preview: message,
        })
        .select()
        .single();
      if (convErr) throw convErr;
      conversation = newConv;
    } else {
      await supabase
        .from("conversations")
        .update({
          last_message_preview: message,
          unread_count: (conversation.unread_count || 0) + (direction === "inbound" ? 1 : 0),
        })
        .eq("id", conversation.id);
    }

    // Insert message
    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      contact_id: contact.id,
      content: message,
      direction,
      whatsapp_message_id: messageId || null,
      message_type: body.type || "text",
    });

    if (msgErr) throw msgErr;

    return new Response(
      JSON.stringify({ success: true, contact_id: contact.id, conversation_id: conversation.id }),
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
