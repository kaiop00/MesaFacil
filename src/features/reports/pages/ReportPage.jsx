import CardHeader from "@/components/CardHeader";
import ReportFilter from "@/features/reports/components/ReportFilter";

const ReportPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-12">
      {/* Cabeçalho de Relatórios */}
      <CardHeader
        title="Relatórios"
        subtitle="Preencha as informações para gerar o relatório"
        showButton={false}
      />
      <ReportFilter />
    </div>
  );
};

export default ReportPage;
