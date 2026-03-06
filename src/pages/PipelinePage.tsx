import { useContacts, useUpdateContact } from "@/hooks/use-crm-data";
import { Badge } from "@/components/ui/badge";

const stageLabels: Record<string, string> = {
  novo_lead: "Novo Lead",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechamento: "Fechamento",
  pos_venda: "Pós-venda",
  perdido: "Perdido",
};

const stageColors: Record<string, string> = {
  novo_lead: "bg-chart-2/20 text-chart-2",
  qualificacao: "bg-chart-3/20 text-chart-3",
  proposta: "bg-chart-4/20 text-chart-4",
  negociacao: "bg-chart-1/20 text-chart-1",
  fechamento: "bg-primary/20 text-primary",
  pos_venda: "bg-primary/30 text-primary",
  perdido: "bg-destructive/20 text-destructive",
};

const stages = ["novo_lead", "qualificacao", "proposta", "negociacao", "fechamento", "pos_venda", "perdido"];

const PipelinePage = () => {
  const { data: contacts = [] } = useContacts();
  const updateContact = useUpdateContact();

  const contactsByStage = stages.reduce((acc, stage) => {
    acc[stage] = contacts.filter((c) => (c.sale_stage || "novo_lead") === stage);
    return acc;
  }, {} as Record<string, typeof contacts>);

  return (
    <div className="h-full p-6 overflow-x-auto">
      <h1 className="text-xl font-bold text-foreground mb-6">Pipeline de Vendas</h1>
      <div className="flex gap-4 min-w-max pb-4">
        {stages.map((stage) => (
          <div key={stage} className="w-64 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground">{stageLabels[stage]}</h3>
              <Badge variant="secondary" className="text-xs">
                {contactsByStage[stage].length}
              </Badge>
            </div>
            <div className="space-y-2">
              {contactsByStage[stage].map((contact) => (
                <div
                  key={contact.id}
                  className="bg-card border border-border rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">
                        {(contact.name || contact.phone)[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {contact.name || contact.phone}
                      </p>
                      <p className="text-xs text-muted-foreground">{contact.phone}</p>
                    </div>
                  </div>
                  {contact.product_interest && (
                    <Badge className={`text-xs ${stageColors[stage]}`}>
                      {contact.product_interest}
                    </Badge>
                  )}
                </div>
              ))}
              {contactsByStage[stage].length === 0 && (
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
