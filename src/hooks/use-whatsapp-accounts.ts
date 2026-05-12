import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type WhatsappAccount = {
  id: string;
  label: string | null;
  phone_number_id: string | null;
  display_phone_number: string | null;
  waba_id: string | null;
  business_id: string | null;
  status: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function useWhatsappAccounts() {
  return useQuery({
    queryKey: ["whatsapp_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as WhatsappAccount[];
    },
  });
}

export function useUpsertWhatsappAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (acc: Partial<WhatsappAccount> & { label: string; phone_number_id: string }) => {
      if (acc.id) {
        const { error } = await supabase
          .from("whatsapp_accounts")
          .update({
            label: acc.label,
            phone_number_id: acc.phone_number_id,
            display_phone_number: acc.display_phone_number ?? null,
            is_active: acc.is_active ?? true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", acc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("whatsapp_accounts").insert({
          label: acc.label,
          phone_number_id: acc.phone_number_id,
          display_phone_number: acc.display_phone_number ?? null,
          is_active: acc.is_active ?? true,
          status: "active",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp_accounts"] }),
  });
}

export function useDeleteWhatsappAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp_accounts"] }),
  });
}

export function useSetDefaultWhatsappAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Clear current default first (unique partial index requires this)
      const { error: clearErr } = await supabase
        .from("whatsapp_accounts")
        .update({ is_default: false })
        .eq("is_default", true);
      if (clearErr) throw clearErr;
      const { error } = await supabase
        .from("whatsapp_accounts")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp_accounts"] }),
  });
}
