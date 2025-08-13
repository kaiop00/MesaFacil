import { AplicaCorDoSistema } from "@/components/AplicaCorDoSistema";
import { useAuth } from "@/contexts/AuthContext";
import { useTables } from "@/features/config/hooks/useTables";
import { getTableStatsOptimized } from "../services/mesas";
import { useEffect, useState } from "react";
import {
  ShoppingCart01,
  Notebook,
  Timer,
  MoreHorizontal,
  ChevronDown,
} from "react-coolicons";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { useMemo } from "react";

const DashboardPage = () => {
  const { idRestaurante } = useAuth();
  const { mesasAndamento, tables } = useTables(idRestaurante);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    salesGrowth: 12.65,
    totalOrders: 0,
    totalCompleteOrders: 0,
    ordersGrowth: 12.65,
    avgServiceTime: 45,
    timeGrowth: 12.65,
  });

  // Individual filters for each card
  const [salesFilter, setSalesFilter] = useState('Hoje');
  const [ordersFilter, setOrdersFilter] = useState('Hoje');
  const [timeFilter, setTimeFilter] = useState('Mensal');

  const mesasAndamentoDisplay = useMemo(
    () =>
      mesasAndamento.map((mesa) => {
        return { ...mesa };
      }),
    [mesasAndamento],
  );

  useEffect(() => {
    const fetchTableStats = async () => {
      if (!tables || tables.length === 0 || !idRestaurante) return;

      try {
        // Execute all three stat queries in parallel with their respective filters
        const [salesStats, ordersStats, timeStats] = await Promise.all([
          getTableStatsOptimized(idRestaurante, tables, salesFilter),
          getTableStatsOptimized(idRestaurante, tables, ordersFilter),
          getTableStatsOptimized(idRestaurante, tables, timeFilter)
        ]);

        // Update stats with filtered results
        setStats((prevStats) => ({
          ...prevStats,
          totalSales: salesStats.totalSales,
          totalOrders: ordersStats.totalOrders,
          avgServiceTime: timeStats.averageServiceTime,
        }));
      } catch (error) {
        console.error('Error fetching table stats:', error);
      }
    };

    fetchTableStats();
  }, [tables, idRestaurante, salesFilter, ordersFilter, timeFilter]);

  // Mock data for sales chart
  useEffect(() => {
    setSalesData([
      { month: "Jan", value: 3200 },
      { month: "Fev", value: 1800 },
      { month: "Mar", value: 2400 },
      { month: "Abr", value: 3800 },
      { month: "Mai", value: 2600 },
      { month: "Jun", value: 3200 },
      { month: "Jul", value: 3400 },
      { month: "Ago", value: 2600 },
      { month: "Set", value: 2800 },
      { month: "Out", value: 3000 },
      { month: "Nov", value: 2200 },
      { month: "Dez", value: 3000 },
    ]);

    setTopProducts([
      { name: "Peixe", value: 1400.2 },
      { name: "Encanto da Serra", value: 1400.2 },
      { name: "Carne de Gado", value: 1400.2 },
      { name: "Encanto da Serra", value: 1400.2 },
      { name: "Carne de Gado", value: 1400.2 },
      { name: "Encanto da Serra", value: 1400.2 },
    ]);
  }, []);

  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  };

  return (
    <>
      <AplicaCorDoSistema />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6 space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Acompanhe o andamento do seu negócio
          </p>
        </div>

        {/* Orders in Progress Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400"></div>
              <h2 className="text-lg font-medium text-gray-900">
                Pedidos em Andamento
              </h2>
            </div>
            <button className="text-sm text-gray-500 hover:text-gray-700">
              Ver Todos
            </button>
          </div>
          {mesasAndamentoDisplay.length === 0 ? (
            <p>Nenhum pedido em andamento</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {mesasAndamentoDisplay.slice(0, 4).map((mesa) => (
                <div key={mesa.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Notebook className="w-5 h-5 text-orange-500" />
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-medium text-gray-900">
                      Mesa {mesa.numero}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Pedido {mesa.timeAgo}
                    </p>
                    <p className="text-lg font-semibold text-orange-500 mt-3">
                      {formatCurrency(Number(mesa.total))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Sales */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <ShoppingCart01 className="w-5 h-5 text-orange-500" />
              </div>
              <div className="relative">
                <select
                  value={salesFilter}
                  onChange={(e) => setSalesFilter(e.target.value)}
                  className="text-sm text-gray-500 bg-transparent border-none cursor-pointer focus:outline-none appearance-none pr-6"
                >
                  <option value="Hoje">Hoje</option>
                  <option value="Semanal">Semanal</option>
                  <option value="Mensal">Mensal</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total Vendas</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalSales)}
              </p>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Notebook className="w-5 h-5 text-orange-500" />
              </div>
              <div className="relative">
                <select
                  value={ordersFilter}
                  onChange={(e) => setOrdersFilter(e.target.value)}
                  className="text-sm text-gray-500 bg-transparent border-none cursor-pointer focus:outline-none appearance-none pr-6"
                >
                  <option value="Hoje">Hoje</option>
                  <option value="Semanal">Semanal</option>
                  <option value="Mensal">Mensal</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-600">Quantidade de Pedidos</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalOrders}
              </p>
            </div>
          </div>

          {/* Average Service Time */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Timer className="w-5 h-5 text-orange-500" />
              </div>
              <div className="relative">
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="text-sm text-gray-500 bg-transparent border-none cursor-pointer focus:outline-none appearance-none pr-6"
                >
                  <option value="Hoje">Hoje</option>
                  <option value="Semanal">Semanal</option>
                  <option value="Mensal">Mensal</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Tempo Médio de Atendimento
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.avgServiceTime} min
              </p>
            </div>
          </div>
        </div>

        {/* Charts and Products Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Evolution Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Evolução de Vendas
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">Categoria</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">Mensal</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="h-64 flex items-end justify-between gap-2 mt-8">
              {salesData.map((item, index) => {
                const height =
                  (item.value / Math.max(...salesData.map((d) => d.value))) *
                  100;
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 flex-1"
                  >
                    <div
                      className="w-full bg-orange-400 rounded-t transition-all duration-300 hover:bg-orange-500"
                      style={{ height: `${height}%`, minHeight: "8px" }}
                    ></div>
                    <span className="text-xs text-gray-500">{item.month}</span>
                  </div>
                );
              })}
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-between mt-6 text-xs text-gray-500">
              <span>1k</span>
              <span>2k</span>
              <span>3k</span>
              <span>4k</span>
              <span>5k</span>
              <span>6k</span>
              <span>7k</span>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Produtos Mais Vendidos
              </h3>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">Mensal</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm font-medium text-gray-700 border-b border-gray-100 pb-2">
                <span>Nome</span>
                <span>Valor Vendido</span>
              </div>

              {topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-gray-900">{product.name}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(product.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
