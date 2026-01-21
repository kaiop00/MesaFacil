import { useTranslation } from "react-i18next";
import { AplicaCorDoSistema } from "@/components/AplicaCorDoSistema";
import PermissionDeniedPage from "@/components/PermissionDeniedPage";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTables } from "@/features/config/hooks/useTables";
import { getTableStatsOptimized, getMonthlySalesData, getTopSellingProducts } from "../services/mesas";
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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { formatDuration, intervalToDuration } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from "react-router-dom";
import PlanGate from "@/components/PlanGate";
import { FEATURE_FLAGS } from "@/constants/planFeatures";
import { getCategoriaNomes } from "@/features/config/services/CategoriasService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const DashboardPage = () => {
  const { t } = useTranslation("dashboard");
  const { idRestaurante } = useAuth();
  const { hasPermission } = usePermissions();
  const { mesasAndamento, tables } = useTables(idRestaurante);

  // Helper function to format service time
  const formatServiceTime = (minutes) => {
    if (minutes > 60) {
      const duration = intervalToDuration({
        start: 0,
        end: minutes * 60 * 1000 // Convert minutes to milliseconds
      });

      return formatDuration(duration, {
        format: ['hours', 'minutes'],
        locale: ptBR,
        delimiter: ' e '
      });
    }
    return `${minutes} min`;
  };
  const [salesData, setSalesData] = useState([]);
  const [loadingSalesData, setLoadingSalesData] = useState(true);
  const [topProducts, setTopProducts] = useState([]);
  const [loadingTopProducts, setLoadingTopProducts] = useState(true);
  const [categories, setCategories] = useState(['Todas']);
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
  const [chartFilter, setChartFilter] = useState('Mensal');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [productsFilter, setProductsFilter] = useState('Mensal');

  const mesasAndamentoDisplay = useMemo(
    () =>
      mesasAndamento.map((mesa) => {
        return { ...mesa };
      }),
    [mesasAndamento],
  );

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      if (!idRestaurante) return;
      try {
        const categoriesFromDb = await getCategoriaNomes(idRestaurante);
        setCategories(['Todas', ...categoriesFromDb]);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories(['Todas']);
      }
    };
    fetchCategories();
  }, [idRestaurante]);

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

  // Fetch monthly sales data for chart
  useEffect(() => {
    const fetchMonthlySalesData = async () => {
      if (!tables || tables.length === 0 || !idRestaurante) {
        setLoadingSalesData(false);
        return;
      };

      try {
        setLoadingSalesData(true);
        const monthlyData = await getMonthlySalesData(idRestaurante, tables, chartFilter, categoryFilter);
        setSalesData(monthlyData);
      } catch (error) {
        console.error('Error fetching monthly sales data:', error);
        // Fallback to empty array on error
        setSalesData([]);
      } finally {
        console.log('finally');
        setLoadingSalesData(false);
      }
    };
    console.log('fetchMonthlySalesData');

    fetchMonthlySalesData();
  }, [tables, idRestaurante, chartFilter, categoryFilter]);

  // Fetch top selling products data
  useEffect(() => {
    const fetchTopProducts = async () => {
      if (!tables || tables.length === 0 || !idRestaurante) {
        setLoadingTopProducts(false);
        return;
      };

      try {
        setLoadingTopProducts(true);
        const productsData = await getTopSellingProducts(idRestaurante, tables, productsFilter);
        setTopProducts(productsData);
      } catch (error) {
        console.error('Error fetching top products:', error);
        setTopProducts([]);
      } finally {
        setLoadingTopProducts(false);
      }
    };

    fetchTopProducts();
  }, [tables, idRestaurante, productsFilter]);

  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  };

  if (!hasPermission('view_dashboard')) {
    return (
      <PermissionDeniedPage 
        message={t("noPermissionMessage")}
        description={t("contactAdmin")}
      />
    );
  }

  return (
    <>
      <AplicaCorDoSistema />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6 space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        {/* Orders in Progress Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400"></div>
              <h2 className="text-lg font-medium text-gray-900">
                {t("ordersInProgress")}
              </h2>
            </div>
            <Link to="/home/pedidos" className="text-sm text-gray-500 hover:text-gray-700">
              {t("viewAll")}
            </Link>
          </div>
          {mesasAndamentoDisplay.length === 0 ? (
            <p>{t("noOrdersInProgress")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {mesasAndamentoDisplay.slice(0, 4).map((mesa) => (
                <div key={mesa.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Notebook className="w-5 h-5 text-orange-500" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-medium text-gray-900">
                      {t("table")} {mesa.numero}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t("order")} {mesa.timeAgo}
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
                  <option value="Hoje">{t("today")}</option>
                  <option value="Semanal">{t("weekly")}</option>
                  <option value="Mensal">{t("monthly")}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-600">{t("totalSales")}</p>
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
                  <option value="Hoje">{t("today")}</option>
                  <option value="Semanal">{t("weekly")}</option>
                  <option value="Mensal">{t("monthly")}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-600">{t("totalOrders")}</p>
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
                  <option value="Hoje">{t("today")}</option>
                  <option value="Semanal">{t("weekly")}</option>
                  <option value="Mensal">{t("monthly")}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                {t("avgServiceTime")}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatServiceTime(stats.avgServiceTime)}
              </p>
            </div>
          </div>
        </div>

        {/* Charts and Products Section */}
        <PlanGate 
          requiredFeature={FEATURE_FLAGS.FULL_DASHBOARD}
          fallback={
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {t("premiumDashboard.title", "Análises Avançadas")}
                </h3>
                <p className="text-gray-600">
                  {t("premiumDashboard.description", "Acompanhe a evolução das vendas, produtos mais vendidos e muito mais com gráficos detalhados.")}
                </p>
                <p className="text-sm text-gray-500">
                  {t("premiumDashboard.upgrade", "Disponível nos planos Mensal e superiores")}
                </p>
              </div>
            </div>
          }
          showUpgradePrompt={true}
        >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Evolution Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {t("salesEvolution")}
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="text-sm text-gray-500 bg-transparent border-none cursor-pointer focus:outline-none appearance-none pr-6"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category === 'Todas' ? t("all") : category}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={chartFilter}
                    onChange={(e) => setChartFilter(e.target.value)}
                    className="text-sm text-gray-500 bg-transparent border-none cursor-pointer focus:outline-none appearance-none pr-6"
                  >
                    <option value="Mensal">{t("monthly")}</option>
                    <option value="Anual">{t("yearly")}</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Chart.js Bar Chart */}
            <div className="mt-8 h-80">
              {loadingSalesData ? (
                <div className="flex items-center justify-center w-full h-full">
                  <LoadingSpinnerDynamic />
                </div>
              ) : salesData.length > 0 ? (
                <Bar
                  data={{
                    labels: salesData.map(item => item.month),
                    datasets: [
                      {
                        data: salesData.map(item => item.value),
                        backgroundColor: '#FB923C',
                        borderColor: '#FB923C',
                        borderWidth: 0,
                        borderRadius: {
                          topLeft: 4,
                          topRight: 4,
                        },
                        borderSkipped: false,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return formatCurrency(context.parsed.y);
                          }
                        }
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: '#F3F4F6',
                          drawBorder: false,
                        },
                        ticks: {
                          color: '#9CA3AF',
                          font: {
                            size: 12,
                          },
                          callback: function(value) {
                            if (value >= 1000) {
                              return (value / 1000) + 'k';
                            }
                            return value;
                          }
                        },
                        border: {
                          display: false,
                        },
                      },
                      x: {
                        grid: {
                          display: false,
                          drawBorder: false,
                        },
                        ticks: {
                          color: '#9CA3AF',
                          font: {
                            size: 12,
                          },
                        },
                        border: {
                          display: false,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-500">
                  {t("noDataAvailable")}
                </div>
              )}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {t("topSellingProducts")}
              </h3>
              <div className="relative">
                <select
                  value={productsFilter}
                  onChange={(e) => setProductsFilter(e.target.value)}
                  className="text-sm text-gray-500 bg-transparent border-none cursor-pointer focus:outline-none appearance-none pr-6"
                >
                  <option value="Mensal">{t("monthly")}</option>
                  <option value="Anual">{t("yearly")}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {loadingTopProducts ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinnerDynamic />
              </div>
            ) : (
              <div className="space-y-0">
                {topProducts.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-sm font-medium text-gray-500 border-b border-gray-100 pb-3 mb-1">
                      <span>{t("name")}</span>
                      <span>{t("amountSold")}</span>
                    </div>
                    {topProducts.map((product, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between py-3 px-2 ${
                          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        }`}
                      >
                        <span className="text-sm text-gray-900 font-medium">{product.name}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(product.value)}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t("noProductsFound")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </PlanGate>
      </div>
    </>
  );
};

export default DashboardPage;
