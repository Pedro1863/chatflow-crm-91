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

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET actions
    if (req.method === "GET") {
      if (action === "list_contacts") {
        const stage = url.searchParams.get("stage");
        let query = supabase.from("contacts").select("*").order("updated_at", { ascending: false });
        if (stage) query = query.eq("sale_stage", stage);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get_contact") {
        const id = url.searchParams.get("id");
        if (!id) throw new Error("id is required");
        const { data, error } = await supabase.from("contacts").select("*").eq("id", id).single();
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // POST actions
    if (req.method === "POST") {
      const body = await req.json();

      if (action === "update_stage") {
        const { contact_id, stage } = body;
        if (!contact_id || !stage) throw new Error("contact_id and stage are required");

        // Get current stage for event tracking
        const { data: current } = await supabase
          .from("contacts")
          .select("sale_stage")
          .eq("id", contact_id)
          .single();

        // Update stage
        const { data, error } = await supabase
          .from("contacts")
          .update({
            sale_stage: stage,
            ...(stage === "fechamento" ? { converted_at: new Date().toISOString() } : {}),
          })
          .eq("id", contact_id)
          .select()
          .single();
        if (error) throw error;

        // Log event
        await supabase.from("sales_events").insert({
          contact_id,
          from_stage: current?.sale_stage || null,
          to_stage: stage,
        });

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "update_contact") {
        const { contact_id, ...updates } = body;
        if (!contact_id) throw new Error("contact_id is required");
        const { data, error } = await supabase
          .from("contacts")
          .update(updates)
          .eq("id", contact_id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CRM API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
