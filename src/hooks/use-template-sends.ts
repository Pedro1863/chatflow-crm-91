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

export type SendResult = {
  success: boolean;
  telefone: string;
  nome: string | null;
  error?: string;
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
  return /^55\d{10,11}$/.test(digits);
}

export type PhoneStatus = "valid" | "missing" | "invalid";

export function getPhoneStatus(phone: string | null | undefined): PhoneStatus {
  if (!phone || phone.trim() === "") return "missing";
  return isValidPhone(phone) ? "valid" : "invalid";
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
        try {
          const res = await fetchWithTimeout(url, {
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
            const errText = await res.text().catch(() => `HTTP ${res.status}`);
            const errorMsg = `HTTP ${res.status}: ${errText.slice(0, 200)}`;
            await logSendAttempt({
              customer_id: contact.customer_id,
              telefone: contact.telefone,
              template_name: params.template,
              status: "erro",
              erro: errorMsg,
            });
            results.push({ success: false, telefone: contact.telefone, nome: contact.nome, error: errorMsg });
            continue;
          }

          // Record send in template_sends
          await supabase.from("template_sends").insert({
            customer_id: contact.customer_id,
            template_name: params.template,
            telefone: contact.telefone,
            sent_date: today,
          });

          // Log success
          await logSendAttempt({
            customer_id: contact.customer_id,
            telefone: contact.telefone,
            template_name: params.template,
            status: "sucesso",
          });

          results.push({ success: true, telefone: contact.telefone, nome: contact.nome });
        } catch (err: any) {
          const errorMsg = err.name === "AbortError"
            ? "Timeout: servidor não respondeu em 5s"
            : err.message || "Erro desconhecido";

          await logSendAttempt({
            customer_id: contact.customer_id,
            telefone: contact.telefone,
            template_name: params.template,
            status: "erro",
            erro: errorMsg,
          });

          results.push({ success: false, telefone: contact.telefone, nome: contact.nome, error: errorMsg });
        }
      }

      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["template_sends"] });
    },
  });
}
