import { ChevronDown, ChevronLeft, ChevronRight, SearchMagnifyingGlass } from "react-coolicons";
import UserListItem from "@/features/users/components/UserListItem";

const UserListTable = ({
  users,
  searchTerm,
  onSearchChange,
  itemsPerPage,
  onItemsPerPageChange,
  currentPage,
  onPageChange
}) => {
  // Filtrar usuários baseado na busca
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cálculo da paginação
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  return (
    <section className="mt-5 min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          {/* Barra de busca */}
          <form className="relative max-w-md">
            <label htmlFor="search" className="sr-only">
              Procure o Item do cardápio que deseja encontrar
            </label>

            <input
              type="search"
              id="search"
              placeholder="Procure o Item do cardápio que deseja encontrar"
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
        </header>

        {/* Tabela */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
          {/* Cabeçalho da tabela */}
          <div className="min-w-lg">
            <div className="grid grid-cols-4 gap-4 px-6 py-4 
            bg-gray-50 border-b border-gray-200">
              <div className="flex items-center
              text-sm font-medium text-gray-600">
                Nome
                <ChevronDown className="ml-1 w-4 h-4" />
              </div>

              <div className="flex items-center text-sm font-medium text-gray-600">
                E-mail
                <ChevronDown className="ml-1 w-4 h-4" />
              </div>

              <div className="flex items-center text-sm font-medium text-gray-600">
                Status
                <ChevronDown className="ml-1 w-4 h-4" />
              </div>

              {/* Espaço para botão de ações */}
              <div></div>
            </div>

            {/* Corpo da tabela */}
            <div className="divide-y divide-gray-200">
              {currentUsers.map((user) => (
                <UserListItem key={user.id} user={user} />
              ))}
            </div>
          </div>
        </section>

        {/* Rodapé com paginação */}
        <footer className="flex flex-wrap items-center justify-between gap-4
        mt-6 sm:mx-6">
          <p className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </p>

          <nav className="flex flex-wrap items-center space-x-4 gap-4">
            {/* Botões de navegação */}
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

            {/* Seletor de itens por página */}
            <div className="flex items-center space-x-2">
              <label htmlFor="itemsPerPage" className="text-sm text-zinc-500">
                Mostrar
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                className="border border-gray-300 rounded-lg p-3 text-sm text-yellow-500 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value={10}>10 Linhas</option>
                <option value={25}>25 Linhas</option>
                <option value={50}>50 Linhas</option>
                <option value={100}>100 Linhas</option>
              </select>
              <span className="text-sm text-zinc-500">
                de {filteredUsers.length} Registros
              </span>
            </div>
          </nav>
        </footer>
      </div>
    </section>
  );
};

export default UserListTable;