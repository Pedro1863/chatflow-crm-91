import { useMensagens, useLoadMoreMensagens, useSendMensagem, useContato, type Mensagem } from "@/hooks/use-crm-data";
import { useWhatsappAccounts } from "@/hooks/use-whatsapp-accounts";
import { useSystemSetting } from "@/hooks/use-system-settings";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, MoreVertical, Check, CheckCheck, Smile, ChevronUp, Loader2, Phone, Reply, X, CornerUpLeft, Paperclip, Image as ImageIcon, Video, Music, FileText, Sticker } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { MediaMessage } from "./MediaMessage";

import { format } from "date-fns";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface Props {
  contatoId: string | null;
  onToggleDetails?: () => void;
}

export function ChatPanel({ contatoId, onToggleDetails }: Props) {
  const { data: msgData } = useMensagens(contatoId);
  const mensagens = msgData?.messages ?? [];
  const hasMore = msgData?.hasMore ?? false;
  const totalCount = msgData?.total ?? 0;
  const loadMore = useLoadMoreMensagens(contatoId);
  const { data: contato } = useContato(contatoId);
  const sendMensagem = useSendMensagem();
  const qc = useQueryClient();
  const { data: accounts = [] } = useWhatsappAccounts();
  const { data: mediaUploadUrl } = useSystemSetting("n8n_media_upload_webhook_url");
  const activeAccounts = accounts.filter((a) => a.is_active);
  const [text, setText] = useState("");
  const [accountOverride, setAccountOverride] = useState<string | "auto">("auto");
  const [replyingTo, setReplyingTo] = useState<Mensagem | null>(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const forcedTypeRef = useRef<string | null>(null);
  const forcedAcceptRef = useRef<string>("*/*");

  const MEDIA_TYPES: { type: string; label: string; accept: string; icon: any }[] = [
    { type: "image", label: "Imagem", accept: "image/*", icon: ImageIcon },
    { type: "video", label: "Vídeo", accept: "video/*", icon: Video },
    { type: "audio", label: "Áudio", accept: "audio/*", icon: Music },
    { type: "document", label: "Documento", accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar", icon: FileText },
    { type: "sticker", label: "Sticker", accept: "image/webp", icon: Sticker },
  ];

  const openPickerFor = (type: string, accept: string) => {
    forcedTypeRef.current = type;
    forcedAcceptRef.current = accept;
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const detectType = (file: File): string => {
    const m = file.type.toLowerCase();
    if (m.startsWith("image/")) return m.includes("webp") && file.name.toLowerCase().endsWith(".webp") ? "sticker" : "image";
    if (m.startsWith("video/")) return "video";
    if (m.startsWith("audio/")) return "audio";
    return "document";
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const forcedType = forcedTypeRef.current;
    forcedTypeRef.current = null;
    if (!file || !contato || !contatoId) return;

    if (!mediaUploadUrl) {
      toast.error("Configure o Webhook de Upload de Mídia (n8n) em Configurações");
      return;
    }

    if (file.size > 64 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 64 MB)");
      return;
    }

    try {
      setUploading(true);
      const type = forcedType || detectType(file);
      const caption = text.trim();

      // Resolve conta: override > conta do contato > default
      let accountId: string | null =
        accountOverride === "auto" ? null : accountOverride;
      if (!accountId) {
        accountId = (contato as any)?.whatsapp_account_id || null;
      }
      if (!accountId) {
        const def = accounts.find((a) => a.is_default && a.is_active);
        accountId = def?.id || null;
      }
      const account = accountId ? accounts.find((a) => a.id === accountId) : null;

      // FLUXO UNIFICADO (Opção A): n8n recebe o arquivo, salva no VPS, envia pra Meta
      // e DEPOIS faz POST no whatsapp-webhook (direcao: "saida") pra gravar em `mensagens`.
      // O front NÃO grava nada — apenas dispara o webhook e confia no Realtime para
      // exibir a bolha quando o registro chegar no Supabase.
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("file_name", file.name);
      form.append("mime_type", file.type || "application/octet-stream");
      form.append("type", type);
      form.append("caption", caption);
      form.append("telefone", contato.telefone);
      form.append("contato_id", contatoId);
      form.append("whatsapp_account_id", accountId || "");
      form.append("phone_number_id", account?.phone_number_id || "");
      form.append("account_label", account?.label || "");
      // Reply context — sempre enviado (vazio quando não é resposta) para
      // facilitar o mapeamento dos campos no n8n.
      form.append("reply_to_wamid", replyingTo?.whatsapp_message_id || "");
      form.append("reply_to_id", replyingTo?.id || "");
      form.append("is_reply", replyingTo?.whatsapp_message_id ? "true" : "false");
      // Context para Meta API — campo plano (form-data não suporta nested) +
      // string JSON pronta pra reaproveitar caso o n8n prefira.
      form.append("context_message_id", replyingTo?.whatsapp_message_id || "");
      form.append(
        "context",
        replyingTo?.whatsapp_message_id
          ? JSON.stringify({ message_id: replyingTo.whatsapp_message_id })
          : ""
      );

      // O n8n pode levar vários segundos (upload + Meta + webhook). Não exigimos JSON
      // de resposta — basta um 2xx. A mensagem aparece via Realtime quando o
      // whatsapp-webhook gravar em `mensagens`.
      const res = await fetch(mediaUploadUrl.replace(/\/$/, ""), {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        throw new Error(`n8n respondeu ${res.status}`);
      }

      toast.success("Mídia enviada — aguardando confirmação...");
      setText("");
      setReplyingTo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };


  // Reset override + reply when contact changes
  useEffect(() => {
    setAccountOverride("auto");
    setReplyingTo(null);
  }, [contatoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length]);

  // Map for quick lookup of original messages by wamid/id (for rendering quoted previews)
  const messageIndex = useMemo(() => {
    const byWamid = new Map<string, Mensagem>();
    const byId = new Map<string, Mensagem>();
    mensagens.forEach((m) => {
      if (m.whatsapp_message_id) byWamid.set(m.whatsapp_message_id, m);
      byId.set(m.id, m);
    });
    return { byWamid, byId };
  }, [mensagens]);

  const handleLoadMore = () => {
    const scrollEl = scrollContainerRef.current;
    const prevHeight = scrollEl?.scrollHeight ?? 0;
    loadMore.mutate(
      { currentCount: mensagens.length, total: totalCount },
      {
        onSuccess: () => {
          requestAnimationFrame(() => {
            if (scrollEl) {
              const newHeight = scrollEl.scrollHeight;
              scrollEl.scrollTop = newHeight - prevHeight;
            }
          });
        },
      }
    );
  };

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
        whatsapp_account_id: accountOverride === "auto" ? null : accountOverride,
        reply_to_wamid: replyingTo?.whatsapp_message_id || null,
        reply_to_id: replyingTo?.id || null,
      },
      {
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem");
        },
      }
    );
    setText("");
    setReplyingTo(null);
  };

  const handleStartReply = (msg: Mensagem) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1500);
    }
  };

  const renderQuoted = (msg: Mensagem) => {
    if (!msg.reply_to_wamid && !msg.reply_to_id) return null;
    const original =
      (msg.reply_to_id && messageIndex.byId.get(msg.reply_to_id)) ||
      (msg.reply_to_wamid && messageIndex.byWamid.get(msg.reply_to_wamid)) ||
      null;
    const preview = original?.mensagem || `[${original?.type || "mensagem"}]`;
    const authorLabel = original
      ? original.direcao === "saida"
        ? "Você"
        : contato?.nome || contato?.telefone || "Cliente"
      : "Mensagem original";
    return (
      <button
        type="button"
        onClick={() => original && scrollToMessage(original.id)}
        className="w-full text-left mb-1.5 px-2 py-1.5 rounded-md bg-muted/50 border-l-2 border-primary/60 hover:bg-muted transition-colors"
      >
        <p className="text-[11px] font-semibold text-primary truncate">{authorLabel}</p>
        <p className="text-xs text-muted-foreground truncate">{preview || "..."}</p>
      </button>
    );
  };

  const contatoAccountId = (contato as any)?.whatsapp_account_id as string | null | undefined;
  const contatoAccount = contatoAccountId ? accounts.find((a) => a.id === contatoAccountId) : null;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center mr-3 shrink-0">
            <span className="text-sm font-bold text-primary">
              {(contato?.nome || contato?.telefone || "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-foreground truncate">{contato?.nome || contato?.telefone}</p>
              {contatoAccount && (
                <Badge variant="outline" className="gap-1 text-[10px] shrink-0">
                  <Phone className="h-2.5 w-2.5" /> {contatoAccount.label}
                </Badge>
              )}
            </div>
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-background">
        {hasMore && (
          <div className="flex justify-center pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={loadMore.isPending}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              {loadMore.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
              Carregar mensagens anteriores
            </Button>
          </div>
        )}
        {mensagens.map((msg) => (
          <div
            key={msg.id}
            id={`msg-${msg.id}`}
            className={`group flex items-center gap-1.5 ${msg.direcao === "saida" ? "justify-end" : "justify-start"} transition-all rounded-lg`}
          >
            {msg.direcao === "saida" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartReply(msg)}
                className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Responder"
              >
                <CornerUpLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
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
              {renderQuoted(msg)}
              <MediaMessage
                type={msg.type || "text"}
                mediaUrl={msg.media_url}
                mediaId={msg.media_id}
                mimeType={msg.mime_type}
                fileName={msg.file_name}
                mensagem={msg.mensagem}
              />
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
            {msg.direcao !== "saida" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartReply(msg)}
                className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Responder"
              >
                <CornerUpLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Account selector */}
      {activeAccounts.length > 1 && (
        <div className="px-3 pt-2 pb-1 border-t border-border bg-card/30 flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Enviar via:</span>
          <Select value={accountOverride} onValueChange={(v) => setAccountOverride(v as any)}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[140px] gap-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                Automático {contatoAccount ? `(${contatoAccount.label})` : "(padrão)"}
              </SelectItem>
              {activeAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label} {a.is_default ? "★" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Reply preview above input */}
      {replyingTo && (
        <div className="px-3 pt-2 border-t border-border bg-card/30">
          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border-l-2 border-primary">
            <Reply className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-primary">
                Respondendo {replyingTo.direcao === "saida" ? "você mesmo" : contato?.nome || contato?.telefone}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {replyingTo.mensagem || `[${replyingTo.type}]`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setReplyingTo(null)}
              className="h-6 w-6 rounded-md shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border bg-card/50 backdrop-blur-sm flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelected}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-9 w-9 rounded-xl"
              disabled={uploading || sendMensagem.isPending}
              title="Anexar mídia"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-48 p-1">
            {MEDIA_TYPES.map(({ type, label, accept, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => openPickerFor(type, accept)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent text-left"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>

          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-xl">
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-0 border-none shadow-xl">
            <Picker
              data={data}
              onEmojiSelect={(emoji: { native: string }) => setText((prev) => prev + emoji.native)}
              theme="dark"
              locale="pt"
              previewPosition="none"
              skinTonePosition="search"
            />
          </PopoverContent>
        </Popover>
        <Input
          ref={inputRef}
          placeholder={replyingTo ? "Digite sua resposta..." : "Digite uma mensagem..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
            if (e.key === "Escape") setReplyingTo(null);
          }}
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
