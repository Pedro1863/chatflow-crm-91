import { useConversations } from "@/hooks/use-crm-data";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  selectedId: string | null;
  onSelect: (convId: string, contactId: string) => void;
}

export function ConversationList({ selectedId, onSelect }: Props) {
  const { data: conversations = [], isLoading } = useConversations();
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => {
    const name = c.contacts?.name || c.contacts?.phone || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="w-80 border-r border-border flex flex-col bg-card shrink-0">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted border-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma conversa</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const contact = conv.contacts;
            const isSelected = conv.id === selectedId;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id, conv.contact_id)}
                className={`w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
                  isSelected ? "bg-muted" : ""
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {(contact?.name || contact?.phone || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium text-sm truncate text-foreground">
                      {contact?.name || contact?.phone || "Desconhecido"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conv.updated_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.last_message_preview || "Sem mensagens"}
                  </p>
                  {(conv.unread_count || 0) > 0 && (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold mt-1">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
