import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Contact = {
  id: string;
  phone: string;
  name: string | null;
  product_interest: string | null;
  sale_stage: string | null;
  purchase_preference: string | null;
  conversion_probability: string | null;
  notes: string | null;
  first_contact_at: string;
  last_message_at: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  contact_id: string;
  whatsapp_chat_id: string | null;
  is_active: boolean | null;
  unread_count: number | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
  contacts?: Contact;
};

export type Message = {
  id: string;
  conversation_id: string;
  contact_id: string;
  content: string;
  message_type: string | null;
  direction: string;
  whatsapp_message_id: string | null;
  status: string | null;
  created_at: string;
};

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Contact[];
    },
  });
}

export function useContact(id: string | null) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Contact;
    },
    enabled: !!id,
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, contacts(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { conversation_id: string; contact_id: string; content: string }) => {
      const { data, error } = await supabase
        .from("messages")
        .insert({ ...msg, direction: "outbound", status: "sent" })
        .select()
        .single();
      if (error) throw error;
      // Update conversation preview
      await supabase
        .from("conversations")
        .update({ last_message_preview: msg.content })
        .eq("id", msg.conversation_id);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.conversation_id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [contactsRes, convertedRes, messagesRes, eventsRes] = await Promise.all([
        supabase.from("contacts").select("*"),
        supabase.from("contacts").select("*").not("converted_at", "is", null),
        supabase.from("messages").select("*").gte("created_at", startOfMonth),
        supabase.from("sales_events").select("*"),
      ]);

      const contacts = contactsRes.data || [];
      const converted = convertedRes.data || [];
      const messages = messagesRes.data || [];
      const events = eventsRes.data || [];

      const monthLeads = contacts.filter(c => new Date(c.created_at) >= new Date(startOfMonth)).length;
      const conversionRate = contacts.length > 0 ? (converted.length / contacts.length * 100) : 0;

      // Product stats
      const productCounts: Record<string, number> = {};
      contacts.forEach(c => {
        if (c.product_interest) {
          productCounts[c.product_interest] = (productCounts[c.product_interest] || 0) + 1;
        }
      });
      const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
      const topProduct = sortedProducts[0]?.[0] || "N/A";
      const bottomProduct = sortedProducts[sortedProducts.length - 1]?.[0] || "N/A";

      // Stage counts
      const stageCounts: Record<string, number> = {};
      contacts.forEach(c => {
        const stage = c.sale_stage || "novo_lead";
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      });

      // Recompra
      const rebuyers = contacts.filter(c => c.converted_at && c.last_message_at && 
        new Date(c.last_message_at) > new Date(c.converted_at));
      const rebuyRate = converted.length > 0 ? (rebuyers.length / converted.length * 100) : 0;

      return {
        monthLeads,
        conversionRate: conversionRate.toFixed(1),
        topProduct,
        bottomProduct,
        totalContacts: contacts.length,
        totalConverted: converted.length,
        stageCounts,
        productCounts,
        rebuyRate: rebuyRate.toFixed(1),
        monthMessages: messages.length,
      };
    },
    refetchInterval: 30000,
  });
}
