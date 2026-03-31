import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWebhookUrlFromDb } from "@/hooks/use-system-settings";
import { toast } from "sonner";
import {
  getPhoneStatus,
  isValidBrazilPhoneE164,
  normalizeBrazilPhoneE164,
  type PhoneStatus,
} from "@/lib/phone";

export type TemplateSend = {
  id: string;
  customer_id: string;
  template_name: string;
  telefone: string;
  sent_date: string;
  sent_at: string;
};

export type SendResult = {
  success: boolean;
  telefone: string;
  nome: string | null;
  error?: string;
};

export type { PhoneStatus };

export const normalizePhone = normalizeBrazilPhoneE164;

export function isValidPhone(phone: string): boolean {
  return isValidBrazilPhoneE164(phone);
}

// Fetch with timeout (5 seconds)
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Log send attempt to logs_envio_template
async function logSendAttempt(params: {
  customer_id: string;
  telefone: string;
  template_name: string;
  status: "sucesso" | "erro";
  erro?: string;
}) {
  await supabase.from("logs_envio_template" as any).insert({
    customer_id: params.customer_id,
    telefone: params.telefone,
    template_name: params.template_name,
    status: params.status,
    erro: params.erro || null,
  });
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

// Send templates with full error handling, timeout, and logging
export function useSendTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      contacts: { customer_id: string; telefone: string; nome: string | null }[];
      template: string;
      webhookPath: string;
    }): Promise<SendResult[]> => {
      const webhookBase = await getWebhookUrlFromDb();
      if (!webhookBase) {
        throw new Error("WEBHOOK_NOT_CONFIGURED");
      }

      const url = webhookBase.replace(/\/$/, "") + "/" + params.webhookPath.replace(/^\//, "");
      const today = new Date().toISOString().slice(0, 10);
      const results: SendResult[] = [];

      for (const contact of params.contacts) {
        const normalizedPhone = normalizePhone(contact.telefone);

        if (!isValidPhone(normalizedPhone)) {
          const errorMsg = "Telefone inválido para envio em E.164 (+55...)";
          await logSendAttempt({
            customer_id: contact.customer_id,
            telefone: normalizedPhone || contact.telefone,
            template_name: params.template,
            status: "erro",
            erro: errorMsg,
          });
          results.push({
            success: false,
            telefone: normalizedPhone || contact.telefone,
            nome: contact.nome,
            error: errorMsg,
          });
          continue;
        }

        try {
          const res = await fetchWithTimeout(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telefone: normalizedPhone,
              nome: contact.nome || "",
              template: params.template,
              variaveis: [contact.nome || ""],
            }),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => `HTTP ${res.status}`);
            const errorMsg = `HTTP ${res.status}: ${errText.slice(0, 200)}`;
            await logSendAttempt({
              customer_id: contact.customer_id,
              telefone: normalizedPhone,
              template_name: params.template,
              status: "erro",
              erro: errorMsg,
            });
            results.push({ success: false, telefone: normalizedPhone, nome: contact.nome, error: errorMsg });
            continue;
          }

          // Record send in template_sends
          await supabase.from("template_sends").insert({
            customer_id: contact.customer_id,
            template_name: params.template,
            telefone: normalizedPhone,
            sent_date: today,
          });

          await supabase
            .from("customers")
            .update({ telefone: normalizedPhone })
            .eq("id", contact.customer_id)
            .neq("telefone", normalizedPhone);

          // Log success
          await logSendAttempt({
            customer_id: contact.customer_id,
            telefone: normalizedPhone,
            template_name: params.template,
            status: "sucesso",
          });

          results.push({ success: true, telefone: normalizedPhone, nome: contact.nome });
        } catch (err: any) {
          const errorMsg = err.name === "AbortError"
            ? "Timeout: servidor não respondeu em 5s"
            : err.message || "Erro desconhecido";

          await logSendAttempt({
            customer_id: contact.customer_id,
            telefone: normalizedPhone,
            template_name: params.template,
            status: "erro",
            erro: errorMsg,
          });

          results.push({ success: false, telefone: normalizedPhone, nome: contact.nome, error: errorMsg });
        }
      }

      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["template_sends"] });
    },
  });
}
