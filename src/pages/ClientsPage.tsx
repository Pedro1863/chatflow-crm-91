import { useContacts } from "@/hooks/use-crm-data";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const stageLabels: Record<string, string> = {
  novo_lead: "Novo Lead",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechamento: "Fechamento",
  pos_venda: "Pós-venda",
  perdido: "Perdido",
};

const ClientsPage = () => {
  const { data: contacts = [], isLoading } = useContacts();
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) => {
    const s = search.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(s) ||
      c.phone.toLowerCase().includes(s) ||
      (c.product_interest || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Clientes</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted border-0"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Telefone</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Produto</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Etapa</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Probabilidade</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium text-foreground">{c.name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{c.phone}</td>
                    <td className="p-3 text-muted-foreground">{c.product_interest || "—"}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {stageLabels[c.sale_stage || "novo_lead"]}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs capitalize">
                        {(c.conversion_probability || "media").replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {format(new Date(c.created_at), "dd/MM/yyyy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientsPage;
