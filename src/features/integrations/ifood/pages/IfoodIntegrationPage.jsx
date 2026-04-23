import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { useSearchParams } from "react-router-dom";
import {  
    getIfoodCredentials
} from "@/features/integrations/ifood/services/ifoodService";
import {
    requestIfoodUserCode,
    exchangeAuthorizationCode,
    getIfoodIntegrationStatus,
    revokeIfoodAuth,
    setIfoodIntegrationEnabled,
    triggerManualIfoodPoll,
    clearIfoodErrors
} from "@/features/integrations/ifood/services/ifoodAuthService";
import { 
    autoSyncPendingIfoodOrders,
    getIfoodOrderStats 
} from "@/features/integrations/ifood/services/ifoodOrderSyncService";
import LoadingSpinnerDynamic from "@/components/LoadingSpinnerDynamic";
import { CheckboxCheck, TriangleWarning, ArrowReload02, Link, Settings } from "react-coolicons";
import IfoodItemMappingModal from "@/features/integrations/ifood/components/IfoodItemMappingModal";
import IfoodDisputeList from "@/features/integrations/ifood/components/IfoodDisputeList";
import { useIfoodRetry } from "@/features/integrations/ifood/hooks/useIfoodRetry";

const IfoodIntegrationPage = () => {
    const { idRestaurante } = useAuth();
    const { notify } = useToast();
    const [searchParams] = useSearchParams();
    const disputesSectionRef = useRef(null);
    
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [showMappingModal, setShowMappingModal] = useState(false);
    
    // UserCode flow states
    const [userCode, setUserCode] = useState("");
    const [, setVerificationUrlComplete] = useState("");
    const [authorizationCode, setAuthorizationCode] = useState("");
    
    // Retry hooks for iFood API calls
    const userCodeRetry = useIfoodRetry();
    const exchangeCodeRetry = useIfoodRetry();
    const pollRetry = useIfoodRetry();
    const syncRetry = useIfoodRetry();
    const revokeRetry = useIfoodRetry();
    
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

    // Auto-scroll to disputes section when navigated via ?tab=disputes
    useEffect(() => {
        if (searchParams.get("tab") === "disputes" && disputesSectionRef.current) {
            setTimeout(() => {
                disputesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 300);
        }
    }, [searchParams]);

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
            console.log('[getIfoodIntegrationStatus] ', status);
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
            await userCodeRetry.executeWithRetry(
                () => requestIfoodUserCode(idRestaurante),
                {
                    actionName: "geração do código de usuário",
                    onSuccess: (result) => {
                        setUserCode(result.userCode);
                        setVerificationUrlComplete(result.verificationUrlComplete || "");
                        notify("Código de usuário gerado! Acesse o Portal do iFood para autorizar.", "success");
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(
                            `A API do iFood está instável. Tentativa ${attempt}/${maxAttempts}. Reenviando em ${nextAttemptIn}s...`,
                            "warning"
                        );
                    },
                    onError: (error) => {
                        const errorMessage = error?.message || "";
                        const is403Error = errorMessage.includes("INTERNAL") || 
                                           errorMessage.toLowerCase().includes("FirebaseError: INTERNAL");
                        
                        if (is403Error) {
                            notify(
                                "Não foi possível conectar com o iFood após várias tentativas. A API pode estar temporariamente instável. Tente novamente mais tarde.",
                                "error"
                            );
                        } else {
                            notify(error.message || "Erro ao solicitar código de usuário", "error");
                        }
                    },
                }
            );
        } catch (error) {
            console.error("Error requesting userCode:", error);
        }
    };

    const handleExchangeCode = async () => {
        if (!authorizationCode.trim()) {
            notify("Por favor, insira o código de autorização", "warning");
            return;
        }

        try {
            await exchangeCodeRetry.executeWithRetry(
                () => exchangeAuthorizationCode(idRestaurante, authorizationCode),
                {
                    actionName: "troca do código de autorização",
                    onSuccess: async () => {
                        notify("Autorização concluída com sucesso!", "success");
                        
                        // Reset states
                        setUserCode("");
                        setVerificationUrlComplete("");
                        setAuthorizationCode("");
                        
                        // Reload data
                        await loadIntegrationStatus();
                        await loadCredentials();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(
                            `A API do iFood está instável. Tentativa ${attempt}/${maxAttempts}. Reenviando em ${nextAttemptIn}s...`,
                            "warning"
                        );
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao trocar código de autorização", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error exchanging code:", error);
        }
    };

    const handleRevoke = async () => {
        if (!confirm("Tem certeza que deseja desconectar sua conta do iFood?")) {
            return;
        }

        try {
            await revokeRetry.executeWithRetry(
                () => revokeIfoodAuth(idRestaurante),
                {
                    actionName: "revogação da autorização",
                    onSuccess: async () => {
                        notify("Autorização revogada com sucesso", "success");
                        setUserCode("");
                        setVerificationUrlComplete("");
                        setAuthorizationCode("");
                        await loadIntegrationStatus();
                        await loadCredentials();
                        await loadStats();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(
                            `Tentativa ${attempt}/${maxAttempts} falhou. Reenviando em ${nextAttemptIn}s...`,
                            "warning"
                        );
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao revogar autorização", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error revoking authorization:", error);
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
            await pollRetry.executeWithRetry(
                () => triggerManualIfoodPoll(idRestaurante),
                {
                    actionName: "busca de pedidos",
                    onSuccess: async (result) => {
                        notify(`Busca manual concluída! ${result.eventCount} eventos processados.`, "success");
                        
                        // Clear any previous errors since polling worked successfully
                        if (integrationStatus.lastError) {
                            await clearIfoodErrors(idRestaurante);
                            await loadIntegrationStatus();
                        }
                        
                        await loadStats();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(
                            `Tentativa ${attempt}/${maxAttempts} falhou. Reenviando em ${nextAttemptIn}s...`,
                            "warning"
                        );
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao buscar pedidos manualmente", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error triggering manual poll:", error);
            await loadIntegrationStatus();
        }
    };

    const handleSyncAll = async () => {
        try {
            setSyncing(true);
            await syncRetry.executeWithRetry(
                () => autoSyncPendingIfoodOrders(idRestaurante),
                {
                    actionName: "sincronização de pedidos",
                    onSuccess: async (results) => {
                        if (results.failed > 0) {
                            notify(
                                `Sincronizados ${results.synced} de ${results.total} pedidos. ${results.failed} falharam.`,
                                "warning"
                            );
                        } else {
                            notify(`${results.synced} pedidos sincronizados com sucesso!`, "success");
                            
                            // Clear any previous errors since sync worked successfully
                            if (integrationStatus.lastError) {
                                await clearIfoodErrors(idRestaurante);
                                await loadIntegrationStatus();
                            }
                        }
                        
                        await loadStats();
                    },
                    onRetry: ({ attempt, maxAttempts, nextAttemptIn }) => {
                        notify(
                            `Tentativa ${attempt}/${maxAttempts} falhou. Reenviando em ${nextAttemptIn}s...`,
                            "warning"
                        );
                    },
                    onError: (error) => {
                        notify(error.message || "Erro ao sincronizar pedidos", "error");
                    },
                }
            );
        } catch (error) {
            console.error("Error syncing orders:", error);
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

                {/* Only show error if not currently authorized or needs reauthorization */}
                {integrationStatus.lastError && (!integrationStatus.isAuthorized || integrationStatus.needsReauthorization) && (
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
                                <div className="flex flex-col">
                                    <button
                                        onClick={handleRequestUserCode}
                                        disabled={userCodeRetry.isExecuting}
                                        className="flex items-center px-4 py-2 bg-primary-dynamic text-white rounded hover:opacity-90 disabled:opacity-50"
                                    >
                                        {userCodeRetry.isExecuting ? (
                                            <LoadingSpinnerDynamic size={5} className="mr-2" />
                                        ) : (
                                            <Link className="w-5 h-5 mr-2" />
                                        )}
                                        {userCodeRetry.isRetrying 
                                            ? `Aguardando (${userCodeRetry.countdown}s)...` 
                                            : userCodeRetry.isExecuting 
                                                ? "Gerando código..." 
                                                : "Gerar Código de Autorização"}
                                    </button>
                                    {userCodeRetry.isRetrying && (
                                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                                            <div className="flex items-center gap-2">
                                                <LoadingSpinnerDynamic size={3} />
                                                <span>
                                                    Tentativa {userCodeRetry.currentAttempt}/{userCodeRetry.maxAttempts}. 
                                                    Próxima tentativa em {userCodeRetry.countdown}s...
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full space-y-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-green-900 mb-2">Passo 1: Código de Verificação</h4>
                                        <p className="text-sm text-green-800 mb-3">
                                            Use este código no Portal do iFood para autorizar o MesaFacil. Busque por "Apps" no menu do portal e aperte o botão "Ativar aplicativo por código":
                                        </p>
                                        <div className="bg-white rounded p-3 mb-3">
                                            <div className="text-3xl font-bold text-center text-green-600 tracking-wider">
                                                {userCode}
                                            </div>
                                        </div>
                                        <a 
                                            href="https://portal.ifood.com.br/apps" 
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
                                                disabled={exchangeCodeRetry.isExecuting}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-dynamic disabled:opacity-50"
                                            />
                                            <button
                                                onClick={handleExchangeCode}
                                                disabled={exchangeCodeRetry.isExecuting || !authorizationCode.trim()}
                                                className="px-4 py-2 bg-primary-dynamic text-white rounded hover:opacity-90 disabled:opacity-50"
                                            >
                                                {exchangeCodeRetry.isRetrying 
                                                    ? `Aguardando (${exchangeCodeRetry.countdown}s)...` 
                                                    : exchangeCodeRetry.isExecuting 
                                                        ? "Conectando..." 
                                                        : "Conectar"}
                                            </button>
                                        </div>
                                        {exchangeCodeRetry.isRetrying && (
                                            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                                                <div className="flex items-center gap-2">
                                                    <LoadingSpinnerDynamic size={3} />
                                                    <span>
                                                        Tentativa {exchangeCodeRetry.currentAttempt}/{exchangeCodeRetry.maxAttempts}. 
                                                        Próxima tentativa em {exchangeCodeRetry.countdown}s...
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setUserCode("");
                                            setVerificationUrlComplete("");
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
                                    disabled={revokeRetry.isExecuting}
                                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                    {revokeRetry.isExecuting ? (
                                        <LoadingSpinnerDynamic size={5} className="mr-2" />
                                    ) : (
                                        <Link className="w-5 h-5 mr-2" />
                                    )}
                                    {revokeRetry.isRetrying 
                                        ? `Aguardando (${revokeRetry.countdown}s)...` 
                                        : revokeRetry.isExecuting 
                                            ? "Desconectando..." 
                                            : "Desconectar"}
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
                                <button
                                    onClick={() => setShowMappingModal(true)}
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    <Settings className="w-5 h-5 mr-2" />
                                    Mapear Itens do Cardápio
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

                    <div className="mt-4 flex flex-col gap-3">
                        {/* Retry Status Banner */}
                        {(pollRetry.isRetrying || syncRetry.isRetrying) && (
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                                <div className="flex items-center gap-2">
                                    <LoadingSpinnerDynamic size={4} />
                                    <span>
                                        {pollRetry.isRetrying && `Buscando pedidos... Tentativa ${pollRetry.currentAttempt}/${pollRetry.maxAttempts}. Próxima em ${pollRetry.countdown}s`}
                                        {syncRetry.isRetrying && `Sincronizando... Tentativa ${syncRetry.currentAttempt}/${syncRetry.maxAttempts}. Próxima em ${syncRetry.countdown}s`}
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex gap-3 flex-wrap">
                            {stats && stats.pending > 0 && (
                                <button
                                    onClick={handleSyncAll}
                                    disabled={syncing || syncRetry.isExecuting}
                                    className="flex items-center px-4 py-2 bg-primary-dynamic text-white rounded hover:opacity-90 disabled:opacity-50"
                                >
                                    <ArrowReload02 className={`w-5 h-5 mr-2 ${syncRetry.isExecuting ? 'animate-spin' : ''}`} />
                                    {syncRetry.isRetrying 
                                        ? `Aguardando (${syncRetry.countdown}s)...` 
                                        : syncRetry.isExecuting 
                                            ? "Sincronizando..." 
                                            : `Sincronizar ${stats.pending} Pedidos Pendentes`}
                                </button>
                            )}
                            <button
                                onClick={handleManualPoll}
                                disabled={pollRetry.isExecuting}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                <ArrowReload02 className={`w-5 h-5 mr-2 ${pollRetry.isExecuting ? 'animate-spin' : ''}`} />
                                {pollRetry.isRetrying 
                                    ? `Aguardando (${pollRetry.countdown}s)...` 
                                    : pollRetry.isExecuting 
                                        ? "Buscando..." 
                                        : "Buscar Novos Pedidos"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Handshake Disputes / Negotiations Section */}
            {integrationStatus.isAuthorized && (
                <div ref={disputesSectionRef} className="bg-white rounded-lg shadow p-6">
                    <IfoodDisputeList />
                </div>
            )}

            {/* Information */}
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <h2 className="text-xl font-semibold">Sobre a Integração</h2>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-800 mb-2">
                        Os pedidos são buscados automaticamente a cada 1 minuto através do sistema de 
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
                        <li>Acesse o Portal do iFood, depois "Apps" e insira o código de verificação fornecido</li>
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

            {/* Item Mapping Modal */}
            <IfoodItemMappingModal 
                isOpen={showMappingModal} 
                onClose={() => setShowMappingModal(false)} 
            />
        </div>
    );
};

export default IfoodIntegrationPage;
