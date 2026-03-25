import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

export type AutomationSetting = {
  id: string;
  zone: string;
  enabled: boolean;
  updated_at: string;
};

export function useAutomationSettings() {
  const qc = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("realtime-automation-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_settings" }, () => {
        qc.invalidateQueries({ queryKey: ["automation_settings"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["automation_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_settings")
        .select("*")
        .order("zone");
      if (error) throw error;
      return data as AutomationSetting[];
    },
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ zone, enabled }: { zone: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("automation_settings")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("zone", zone);
      if (error) throw error;
    },
    onSuccess: (_, { zone, enabled }) => {
      const zoneLabels: Record<string, string> = {
        saudavel: "Saudáveis",
        em_risco: "Em Risco",
        inativo: "Inativos",
      };
      toast.success(`Automação ${zoneLabels[zone] || zone}: ${enabled ? "Ativada" : "Desativada"}`);
      qc.invalidateQueries({ queryKey: ["automation_settings"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar automação");
    },
  });
}

export function useRunAutomation() {
  return useMutation({
    mutationFn: async () => {
      // Edge function now reads webhook URL from system_settings table directly
      const { data, error } = await supabase.functions.invoke("retention-automation", {});
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Automação executada: ${data?.sent || 0} envios`);
    },
    onError: (err: any) => {
      toast.error(`Erro na automação: ${err.message}`);
    },
  });
}
