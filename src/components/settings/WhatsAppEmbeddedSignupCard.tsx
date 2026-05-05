import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSetting, useUpdateSystemSetting } from "@/hooks/use-system-settings";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const FB_SDK_VERSION = "v21.0";

function loadFacebookSdk(appId: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.FB) {
      try {
        window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version: FB_SDK_VERSION });
      } catch {}
      return resolve();
    }
    window.fbAsyncInit = function () {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version: FB_SDK_VERSION });
      resolve();
    };
    const id = "facebook-jssdk";
    if (document.getElementById(id)) return;
    const js = document.createElement("script");
    js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    js.async = true;
    js.defer = true;
    js.crossOrigin = "anonymous";
    document.body.appendChild(js);
  });
}

export default function WhatsAppEmbeddedSignupCard() {
  const qc = useQueryClient();
  const { data: appId = "" } = useSystemSetting("meta_app_id");
  const { data: configId = "" } = useSystemSetting("meta_config_id");
  const { data: signupWebhook = "" } = useSystemSetting("meta_signup_webhook_url");
  const updateSetting = useUpdateSystemSetting();

  const [appIdInput, setAppIdInput] = useState("");
  const [configIdInput, setConfigIdInput] = useState("");
  const [webhookInput, setWebhookInput] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const [launching, setLaunching] = useState(false);
  const messageHandlerRef = useRef<((e: MessageEvent) => void) | null>(null);
  const sessionInfoRef = useRef<any>(null);

  useEffect(() => { setAppIdInput(appId); }, [appId]);
  useEffect(() => { setConfigIdInput(configId); }, [configId]);
  useEffect(() => { setWebhookInput(signupWebhook); }, [signupWebhook]);

  // Load SDK once we have an App ID
  useEffect(() => {
    if (!appId) return;
    loadFacebookSdk(appId).then(() => setSdkReady(true));
  }, [appId]);

  // Listen for session_info messages from Embedded Signup popup
  useEffect(() => {
    if (messageHandlerRef.current) {
      window.removeEventListener("message", messageHandlerRef.current);
    }
    const handler = (event: MessageEvent) => {
      if (typeof event.data !== "string" || !event.origin.includes("facebook.com")) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          sessionInfoRef.current = data.data;
        }
      } catch {}
    };
    messageHandlerRef.current = handler;
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const accountsQuery = useQuery({
    queryKey: ["whatsapp_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_accounts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_accounts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Número removido");
      qc.invalidateQueries({ queryKey: ["whatsapp_accounts"] });
    },
  });

  const handleSaveConfig = async () => {
    await Promise.all([
      updateSetting.mutateAsync({ key: "meta_app_id", value: appIdInput.trim() }),
      updateSetting.mutateAsync({ key: "meta_config_id", value: configIdInput.trim() }),
      updateSetting.mutateAsync({ key: "meta_signup_webhook_url", value: webhookInput.trim() }),
    ]);
    toast.success("Configuração salva");
  };

  const launchSignup = () => {
    if (!window.FB) {
      toast.error("SDK do Facebook ainda não carregou");
      return;
    }
    if (!configId) {
      toast.error("Configure o Config ID antes de continuar");
      return;
    }
    setLaunching(true);
    sessionInfoRef.current = null;

    window.FB.login(
      async (response: any) => {
        setLaunching(false);
        if (!response.authResponse) {
          toast.error("Login cancelado ou falhou");
          return;
        }
        const code = response.authResponse.code;
        const session = sessionInfoRef.current?.event === "FINISH"
          ? sessionInfoRef.current
          : sessionInfoRef.current;

        const payload = {
          code,
          waba_id: session?.waba_id || null,
          phone_number_id: session?.phone_number_id || null,
          business_id: session?.business_id || null,
          raw_payload: { authResponse: response.authResponse, session },
          status: "pending",
          signup_code: code,
        };

        const { error } = await supabase.from("whatsapp_accounts" as any).insert(payload);
        if (error) {
          toast.error("Erro ao salvar: " + error.message);
          return;
        }

        // Forward to n8n if configured (n8n trades the code for tokens using app secret)
        if (signupWebhook) {
          try {
            await fetch(signupWebhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "embedded_signup", ...payload }),
            });
          } catch (e) {
            console.warn("Falha ao notificar n8n:", e);
          }
        }

        toast.success("Número conectado! Aguardando confirmação.");
        qc.invalidateQueries({ queryKey: ["whatsapp_accounts"] });
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding", // Coexistence
          sessionInfoVersion: "3",
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">WhatsApp Embedded Signup (Coexistence)</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Conecte um número de WhatsApp existente (já em uso no app) à API Cloud da Meta usando o
          fluxo de Coexistência. Informe o <strong>App ID</strong> e o <strong>Config ID</strong>{" "}
          (criado no Embedded Signup do seu App no Meta for Developers).
        </p>

        <div className="grid gap-3">
          <div>
            <Label className="text-xs">App ID</Label>
            <Input value={appIdInput} onChange={(e) => setAppIdInput(e.target.value)} placeholder="1234567890" />
          </div>
          <div>
            <Label className="text-xs">Config ID (Embedded Signup → Coexistence)</Label>
            <Input value={configIdInput} onChange={(e) => setConfigIdInput(e.target.value)} placeholder="9876543210" />
          </div>
          <div>
            <Label className="text-xs">Webhook n8n (token exchange) — opcional</Label>
            <Input
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              placeholder="https://n8n.seudominio.com/webhook/meta-signup"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              O n8n deve trocar o <code>code</code> pelo access token usando o App Secret e atualizar
              o registro em <code>whatsapp_accounts</code>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveConfig} disabled={updateSetting.isPending}>
              Salvar config
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={launchSignup}
              disabled={!sdkReady || launching || !configId}
              className="gap-2"
            >
              {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Conectar WhatsApp
            </Button>
          </div>
          {!sdkReady && appId && (
            <p className="text-[11px] text-muted-foreground">Carregando SDK do Facebook…</p>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Números conectados</h4>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => qc.invalidateQueries({ queryKey: ["whatsapp_accounts"] })}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          {accountsQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          ) : (accountsQuery.data || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum número conectado ainda.</p>
          ) : (
            <div className="space-y-2">
              {(accountsQuery.data as any[]).map((acc) => (
                <div key={acc.id} className="bg-muted/50 rounded-lg p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-sm font-semibold truncate">
                        {acc.display_phone_number || acc.phone_number_id || "Pendente"}
                      </p>
                      <Badge variant="secondary" className="text-[10px]">{acc.status}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 break-all">
                      WABA: {acc.waba_id || "—"} • Phone ID: {acc.phone_number_id || "—"}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => deleteAccount.mutate(acc.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
