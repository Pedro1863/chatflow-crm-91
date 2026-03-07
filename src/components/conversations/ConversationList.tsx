import { useContatos } from "@/hooks/use-crm-data";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  selectedId: string | null;
  onSelect: (contatoId: string) => void;
}

const statusLabels: Record<string, string> = {
  novo_lead: "Novo Lead",
  contato_iniciado: "Contato Iniciado",
  proposta_enviada: "Proposta Enviada",
  cliente: "Cliente",
};

export function ConversationList({ selectedId, onSelect }: Props) {
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
    <div className="w-80 border-r border-border flex flex-col bg-card shrink-0">
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted border-0"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full text-sm bg-muted text-foreground rounded-md px-3 py-2 border-0 outline-none"
        >
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum contato encontrado</p>
          </div>
        ) : (
          filtered.map((contato) => {
            const isSelected = contato.id === selectedId;
            return (
              <button
                key={contato.id}
                onClick={() => onSelect(contato.id)}
                className={`w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
                  isSelected ? "bg-muted" : ""
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {(contato.nome || contato.telefone)[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium text-sm truncate text-foreground">
                      {contato.nome || contato.telefone}
                    </span>
                    {contato.ultima_interacao && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatDistanceToNow(new Date(contato.ultima_interacao), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {contato.telefone}
                  </p>
                  <span className="inline-block text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5 mt-1">
                    {statusLabels[contato.status_funil] || contato.status_funil}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
