import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Save, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSystemSetting, useUpdateSystemSetting } from "@/hooks/use-system-settings";

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const MediaUploadWebhookCard = () => {
  const { data: savedUrl, isLoading } = useSystemSetting("n8n_media_upload_webhook_url");
  const updateSetting = useUpdateSystemSetting();
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (savedUrl !== undefined) setUrl(savedUrl);
  }, [savedUrl]);

  const hasChanges = url !== (savedUrl || "");
  const urlValid = url === "" || isValidUrl(url);

  const handleSave = () => {
    if (url && !isValidUrl(url)) {
      toast.error("URL inválida");
      return;
    }
    updateSetting.mutate(
      { key: "n8n_media_upload_webhook_url", value: url },
      {
        onSuccess: () => toast.success("Webhook de upload de mídia salvo!"),
        onError: () => toast.error("Erro ao salvar URL"),
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-chart-3/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-chart-3" />
          <CardTitle className="text-base">Webhook URL (n8n) — Upload de Mídia</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          URL única do webhook n8n para envio de mídia. O n8n recebe o arquivo, salva no VPS,
          envia para a Meta e registra a mensagem no Supabase via <code>whatsapp-webhook</code>.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="https://seu-n8n.com/webhook/upload-midia"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={`flex-1 ${url && !urlValid ? "border-destructive" : ""}`}
          />
          <Button onClick={handleSave} size="sm" className="gap-1.5" disabled={updateSetting.isPending || !hasChanges}>
            {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>

        {url && !urlValid && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> URL inválida
          </p>
        )}

        <div className="bg-muted rounded-lg p-3 space-y-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Request enviado pelo dashboard</p>
            <pre className="text-xs text-foreground whitespace-pre-wrap">
{`POST {URL acima}
Content-Type: multipart/form-data

Campos do form:
- file                 (binário do arquivo)
- file_name            (nome original)
- mime_type            (image/jpeg, video/mp4, application/pdf, ...)
- type                 (image | video | audio | document | sticker)
- caption              (texto opcional enviado junto)
- telefone             (E.164, ex: 5551999999999)
- contato_id           (uuid do contato)
- whatsapp_account_id  (uuid da conta WA, pode ser vazio)
- phone_number_id      (id Meta do número que envia)
- account_label        (rótulo da conta, ex: POA)`}
            </pre>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Fluxo no n8n (execução única)</p>
            <pre className="text-xs text-foreground whitespace-pre-wrap">
{`1) Salva o arquivo na pasta servida pelo subdomínio
   → gera URL pública (ex: https://midia.seudominio.com/abc123.jpg)

2) Envia para a Meta (POST /messages com link da mídia)
   → recebe wamid de retorno

3) POST para o Supabase registrar a mensagem:
   URL: {SUPABASE_URL}/functions/v1/whatsapp-webhook
   Body JSON:
   {
     "direcao": "saida",
     "telefone": "5551999999999",
     "contato_id": "<uuid>",
     "whatsapp_account_id": "<uuid>",
     "phone_number_id": "<id Meta>",
     "type": "image",
     "media_url": "https://midia.seudominio.com/abc123.jpg",
     "mime_type": "image/jpeg",
     "file_name": "foto.jpg",
     "mensagem": "<caption ou vazio>",
     "whatsapp_message_id": "wamid.XYZ"
   }

Resposta para o dashboard: 200 OK (sem corpo obrigatório).`}
            </pre>
          </div>
          <p className="text-[11px] text-muted-foreground">
            O front <strong>não</strong> grava mídia em <code>mensagens</code> — quem grava é o
            <code> whatsapp-webhook</code> ao receber o POST do n8n (igual ao fluxo de entrada).
            A bolha otimista no chat é substituída em tempo real quando o registro chega via Realtime.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MediaUploadWebhookCard;
