import { useContatos, useUpdateContato } from "@/hooks/use-crm-data";
import { useRegisterLeadAttempt, useMarkLeadConverted } from "@/hooks/use-leads-actions";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

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

// Map pipeline stages to lead attempt etapas
const stageToEtapa: Record<string, string> = {
  contato_iniciado: "primeiro_contato_sem_resposta",
  proposta_enviada: "proposta_sem_resposta",
};

const stages = ["novo_lead", "contato_iniciado", "proposta_enviada", "cliente"];

const PipelinePage = () => {
  const { data: contatos = [] } = useContatos();
  const updateContato = useUpdateContato();
  const registerAttempt = useRegisterLeadAttempt();
  const markConverted = useMarkLeadConverted();
  const qc = useQueryClient();

  const contatosByStage = stages.reduce((acc, stage) => {
    acc[stage] = contatos.filter((c) => c.status_funil === stage);
    return acc;
  }, {} as Record<string, typeof contatos>);

  const handleMoveToStage = async (contato: typeof contatos[0], newStage: string) => {
    const oldStage = contato.status_funil;
    if (oldStage === newStage) return;

    // Update the contato status
    updateContato.mutate(
      { id: contato.id, status_funil: newStage },
      {
        onSuccess: () => {
          toast.success(`Movido para ${statusLabels[newStage]}`);

          if (newStage === "cliente") {
            // Mark latest attempt as converted
            markConverted.mutate(contato.telefone);
          } else {
            // Register as pipeline attempt (only on intentional stage changes)
            const etapa = stageToEtapa[newStage] || stageToEtapa[oldStage] || "primeiro_contato_sem_resposta";
            registerAttempt.mutate({
              telefone: contato.telefone,
              nome: contato.nome,
              etapa_pipeline: etapa,
              origem: contato.origem,
              salvo_manualmente: true,
              origem_tentativa: "pipeline",
            });
          }
        },
      }
    );
  };

  return (
    <div className="h-full p-6 overflow-x-auto">
      <h1 className="text-xl font-bold text-foreground mb-6">Pipeline de Vendas</h1>
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {contato.nome || contato.telefone}
                      </p>
                      <p className="text-xs text-muted-foreground">{contato.telefone}</p>
                    </div>
                  </div>
                  {contato.empresa && (
                    <Badge className={`text-xs ${statusColors[stage]}`}>
                      {contato.empresa}
                    </Badge>
                  )}
                  {/* Stage transition buttons */}
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
    </div>
  );
};

export default PipelinePage;
