import { useMessages, useSendMessage, useContact } from "@/hooks/use-crm-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";

interface Props {
  conversationId: string | null;
  contactId: string | null;
}

export function ChatPanel({ conversationId, contactId }: Props) {
  const { data: messages = [] } = useMessages(conversationId);
  const { data: contact } = useContact(contactId);
  const sendMessage = useSendMessage();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Selecione uma conversa</p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!text.trim() || !contactId) return;
    sendMessage.mutate({
      conversation_id: conversationId,
      contact_id: contactId,
      content: text.trim(),
    });
    setText("");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center px-4 bg-card">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
          <span className="text-sm font-semibold text-primary">
            {(contact?.name || contact?.phone || "?")[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-medium text-sm text-foreground">{contact?.name || contact?.phone}</p>
          <p className="text-xs text-muted-foreground">{contact?.phone}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin bg-muted/20">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm animate-fade-in ${
                msg.direction === "outbound"
                  ? "bg-whatsapp-bubble-sent text-foreground rounded-br-md"
                  : "bg-whatsapp-bubble-received text-foreground rounded-bl-md"
              }`}
            >
              <p>{msg.content}</p>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {format(new Date(msg.created_at), "HH:mm")}
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
          disabled={!text.trim() || sendMessage.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
