import { useState } from "react";
import { MoreHorizontal, EditPencil01, UnfoldMore, TrashFull, ChevronLeft, ChevronRight } from "react-coolicons";

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

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 25, 50];

const ItemsTable = ({
  items = [],
  onEdit = () => { },
  onView = () => { },
  onDelete = () => { },
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange = () => { },
  onItemsPerPageChange = () => { }
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const toggleDropdown = (itemId) => {
    setOpenDropdown(openDropdown === itemId ? null : itemId);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    onItemsPerPageChange(newItemsPerPage);
  };

  return (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Marca
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estoque Atual
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length > 0 ? (
              items.map((item) => {
                const status = getStockStatus(
                  item.estoque?.atual || 0,
                  item.estoque?.baixo,
                  item.estoque?.medio
                );
                console.log(status);

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.marca || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`rounded-full py-2 px-4 ${status.bgColor} ${status.borderColor}`}>
                          <span className={`text-sm font-medium ${status.color}`}>
                            {item.estoque?.atual || 0} {item.unidadeArmazenamento || 'un'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => toggleDropdown(item.id)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {openDropdown === item.id && (
                          <div className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhum item encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
          >
            Anterior
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
          >
            Próximo
          </button>
        </div>

        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-700">Mostrar</p>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="block w-20 rounded-md border-gray-300 py-1 pl-3 pr-8 text-sm focus:border-yellow-500 focus:outline-none focus:ring-yellow-500"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-700">de <span className="font-medium">{totalItems}</span> registros</p>

            <div className="flex space-x-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                  }`}
              >
                <span className="sr-only">Anterior</span>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-l-0 border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                  }`}
              >
                <span className="sr-only">Próximo</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemsTable;