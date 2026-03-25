import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useSystemSetting(key: string) {
  return useQuery({
    queryKey: ["system_settings", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return data?.value || "";
    },
  });
}

export function useUpdateSystemSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: ["system_settings", key] });
    },
  });
}

// Helper to get webhook URL (async, for use in mutations)
export async function getWebhookUrlFromDb(): Promise<string> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "n8n_webhook_url")
    .maybeSingle();
  if (error) throw error;
  return data?.value || "";
}
