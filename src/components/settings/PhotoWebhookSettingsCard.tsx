import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Camera, Save, Loader2 } from "lucide-react";
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

const PhotoWebhookSettingsCard = () => {
  const { data: savedUrl, isLoading } = useSystemSetting("n8n_photo_webhook_url");
  const updateSetting = useUpdateSystemSetting();
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (savedUrl !== undefined) setUrl(savedUrl);
  }, [savedUrl]);

  const hasChanges = url !== (savedUrl || "");
  const urlValid = url === "" || isValidUrl(url);

  const handleSave = () => {
    if (url && !isValidUrl(url)) {
      toast.error("URL inválida. Use https:// ou http://");
      return;
    }
    updateSetting.mutate(
      { key: "n8n_photo_webhook_url", value: url },
      {
        onSuccess: () => toast.success("Webhook de foto salvo com sucesso!"),
        onError: () => toast.error("Erro ao salvar webhook de foto"),
      }
    );
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-5 w-5 text-primary" />
          Webhook de Foto de Perfil (n8n)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          URL do webhook no n8n que busca a foto de perfil do WhatsApp via API da Meta.
          Ao abrir uma conversa, o CRM dispara este webhook com o telefone e contato_id.
        </p>
        <p className="text-xs text-muted-foreground/70">
          O n8n deve retornar a foto via callback para: <code className="text-primary/80">update-profile-photo</code>
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="https://seu-n8n.com/webhook/foto-perfil"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className={`bg-muted/50 border-border/50 rounded-xl ${!urlValid ? "border-destructive" : ""}`}
          />
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSetting.isPending || !urlValid}
            className="rounded-xl shrink-0"
          >
            {updateSetting.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhotoWebhookSettingsCard;
