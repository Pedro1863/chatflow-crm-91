import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useContatos, useUpdateContato } from "@/hooks/use-crm-data";
import { useRegisterLeadAttempt, useMarkLeadConverted } from "@/hooks/use-leads-actions";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const statusLabels: Record<string, string> = {
  novo_lead: "Sem Produto",
  contato_iniciado: "Contato Iniciado",
  proposta_enviada: "Proposta Enviada",
  cliente: "Cliente",
};

const statusColors: Record<string, string> = {
  novo_lead: "bg-chart-2/20 text-chart-2",
  contato_iniciado: "bg-chart-3/20 text-chart-3",
  proposta_enviada: "bg-chart-4/20 text-chart-4",
  cliente: "bg-primary/20 text-primary",
};

// Stages do funil. "Cliente" é preenchido automaticamente pelo RPC/Bling
// e reinicia para "Sem Produto" quando a pessoa manda uma nova mensagem.
const stages = ["novo_lead", "contato_iniciado", "proposta_enviada", "cliente"];

const stageToEtapa: Record<string, string> = {
  contato_iniciado: "primeiro_contato_sem_resposta",
  proposta_enviada: "proposta_sem_resposta",
};

// Busca data_conversao imutável de todos os customers para separar Novos vs Recompras
function useConversionMap() {
  return useQuery({
    queryKey: ["customers-conversion-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("telefone, data_conversao");
      if (error) throw error;
      const map = new Map<string, string>();
      (data || []).forEach((c: any) => {
        if (c.telefone && c.data_conversao) map.set(c.telefone, c.data_conversao);
      });
      return map;
    },
  });
}

const PipelinePage = () => {
  const { data: contatos = [] } = useContatos();
  const { data: conversionMap } = useConversionMap();
  const updateContato = useUpdateContato();
  const registerAttempt = useRegisterLeadAttempt();
  const markConverted = useMarkLeadConverted();
  const [tab, setTab] = useState<"novos" | "recompras">("novos");

  // Normaliza: 'cliente' volta para 'novo_lead' visualmente (ciclo reinicia após venda)
  const normalizedContatos = useMemo(
    () =>
      contatos.map((c) => ({
        ...c,
        _displayStage: stages.includes(c.status_funil) ? c.status_funil : "novo_lead",
        _isRecompra: !!conversionMap?.get(c.telefone),
      })),
    [contatos, conversionMap]
  );


  const filtered = normalizedContatos.filter((c) =>
    tab === "recompras" ? c._isRecompra : !c._isRecompra
  );

  const contatosByStage = stages.reduce((acc, stage) => {
    acc[stage] = filtered.filter((c) => c._displayStage === stage);
    return acc;
  }, {} as Record<string, typeof filtered>);

  const handleMoveToStage = async (contato: typeof filtered[0], newStage: string) => {
    const oldStage = contato._displayStage;
    if (oldStage === newStage) return;

    updateContato.mutate(
      { id: contato.id, status_funil: newStage },
      {
        onSuccess: () => {
          toast.success(`Movido para ${statusLabels[newStage]}`);
          if (newStage === "cliente") {
            markConverted.mutate({ telefone: contato.telefone, nome: contato.nome });
            return;
          }
          const etapa = stageToEtapa[newStage] || stageToEtapa[oldStage] || "primeiro_contato_sem_resposta";
          registerAttempt.mutate({
            telefone: contato.telefone,
            nome: contato.nome,
            etapa_pipeline: etapa,
            origem: contato.origem,
            salvo_manualmente: true,
            origem_tentativa: "pipeline",
          });
        },
      }
    );
  };


  const counts = {
    novos: normalizedContatos.filter((c) => !c._isRecompra).length,
    recompras: normalizedContatos.filter((c) => c._isRecompra).length,
  };

  const renderBoard = () => (
    <div className="flex gap-4 min-w-max pb-4">
      {stages.map((stage) => (
        <div key={stage} className="w-64 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-foreground">{statusLabels[stage]}</h3>
            <Badge variant="secondary" className="text-xs">
              {contatosByStage[stage].length}
            </Badge>
          </div>
          <div className="space-y-2">
            {contatosByStage[stage].map((contato) => (
              <div
                key={contato.id}
                className="bg-card border border-border rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">
                      {(contato.nome || contato.telefone)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-foreground">
                      {contato.nome || contato.telefone}
                    </p>
                    <p className="text-xs text-muted-foreground">{contato.telefone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  <Badge className={`text-xs ${statusColors[stage]}`}>
                    {contato._isRecompra ? "Recompra" : "Novo Lead"}
                  </Badge>
                  {contato.empresa && (
                    <span className="text-xs text-muted-foreground truncate">{contato.empresa}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {stages
                    .filter((s) => s !== stage)
                    .map((targetStage) => (
                      <button
                        key={targetStage}
                        onClick={() => handleMoveToStage(contato, targetStage)}
                        className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        → {statusLabels[targetStage]}
                      </button>
                    ))}
                  {stage !== "cliente" && (
                    <button
                      onClick={() => handleMoveToStage(contato, "cliente")}
                      className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                    >
                      ✓ Convertido
                    </button>
                  )}
                </div>

              </div>
            ))}
            {contatosByStage[stage].length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-lg">
                Sem contatos
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-full p-6 overflow-x-auto">
      <h1 className="text-xl font-bold text-foreground mb-4">Pipeline de Vendas</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="novos">Novos Leads ({counts.novos})</TabsTrigger>
          <TabsTrigger value="recompras">Recompras ({counts.recompras})</TabsTrigger>
        </TabsList>
        <TabsContent value="novos" className="mt-4">{renderBoard()}</TabsContent>
        <TabsContent value="recompras" className="mt-4">{renderBoard()}</TabsContent>
      </Tabs>
    </div>
  );
};

export default PipelinePage;
