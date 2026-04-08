import { useMensagens, useSendMensagem, useContato } from "@/hooks/use-crm-data";
import { useFetchProfilePhoto } from "@/hooks/use-profile-photo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare, MoreVertical, Check, CheckCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  contatoId: string | null;
  onToggleDetails?: () => void;
}

export function ChatPanel({ contatoId, onToggleDetails }: Props) {
  const { data: mensagens = [] } = useMensagens(contatoId);
  const { data: contato } = useContato(contatoId);
  const sendMensagem = useSendMensagem();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Trigger profile photo fetch when conversation opens
  useFetchProfilePhoto(contatoId, contato?.telefone ?? null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  if (!contatoId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-primary/50" />
          </div>
          <p className="text-muted-foreground font-medium">Selecione um contato</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Escolha uma conversa para começar</p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!text.trim() || !contato) return;
    sendMensagem.mutate(
      {
        contato_id: contatoId!,
        telefone: contato.telefone,
        mensagem: text.trim(),
      },
      {
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem");
        },
      }
    );
    setText("");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center">
          <Avatar className="h-9 w-9 rounded-xl mr-3">
            {contato?.foto_url ? (
              <AvatarImage src={contato.foto_url} alt={contato?.nome || "Foto"} />
            ) : null}
            <AvatarFallback className="rounded-xl bg-primary/15 text-sm font-bold text-primary">
              {(contato?.nome || contato?.telefone || "?")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm text-foreground">{contato?.nome || contato?.telefone}</p>
            <p className="text-xs text-muted-foreground">{contato?.telefone}</p>
          </div>
        </div>
        {onToggleDetails && (
          <Button variant="ghost" size="icon" onClick={onToggleDetails} className="shrink-0 h-8 w-8 rounded-lg">
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-background">
        {mensagens.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.direcao === "saida" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm animate-fade-in transition-all ${
                msg.direcao === "saida"
                  ? "bg-primary/10 text-foreground rounded-br-md border border-primary/20"
                  : "bg-card text-foreground rounded-bl-md border border-border"
              }`}
            >
              {msg.vendedor && msg.direcao === "saida" && (
                <p className="text-xs font-semibold text-primary mb-1">{msg.vendedor}</p>
              )}
              <p className="leading-relaxed">{msg.mensagem}</p>
              <div className="flex items-center justify-end gap-1.5 mt-1.5">
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(msg.timestamp), "HH:mm")}
                </p>
                {msg.direcao === "saida" && (
                  <span className="inline-flex">
                    {msg.status === "read" ? (
                      <CheckCheck className="h-3.5 w-3.5 text-primary" />
                    ) : msg.status === "delivered" ? (
                      <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card/50 backdrop-blur-sm flex gap-2">
        <Input
          placeholder="Digite uma mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="bg-muted/50 border-border/50 rounded-xl"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || sendMensagem.isPending}
          className="rounded-xl shrink-0 glow-primary"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
