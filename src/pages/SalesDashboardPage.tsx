import { Loader2 } from "lucide-react";
import { useCustomers, useLeadsPipeline } from "@/hooks/use-sales-data";
import { Separator } from "@/components/ui/separator";
import AquisicaoSection from "@/components/sales/AquisicaoSection";
import RetencaoSection from "@/components/sales/RetencaoSection";
import ReceitaSection from "@/components/sales/ReceitaSection";
import ComportamentoSection from "@/components/sales/ComportamentoSection";
import PipelinePerdas from "@/components/sales/PipelinePerdas";

const SalesDashboardPage = () => {
  const { isLoading: loadingC } = useCustomers();
  const { isLoading: loadingL } = useLeadsPipeline();

  if (loadingC || loadingL) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando métricas...
      </div>
    );
  }

  return (
    <div className="h-full p-6 overflow-y-auto scrollbar-thin space-y-8">
      <h1 className="text-xl font-bold text-foreground">Métricas de Vendas</h1>

      {/* Bloco 1: Aquisição */}
      <AquisicaoSection />

      <Separator />

      {/* Bloco 2: Retenção */}
      <RetencaoSection />

      <Separator />

      {/* Bloco 3: Receita */}
      <ReceitaSection />

      <Separator />

      {/* Bloco 4: Comportamento */}
      <ComportamentoSection />

      <Separator />

      {/* Pipeline de perdas */}
      <PipelinePerdas />
    </div>
  );
};

export default SalesDashboardPage;
