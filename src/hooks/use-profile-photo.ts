import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook that triggers profile photo fetch via n8n webhook
 * when a conversation is opened. n8n calls Meta API and sends
 * the photo URL back via the update-profile-photo edge function.
 */
export function useFetchProfilePhoto(contatoId: string | null, telefone: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!contatoId || !telefone) return;

    const fetchPhoto = async () => {
      try {
        // Get the webhook URL for photo fetching
        const { data: setting } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "n8n_photo_webhook_url")
          .maybeSingle();

        const webhookUrl = setting?.value;
        if (!webhookUrl) return; // Not configured, skip silently

        // Trigger n8n to fetch the profile photo
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contato_id: contatoId,
            telefone: telefone,
            // n8n will call back update-profile-photo edge function with the result
            callback_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-profile-photo`,
          }),
        });

        // After a short delay, invalidate to pick up the updated photo
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ["contato", contatoId] });
          qc.invalidateQueries({ queryKey: ["contatos"] });
        }, 3000);
      } catch (err) {
        console.error("Error triggering profile photo fetch:", err);
      }
    };

    fetchPhoto();
  }, [contatoId, telefone, qc]);
}
