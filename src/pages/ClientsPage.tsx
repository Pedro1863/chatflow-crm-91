import { useContatos } from "@/hooks/use-crm-data";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  novo_lead: "Sem Produto",
  contato_iniciado: "Contato Iniciado",
  proposta_enviada: "Proposta Enviada",
  cliente: "Cliente",
};

const ClientsPage = () => {
  const { data: contatos = [], isLoading } = useContatos();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = contatos.filter((c) => {
    const s = search.toLowerCase();
    const matchSearch =
      (c.nome || "").toLowerCase().includes(s) ||
      c.telefone.toLowerCase().includes(s);
    const matchStatus = !statusFilter || c.status_funil === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Contatos</h1>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm bg-muted text-foreground rounded-md px-3 py-2 border-0 outline-none"
          >
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted border-0"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Telefone</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Empresa</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Última Interação</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhum contato encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium text-foreground">{c.nome || "—"}</td>
                    <td className="p-3 text-muted-foreground">{c.telefone}</td>
                    <td className="p-3 text-muted-foreground">{c.empresa || "—"}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {statusLabels[c.status_funil] || c.status_funil}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {c.ultima_interacao
                        ? format(new Date(c.ultima_interacao), "dd/MM/yyyy HH:mm")
                        : "—"}
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
