import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWebhookUrlFromDb } from "@/hooks/use-system-settings";
import { toast } from "sonner";

export type TemplateSend = {
  id: string;
  customer_id: string;
  template_name: string;
  telefone: string;
  sent_date: string;
  sent_at: string;
};

// Phone utilities
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = raw.replace(/[^0-9]/g, "");
  if (digits.length >= 10 && !digits.startsWith("55")) {
    digits = "55" + digits;
  }
  return digits;
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  // E.164 BR: 55 + DDD(2) + number(8-9) = 12 or 13 digits
  return /^55\d{10,11}$/.test(digits);
}

export type PhoneStatus = "valid" | "missing" | "invalid";

export function getPhoneStatus(phone: string | null | undefined): PhoneStatus {
  if (!phone || phone.trim() === "") return "missing";
  return isValidPhone(phone) ? "valid" : "invalid";
}

// Get today's sends to check duplicates
export function useTodaySends(templateName: string) {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["template_sends", templateName, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_sends")
        .select("*")
        .eq("template_name", templateName)
        .eq("sent_date", today);
      if (error) throw error;
      return data as TemplateSend[];
    },
  });
}

// Update customer phone
export function useUpdateCustomerPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, telefone }: { id: string; telefone: string }) => {
      const normalized = normalizePhone(telefone);
      const { error } = await supabase
        .from("customers")
        .update({ telefone: normalized })
        .eq("id", id);
      if (error) throw error;
      return { id, telefone: normalized };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// Send templates
export function useSendTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      contacts: { customer_id: string; telefone: string; nome: string | null }[];
      template: string;
      webhookPath: string;
    }) => {
      const webhookBase = getN8nWebhookUrl();
      if (!webhookBase) {
        throw new Error("URL do webhook n8n não configurada. Vá em Configurações para definir.");
      }

      const url = webhookBase.replace(/\/$/, "") + "/" + params.webhookPath.replace(/^\//, "");
      const today = new Date().toISOString().slice(0, 10);
      const results: { success: boolean; telefone: string; error?: string }[] = [];

      for (const contact of params.contacts) {
        try {
          // Send to n8n
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telefone: contact.telefone,
              nome: contact.nome || "",
              template: params.template,
              variaveis: [contact.nome || ""],
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            results.push({ success: false, telefone: contact.telefone, error: errText });
            continue;
          }

          // Record send
          await supabase.from("template_sends").insert({
            customer_id: contact.customer_id,
            template_name: params.template,
            telefone: contact.telefone,
            sent_date: today,
          });

          results.push({ success: true, telefone: contact.telefone });
        } catch (err: any) {
          results.push({ success: false, telefone: contact.telefone, error: err.message });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const ok = results.filter((r) => r.success).length;
      const fail = results.filter((r) => !r.success).length;
      if (ok > 0) toast.success(`${ok} template(s) enviado(s) com sucesso`);
      if (fail > 0) toast.error(`${fail} envio(s) falharam`);
      qc.invalidateQueries({ queryKey: ["template_sends"] });
    },
  });
}
