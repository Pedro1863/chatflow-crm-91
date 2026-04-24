import { useContatos } from "@/hooks/use-crm-data";
import { useUnreadCounts, useInitializeReadBaseline } from "@/hooks/use-unread-messages";
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
  novo_lead: "Sem Produto",
  contato_iniciado: "Contato Iniciado",
  proposta_enviada: "Proposta Enviada",
  cliente: "Cliente",
};

export function ConversationList({ selectedId, onSelect }: Props) {
  const { data: contatos = [], isLoading } = useContatos();
  const unreadCounts = useUnreadCounts();
  useInitializeReadBaseline(contatos.map((c) => c.id));
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
    <div className="w-80 border-r border-border flex flex-col bg-card/50 backdrop-blur-sm shrink-0">
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-border/50 rounded-xl"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full text-sm bg-muted/50 text-foreground rounded-xl px-3 py-2 border border-border/50 outline-none transition-colors focus:border-primary/50"
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
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum contato encontrado</p>
          </div>
        ) : (
          filtered.map((contato) => {
            const isSelected = contato.id === selectedId;
            const unread = unreadCounts[contato.id] || 0;
            return (
              <button
                key={contato.id}
                onClick={() => onSelect(contato.id)}
                className={`w-full flex items-start gap-3 p-3 text-left transition-all duration-200 hover:bg-muted/50 ${
                  isSelected ? "bg-muted border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                }`}
              >
                <div className="relative h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {(contato.nome || contato.telefone)[0].toUpperCase()}
                  </span>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-md">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className={`text-sm truncate text-foreground ${unread > 0 ? "font-bold" : "font-semibold"}`}>
                      {contato.nome || contato.telefone}
                    </span>
                    {contato.ultima_interacao && (
                      <span className={`text-[11px] shrink-0 ml-2 ${unread > 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
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
                  <span className="inline-block text-[11px] font-medium bg-primary/10 text-primary rounded-md px-2 py-0.5 mt-1.5">
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
