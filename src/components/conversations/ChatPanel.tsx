import { useMensagens, useSendMensagem, useContato } from "@/hooks/use-crm-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  contatoId: string | null;
}

export function ChatPanel({ contatoId }: Props) {
  const { data: mensagens = [] } = useMensagens(contatoId);
  const { data: contato } = useContato(contatoId);
  const sendMensagem = useSendMensagem();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  if (!contatoId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Selecione um contato</p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!text.trim() || !contato) return;
    sendMensagem.mutate({
      contato_id: contatoId,
      telefone: contato.telefone,
      mensagem: text.trim(),
    });
    setText("");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center px-4 bg-card">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
          <span className="text-sm font-semibold text-primary">
            {(contato?.nome || contato?.telefone || "?")[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-medium text-sm text-foreground">{contato?.nome || contato?.telefone}</p>
          <p className="text-xs text-muted-foreground">{contato?.telefone}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin bg-muted/20">
        {mensagens.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.direcao === "saida" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm animate-fade-in ${
                msg.direcao === "saida"
                  ? "bg-whatsapp-bubble-sent text-foreground rounded-br-md"
                  : "bg-whatsapp-bubble-received text-foreground rounded-bl-md"
              }`}
            >
              {msg.vendedor && msg.direcao === "saida" && (
                <p className="text-xs font-medium text-primary mb-1">{msg.vendedor}</p>
              )}
              <p>{msg.mensagem}</p>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {format(new Date(msg.timestamp), "HH:mm")}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card flex gap-2">
        <Input
          placeholder="Digite uma mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="bg-muted border-0"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || sendMensagem.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
