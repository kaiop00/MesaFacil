import { useState } from "react";
import {
  MoreHorizontal,
  EditPencil01,
  UnfoldMore,
  TrashFull,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SearchMagnifyingGlass,
} from "react-coolicons";

const MovementsTable = ({
  movements = [],
  loading,
  error,
  itemsPerPage,
  onItemsPerPageChange,
  currentPage,
  onPageChange,
  onEdit,
  onView,
  onDelete,
  totalItems = 0,
  searchTerm,
  onSearchChange,
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const toggleDropdown = (movementId) => {
    setOpenDropdown(openDropdown === movementId ? null : movementId);
  };

  const getBalanceStatus = (balance) => {
    // Different color logic based on balance value and type
    if (balance <= 10) {
      return {
        color: "text-white",
        bgColor: "bg-red-500",
      };
    } else if (balance <= 15) {
      return {
        color: "text-white",
        bgColor: "bg-yellow-500",
      };
    } else {
      return {
        color: "text-white",
        bgColor: "bg-blue-500",
      };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        Carregando...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto p-6 sm:overflow-visible min-h-[50vh]">
        {/* Search Bar */}
        <div className="mb-6">
          <form className="relative max-w-md">
            <label htmlFor="search" className="sr-only">
              Procure a movimentação que deseja encontrar
            </label>

            <input
              type="search"
              id="search"
              placeholder="Procure a movimentação que deseja encontrar"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-4 pr-12 py-3
              border border-gray-300 rounded-lg
              bg-white text-gray-900 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />

            <SearchMagnifyingGlass className="absolute right-4 top-1/2
            transform -translate-y-1/2 
            text-orange-500 w-5 h-5" />
          </form>
        </div>

        <div className="min-w-lg rounded-lg shadow-sm border border-gray-200">
          {/* Table Header */}
          <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center text-sm font-medium text-gray-600">
              Nome
              <ChevronDown className="ml-1 w-4 h-4" />
            </div>
            <div className="flex items-center text-sm font-medium text-gray-600">
              Tipo
              <ChevronDown className="ml-1 w-4 h-4" />
            </div>
            <div className="flex items-center text-sm font-medium text-gray-600">
              Qtd
              <ChevronDown className="ml-1 w-4 h-4" />
            </div>
            <div className="flex items-center text-sm font-medium text-gray-600">
              Saldo
              <ChevronDown className="ml-1 w-4 h-4" />
            </div>
            <div></div>
          </div>

          {/* Table Body */}
          {movements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum movimento encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {movements.map((movement) => {
                const balanceStatus = getBalanceStatus(movement.saldo);

                return (
                  <div
                    key={movement.id}
                    className="grid grid-cols-5 gap-4 px-6 py-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center text-sm text-gray-900">
                      {movement.itemNome || 'Sem nome'}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      {movement.tipoMovimentacao || 'Não especificado'}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      {movement.quantidade} {movement.quantidade > 1 ? `${movement.unidadeArmazenamento}s` : movement.unidadeArmazenamento || ''}
                    </div>
                    <div className="flex items-center">
                      <div
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium min-w-[40px] ${balanceStatus.bgColor} ${balanceStatus.color}`}
                      >
                        {movement.novoSaldo}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => toggleDropdown(movement.id)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {openDropdown === movement.id && (
                          <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <button
                              onClick={() => {
                                onView?.(movement);
                                setOpenDropdown(null);
                              }}
                              className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-md"
                            >
                              <UnfoldMore className="mr-2 h-4 w-4" />
                              Visualizar
                            </button>
                            <button
                              onClick={() => {
                                onEdit?.(movement);
                                setOpenDropdown(null);
                              }}
                              className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <EditPencil01 className="mr-2 h-4 w-4" />
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                onDelete?.(movement);
                                setOpenDropdown(null);
                              }}
                              className="flex w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 last:rounded-b-md"
                            >
                              <TrashFull className="mr-2 h-4 w-4" />
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Pagination Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-4 mt-6">
          <p className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </p>

          <nav className="flex flex-wrap items-center space-x-4 gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 cursor-pointer rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() =>
                  onPageChange?.(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 cursor-pointer rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <label htmlFor="itemsPerPage" className="text-sm text-zinc-500">
                Mostrar
              </label>

              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange?.(Number(e.target.value))}
                className="border border-gray-300 rounded-lg p-2 text-sm text-yellow-500 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value={10}>10 Linhas</option>
                <option value={25}>25 Linhas</option>
                <option value={50}>50 Linhas</option>
                <option value={100}>100 Linhas</option>
              </select>

              <span className="text-sm text-zinc-500">
                de {totalItems} Registros
              </span>
            </div>
          </nav>
        </footer>
      </section>
    </>
  );
};

export default MovementsTable;
