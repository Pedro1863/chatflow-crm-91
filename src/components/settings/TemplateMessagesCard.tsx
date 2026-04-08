import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageSquare, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TEMPLATES = [
  { key: "template_aquisicao", label: "Aquisição — Novos Clientes", color: "text-chart-2" },
  { key: "template_retencao_ativos", label: "Retenção — Ativos", color: "text-primary" },
  { key: "tamplate_cliente_risco", label: "Retenção — Em Risco", color: "text-chart-3" },
  { key: "template_retencao_inativos", label: "Retenção — Inativos", color: "text-destructive" },
  { key: "template_saudaveis", label: "Automação — Saudáveis", color: "text-primary" },
];

function useTemplateMessages() {
  return useQuery({
    queryKey: ["template_messages"],
    queryFn: async () => {
      const keys = TEMPLATES.map((t) => `template_msg_${t.key}`);
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", keys);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((row) => {
        const templateKey = row.key.replace("template_msg_", "");
        map[templateKey] = row.value;
      });
      return map;
    },
  });
}

export default function TemplateMessagesCard() {
  const { data: saved, isLoading } = useTemplateMessages();
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (saved) setDrafts(saved);
  }, [saved]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", `template_msg_${key}`);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["template_messages"] });
      toast.success("Mensagem do template salva!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Mensagens dos Templates</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Cole aqui o texto de cada template. Essa mensagem aparecerá nas conversas quando um template for enviado.
        </p>
        {TEMPLATES.map((t) => {
          const draft = drafts[t.key] ?? "";
          const savedValue = saved?.[t.key] ?? "";
          const hasChanges = draft !== savedValue;

          return (
            <div key={t.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${t.color}`}>{t.label}</span>
                <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.key}</code>
              </div>
              <Textarea
                placeholder="Cole aqui o texto do template..."
                value={draft}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [t.key]: e.target.value }))}
                className="min-h-[60px] text-xs"
                rows={3}
              />
              {hasChanges && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate({ key: t.key, value: draft })}
                >
                  {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Salvar
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
