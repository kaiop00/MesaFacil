import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import {  
    getIfoodCredentials
} from "@/features/integrations/ifood/services/ifoodService";
import {
    requestIfoodUserCode,
    exchangeAuthorizationCode,
    getIfoodIntegrationStatus,
    revokeIfoodAuth,
    setIfoodIntegrationEnabled,
    triggerManualIfoodPoll
} from "@/features/integrations/ifood/services/ifoodAuthService";
import { 
    autoSyncPendingIfoodOrders,
    getIfoodOrderStats 
} from "@/features/integrations/ifood/services/ifoodOrderSyncService";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { CheckboxCheck, TriangleWarning, ArrowReload02, Link } from "react-coolicons";

const IfoodIntegrationPage = () => {
    const { idRestaurante } = useAuth();
    const { notify } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [polling, setPolling] = useState(false);
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    
    // UserCode flow states
    const [userCode, setUserCode] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [requestingUserCode, setRequestingUserCode] = useState(false);
    const [exchangingCode, setExchangingCode] = useState(false);
    const [authorizationCode, setAuthorizationCode] = useState("");
    
    const [integrationStatus, setIntegrationStatus] = useState({
        enabled: false,
        isAuthorized: false,
        needsReauthorization: false,
    });
    
    const [credentials, setCredentials] = useState({
        merchantId: "",
        enabled: true,
    });

    useEffect(() => {
        const loadData = async () => {
            await Promise.all([loadCredentials(), loadIntegrationStatus(), loadStats()]);
        };
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idRestaurante]);

    const loadCredentials = async () => {
        try {
            setLoading(true);
            const data = await getIfoodCredentials(idRestaurante);
            if (data) {
                setCredentials({
                    merchantId: data.merchantId || "",
                    enabled: data.enabled ?? true,
                });
            }
        } catch (error) {
            console.error("Error loading credentials:", error);
            notify("Erro ao carregar configurações do iFood", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadIntegrationStatus = async () => {
        try {
            const status = await getIfoodIntegrationStatus(idRestaurante);
            setIntegrationStatus(status);
        } catch (error) {
            console.error("Error loading integration status:", error);
        }
    };

    const loadStats = async () => {
        try {
            setLoadingStats(true);
            const statsData = await getIfoodOrderStats(idRestaurante);
            setStats(statsData);
        } catch (error) {
            console.error("Error loading stats:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleRequestUserCode = async () => {
        try {
            setRequestingUserCode(true);
            const result = await requestIfoodUserCode(idRestaurante);
            setUserCode(result.userCode);
            setVerificationCode(result.verificationCode);
            notify("Código de usuário gerado! Acesse o Portal do iFood para autorizar.", "success");
        } catch (error) {
            console.error("Error requesting userCode:", error);
            notify(error.message || "Erro ao solicitar código de usuário", "error");
        } finally {
            setRequestingUserCode(false);
        }
    };

    const handleExchangeCode = async () => {
        if (!authorizationCode.trim()) {
            notify("Por favor, insira o código de autorização", "warning");
            return;
        }

        try {
            setExchangingCode(true);
            await exchangeAuthorizationCode(idRestaurante, authorizationCode);
            notify("Autorização concluída com sucesso!", "success");
            
            // Reset states
            setUserCode("");
            setVerificationCode("");
            setAuthorizationCode("");
            
            // Reload data
            await loadIntegrationStatus();
            await loadCredentials();
        } catch (error) {
            console.error("Error exchanging code:", error);
            notify(error.message || "Erro ao trocar código de autorização", "error");
        } finally {
            setExchangingCode(false);
        }
    };

    const handleRevoke = async () => {
        if (!confirm("Tem certeza que deseja desconectar sua conta do iFood?")) {
            return;
        }

        try {
            await revokeIfoodAuth(idRestaurante);
            notify("Autorização revogada com sucesso", "success");
            await loadIntegrationStatus();
        } catch (error) {
            console.error("Error revoking authorization:", error);
            notify("Erro ao revogar autorização", "error");
        }
    };

    const handleToggleEnabled = async () => {
        try {
            const newEnabled = !credentials.enabled;
            await setIfoodIntegrationEnabled(idRestaurante, newEnabled);
            setCredentials({ ...credentials, enabled: newEnabled });
            notify(
                newEnabled ? "Integração ativada" : "Integração desativada",
                "success"
            );
        } catch (error) {
            console.error("Error toggling integration:", error);
            notify("Erro ao alterar status da integração", "error");
        }
    };

    const handleManualPoll = async () => {
        try {
            setPolling(true);
            const result = await triggerManualIfoodPoll(idRestaurante);
            notify(`Busca manual concluída! ${result.eventCount} eventos processados.`, "success");
            await loadStats();
        } catch (error) {
            console.error("Error triggering manual poll:", error);
            notify("Erro ao buscar pedidos manualmente", "error");
        } finally {
            setPolling(false);
        }
    };

    const handleSyncAll = async () => {
        try {
            setSyncing(true);
            const results = await autoSyncPendingIfoodOrders(idRestaurante);
            
            if (results.failed > 0) {
                notify(
                    `Sincronizados ${results.synced} de ${results.total} pedidos. ${results.failed} falharam.`,
                    "warning"
                );
            } else {
                notify(`${results.synced} pedidos sincronizados com sucesso!`, "success");
            }
            
            await loadStats();
        } catch (error) {
            console.error("Error syncing orders:", error);
            notify("Erro ao sincronizar pedidos", "error");
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <LoadingSpinnerDynamic size={10} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 mt-24 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Integração iFood</h1>
                <p className="mt-2 text-gray-600">
                    Configure a integração com o iFood para receber pedidos automaticamente
                </p>
            </div>

            {/* Authorization Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Status da Autorização</h2>
                    {integrationStatus.isAuthorized ? (
                        <span className="flex items-center text-green-600">
                            <CheckboxCheck className="w-5 h-5 mr-2" />
                            Conectado
                        </span>
                    ) : (
                        <span className="flex items-center text-red-600">
                            <TriangleWarning className="w-5 h-5 mr-2" />
                            Não Conectado
                        </span>
                    )}
                </div>

                {integrationStatus.needsReauthorization && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-yellow-800">
                            <strong>Atenção:</strong> Sua autorização expirou ou foi revogada. 
                            Por favor, autorize novamente para continuar recebendo pedidos.
                        </p>
                    </div>
                )}

                {integrationStatus.lastError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-red-800">
                            <strong>Último Erro:</strong> {integrationStatus.lastError}
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    {integrationStatus.merchantId && (
                        <div className="text-sm">
                            <span className="text-gray-600">Merchant ID:</span>
                            <span className="ml-2 font-mono text-gray-900">{integrationStatus.merchantId}</span>
                        </div>
                    )}

                    {integrationStatus.authorizedAt && (
                        <div className="text-sm">
                            <span className="text-gray-600">Autorizado em:</span>
                            <span className="ml-2 text-gray-900">
                                {new Date(integrationStatus.authorizedAt.seconds * 1000).toLocaleString('pt-BR')}
                            </span>
                        </div>
                    )}

                    <div className="flex gap-3 flex-wrap">
                        {!integrationStatus.isAuthorized ? (
                            !userCode ? (
                                <button
                                    onClick={handleRequestUserCode}
                                    disabled={requestingUserCode}
                                    className="flex items-center px-4 py-2 bg-primary-dynamic text-white rounded hover:opacity-90 disabled:opacity-50"
                                >
                                    <Link className="w-5 h-5 mr-2" />
                                    {requestingUserCode ? "Gerando código..." : "Gerar Código de Autorização"}
                                </button>
                            ) : (
                                <div className="w-full space-y-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-green-900 mb-2">Passo 1: Código de Verificação</h4>
                                        <p className="text-sm text-green-800 mb-3">
                                            Use este código no Portal do iFood para autorizar o MesaFacil:
                                        </p>
                                        <div className="bg-white rounded p-3 mb-3">
                                            <div className="text-3xl font-bold text-center text-green-600 tracking-wider">
                                                {verificationCode}
                                            </div>
                                        </div>
                                        <a 
                                            href="https://portal.ifood.com.br" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-sm text-green-700 hover:text-green-900 underline"
                                        >
                                            Abrir Portal do iFood →
                                        </a>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-blue-900 mb-2">Passo 2: Código de Autorização</h4>
                                        <p className="text-sm text-blue-800 mb-3">
                                            Após autorizar no Portal do iFood, você receberá um código de autorização. 
                                            Cole-o aqui:
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={authorizationCode}
                                                onChange={(e) => setAuthorizationCode(e.target.value)}
                                                placeholder="Cole o código de autorização"
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-dynamic"
                                            />
                                            <button
                                                onClick={handleExchangeCode}
                                                disabled={exchangingCode || !authorizationCode.trim()}
                                                className="px-4 py-2 bg-primary-dynamic text-white rounded hover:opacity-90 disabled:opacity-50"
                                            >
                                                {exchangingCode ? "Conectando..." : "Conectar"}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setUserCode("");
                                            setVerificationCode("");
                                            setAuthorizationCode("");
                                        }}
                                        className="text-sm text-gray-600 hover:text-gray-900 underline"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )
                        ) : (
                            <>
                                <button
                                    onClick={handleRevoke}
                                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    <Link className="w-5 h-5 mr-2" />
                                    Desconectar
                                </button>
                                <button
                                    onClick={handleToggleEnabled}
                                    className={`px-4 py-2 rounded ${
                                        credentials.enabled
                                            ? "bg-gray-600 text-white hover:bg-gray-700"
                                            : "bg-green-600 text-white hover:bg-green-700"
                                    }`}
                                >
                                    {credentials.enabled ? "Desativar Integração" : "Ativar Integração"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Card */}
            {integrationStatus.isAuthorized && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Pedidos do iFood</h2>
                        {credentials.enabled ? (
                            <span className="flex items-center text-green-600">
                                <CheckboxCheck className="w-5 h-5 mr-2" />
                                Ativo
                            </span>
                        ) : (
                            <span className="flex items-center text-red-600">
                                <TriangleWarning className="w-5 h-5 mr-2" />
                                Inativo
                            </span>
                        )}
                    </div>

                    {/* Statistics */}
                    {loadingStats ? (
                        <div className="flex justify-center py-4">
                            <LoadingSpinnerDynamic size={6} />
                        </div>
                    ) : stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                                <div className="text-sm text-gray-600">Total de Pedidos</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-green-600">{stats.synced}</div>
                                <div className="text-sm text-gray-600">Sincronizados</div>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                                <div className="text-sm text-gray-600">Pendentes</div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                                <div className="text-sm text-gray-600">Com Erro</div>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 flex gap-3">
                        {stats && stats.pending > 0 && (
                            <button
                                onClick={handleSyncAll}
                                disabled={syncing}
                                className="flex items-center px-4 py-2 bg-primary-dynamic text-white rounded hover:opacity-90 disabled:opacity-50"
                            >
                                <ArrowReload02 className={`w-5 h-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                {syncing ? "Sincronizando..." : `Sincronizar ${stats.pending} Pedidos Pendentes`}
                            </button>
                        )}
                        <button
                            onClick={handleManualPoll}
                            disabled={polling}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            <ArrowReload02 className={`w-5 h-5 mr-2 ${polling ? 'animate-spin' : ''}`} />
                            {polling ? "Buscando..." : "Buscar Novos Pedidos"}
                        </button>
                    </div>
                </div>
            )}

            {/* Information */}
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <h2 className="text-xl font-semibold">Sobre a Integração</h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Aplicativo Distribuído com UserCode</h3>
                    <p className="text-sm text-blue-800 mb-2">
                        Esta integração usa o modelo de <strong>Aplicativo Distribuído</strong> do iFood, 
                        onde cada restaurante autoriza individualmente o acesso aos seus pedidos através 
                        de um código de verificação.
                    </p>
                    <p className="text-sm text-blue-800">
                        É um processo simples e seguro: você gera um código, autoriza no Portal do iFood, 
                        e depois cola o código de autorização aqui no MesaFacil.
                    </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-900 mb-2">Polling Automático</h3>
                    <p className="text-sm text-purple-800 mb-2">
                        Os pedidos são buscados automaticamente a cada 2 minutos através do sistema de 
                        polling do iFood.
                    </p>
                    <p className="text-sm text-purple-800">
                        Você também pode clicar em "Buscar Novos Pedidos" para forçar uma busca imediata.
                    </p>
                </div>

                <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">Como Funciona:</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                        <li>Clique em "Gerar Código de Autorização" para obter um código de verificação</li>
                        <li>Acesse o Portal do iFood e insira o código de verificação fornecido</li>
                        <li>Autorize o MesaFacil a acessar seus pedidos no Portal do iFood</li>
                        <li>Copie o código de autorização que o iFood fornece</li>
                        <li>Cole o código de autorização aqui no MesaFacil e clique em "Conectar"</li>
                        <li>Pronto! Os pedidos serão automaticamente buscados a cada 2 minutos</li>
                        <li>Pedidos do iFood aparecem em uma mesa virtual chamada "iFood"</li>
                    </ol>
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="font-semibold text-yellow-900 mb-2">Precisa de Ajuda?</h3>
                <p className="text-sm text-yellow-800">
                    Se você tiver problemas com a integração, verifique se sua conta iFood está ativa 
                    e se você tem permissões de administrador. Para mais informações, consulte a{" "}
                    <a 
                        href="https://developer.ifood.com.br" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="underline font-medium"
                    >
                        documentação do iFood
                    </a>.
                </p>
            </div>
        </div>
    );
};

export default IfoodIntegrationPage;
