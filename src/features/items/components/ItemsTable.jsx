import { useState } from "react";
import { MoreHorizontal, EditPencil01, UnfoldMore, TrashFull, ChevronLeft, ChevronRight, ChevronDown } from "react-coolicons";

const ItemsTable = ({
  items = [],
  loading,
  error,
  itemsPerPage,
  onItemsPerPageChange,
  currentPage,
  onPageChange,
  onEdit,
  onView,
  onDelete,
  totalItems = 0
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const toggleDropdown = (itemId) => {
    setOpenDropdown(openDropdown === itemId ? null : itemId);
  };

  const getStockStatus = (current, low, medium) => {
    if (current <= low) {
      return {
        text: "Estoque baixo",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-100"
      };
    } else if (current <= medium) {
      return {
        text: "Estoque médio",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-100"
      };
    } else {
      return {
        text: "Estoque alto",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-100"
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

  // No items found
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum item encontrado</p>
      </div>
    );
  }

  return (
    <>
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto sm:overflow-visible min-h-[50vh]">
        <div className="min-w-lg">
          <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center text-sm font-medium text-gray-600">
              Nome
              <ChevronDown className="ml-1 w-4 h-4" />
            </div>
            <div className="flex items-center text-sm font-medium text-gray-600">
              Marca
              <ChevronDown className="ml-1 w-4 h-4" />
            </div>
            <div className="flex items-center text-sm font-medium text-gray-600">
              Estoque
              <ChevronDown className="ml-1 w-4 h-4" />
            </div>
            <div></div>
          </div>

          <div className="divide-y divide-gray-200">
            {items.map((item) => {
              const status = getStockStatus(
                item.estoqueAtual || 0,
                item.estoqueBaixo,
                item.estoqueMedio
              );

              return (
                <div key={item.id} className="grid grid-cols-4 gap-4 px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center text-sm text-gray-900">
                    {item.nome}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    {item.marca || '-'}
                  </div>
                  <div className="flex items-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.borderColor} ${status.color}`}>
                      {item.estoqueAtual || 0} {(item.unidadeArmazenamento || 'un').toLowerCase() + (item.estoqueAtual > 1 ? 's' : '')}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => toggleDropdown(item.id)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                      {openDropdown === item.id && (
                        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-gray-300 ring-opacity-5 focus:outline-none">
                          <button
                            onClick={() => {
                              onView(item);
                              setOpenDropdown(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-md"
                          >
                            <UnfoldMore className="mr-2 h-4 w-4" />
                            Visualizar
                          </button>
                          <button
                            onClick={() => {
                              onEdit(item);
                              setOpenDropdown(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <EditPencil01 className="mr-2 h-4 w-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              onDelete(item);
                              setOpenDropdown(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 last:rounded-b-md"
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
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 mt-6">
        <p className="text-sm text-gray-600">
          Página {currentPage} de {totalPages}
        </p>

        <nav className="flex flex-wrap items-center space-x-4 gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 cursor-pointer rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
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
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
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
    </>
  );
};

export default ItemsTable;