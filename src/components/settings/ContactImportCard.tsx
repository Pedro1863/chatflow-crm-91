import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, X, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ImportResult = {
  total_linhas: number;
  importados: number;
  atualizados: number;
  ignorados: number;
  erros_count: number;
  erros: { bling_id: string; nome: string; motivo: string }[];
};

const ContactImportCard = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, 5);
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

      const { data, error } = await supabase.functions.invoke("import-contacts", {
        body: { csv_data: csvTexts },
      });

      if (error) throw error;

      setResult(data as ImportResult);
      toast.success(`Importação concluída: ${data.importados} novos, ${data.atualizados} atualizados.`);
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
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Importar Contatos (CSV Bling)</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Importe contatos do Bling para cadastrar ou atualizar clientes. 
          Usa o ID do Bling para evitar duplicatas.
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
              Selecionar CSVs (até 5)
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
            {loading ? "Processando..." : "Importar Contatos"}
          </Button>
        </div>

        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Campos mapeados do CSV Bling:</p>
          <p className="text-xs text-foreground">
            <code>ID</code> → Bling ID · <code>Nome</code> → Nome · <code>Fone/Celular</code> → Telefone · <code>Cidade</code> → Cidade · <code>Cliente desde</code> → Data de conversão
          </p>
        </div>

        {result && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-semibold">Resumo da Importação</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{result.total_linhas}</p>
                <p className="text-xs text-muted-foreground">Linhas CSV</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary">{result.importados}</p>
                <p className="text-xs text-muted-foreground">Novos</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{result.atualizados}</p>
                <p className="text-xs text-muted-foreground">Atualizados</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{result.ignorados}</p>
                <p className="text-xs text-muted-foreground">Ignorados</p>
              </div>
            </div>

            {result.erros_count > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">{result.erros_count} erros</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.erros.map((err, i) => (
                    <div key={i} className="bg-destructive/5 border border-destructive/20 rounded p-2 text-xs">
                      <p><strong>Motivo:</strong> {err.motivo}</p>
                      <p>Bling ID: {err.bling_id} · Nome: {err.nome}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.erros_count === 0 && (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Todos os contatos foram importados com sucesso!</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactImportCard;
