import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ImportResult = {
  total_linhas_csv: number;
  total_pedidos_agrupados: number;
  vinculados: number;
  falhas: number;
  clientes_atualizados: number;
  leads_convertidos: number;
};

const OrderImportCard = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, 3);
    setFiles(selected);
    setResult(null);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setResult(null);
  };

  const handleImport = async () => {
    if (files.length === 0) {
      toast.error("Selecione pelo menos um arquivo CSV.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const csvTexts: string[] = [];
      for (const file of files) {
        const text = await file.text();
        csvTexts.push(text);
      }

      const { data, error } = await supabase.functions.invoke("import-orders", {
        body: { csv_data: csvTexts },
      });

      if (error) throw error;

      setResult(data as ImportResult);
      toast.success(`Importação concluída: ${data.vinculados} pedidos vinculados.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na importação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Importar Pedidos (CSV)</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Importe pedidos via CSV para atualizar os dados de compra dos clientes existentes.
          Clientes não encontrados serão registrados no log de inconsistências.
        </p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="gap-1.5"
            >
              <FileText className="h-4 w-4" />
              Selecionar CSVs (até 3)
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted rounded px-3 py-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleImport} disabled={loading || files.length === 0} size="sm" className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? "Processando..." : "Importar Pedidos"}
          </Button>
        </div>

        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Formato esperado do CSV (separador: ;)</p>
          <pre className="text-xs text-foreground whitespace-pre-wrap">
{`id;telefone;nome;valor;data
12345;+5511999999999;Maria Silva;150,00;2025-01-15`}
          </pre>
          <p className="text-xs text-muted-foreground mt-2">
            Colunas aceitas: <code>id/bling_id/numero</code>, <code>telefone/fone/celular</code>, <code>valor/total</code>, <code>nome/cliente</code>, <code>data/data_pedido</code>
          </p>
        </div>

        {result && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-semibold">Resumo da Importação</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{result.total_linhas_csv}</p>
                <p className="text-xs text-muted-foreground">Linhas no CSV</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{result.total_pedidos_agrupados}</p>
                <p className="text-xs text-muted-foreground">Pedidos agrupados</p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-green-600">{result.vinculados}</p>
                <p className="text-xs text-muted-foreground">Vinculados</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{result.clientes_atualizados}</p>
                <p className="text-xs text-muted-foreground">Clientes atualizados</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{result.leads_convertidos}</p>
                <p className="text-xs text-muted-foreground">Leads convertidos</p>
              </div>
              {result.falhas > 0 && (
                <div className="bg-destructive/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-destructive">{result.falhas}</p>
                  <p className="text-xs text-muted-foreground">Não vinculados</p>
                </div>
              )}
            </div>

            {result.falhas === 0 && (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Todos os pedidos foram vinculados com sucesso!</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderImportCard;
