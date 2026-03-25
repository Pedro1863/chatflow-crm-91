import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Webhook, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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

const WebhookSettingsCard = () => {
  const { data: savedUrl, isLoading } = useSystemSetting("n8n_webhook_url");
  const updateSetting = useUpdateSystemSetting();
  const [url, setUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

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
      { key: "n8n_webhook_url", value: url },
      {
        onSuccess: () => toast.success("Webhook URL salva com sucesso!"),
        onError: () => toast.error("Erro ao salvar URL"),
      }
    );
  };

  const handleTest = async () => {
    if (!url || !isValidUrl(url)) {
      toast.error("Defina uma URL válida antes de testar");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const testUrl = url.replace(/\/$/, "") + "/webhook/send-template";
      const res = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone: "5500000000000",
          nome: "Teste",
          template: "teste_conexao",
          variaveis: ["Teste"],
        }),
      });
      setTestResult(res.ok ? "success" : "error");
      if (res.ok) toast.success("Conexão com n8n OK!");
      else toast.error(`Erro: ${res.status}`);
    } catch {
      setTestResult("error");
      toast.error("Falha ao conectar com o webhook");
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-primary/30">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Webhook URL (n8n) — Templates</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          URL base do webhook n8n usada para envio de templates (manual e automático).
          O sistema adicionará <code className="text-foreground">/webhook/send-template</code> automaticamente.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="https://seu-n8n.com"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setTestResult(null);
            }}
            className={`flex-1 ${url && !urlValid ? "border-destructive" : ""}`}
          />
          <Button
            onClick={handleSave}
            size="sm"
            className="gap-1.5"
            disabled={updateSetting.isPending || !hasChanges}
          >
            {updateSetting.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>

        {url && !urlValid && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> URL inválida
          </p>
        )}

        {!url && savedUrl === "" && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Webhook não configurado. O envio de templates não funcionará.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing || !url || !urlValid}
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Testar Conexão
          </Button>
          {testResult === "success" && (
            <span className="text-xs text-primary flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Conexão OK
            </span>
          )}
          {testResult === "error" && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Falha na conexão
            </span>
          )}
        </div>

        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Payload enviado para templates</p>
          <pre className="text-xs text-foreground whitespace-pre-wrap">
{`{
  "telefone": "+5511999999999",
  "nome": "Nome do cliente",
  "template": "template_name",
  "variaveis": ["Nome do cliente"]
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookSettingsCard;
