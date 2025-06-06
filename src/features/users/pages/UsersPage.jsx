import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import CardHeader from "@/components/CardHeader";
import UserListTable from "@/features/users/components/UserListTable";
import NewUserModal from "@/features/users/components/modals/NewUserModal";

const UsersPage = () => {
  const { role } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNew = () => {
    setIsModalOpen(true);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Dados de exemplo
  const users = [
    { id: 1, name: 'Garçom 1', email: 'email@gmail.com', status: 'Ativo' },
    { id: 2, name: 'Garçom 2', email: 'email@gmail.com', status: 'Ativo' },
    { id: 3, name: 'Gerente 1', email: 'email@gmail.com', status: 'Ativo' },
    { id: 4, name: 'Garçom 3', email: 'email@gmail.com', status: 'Ativo' },
    { id: 5, name: 'Gerente 2', email: 'email@gmail.com', status: 'Inativo' },
    { id: 6, name: 'Gerente 3', email: 'email@gmail.com', status: 'Inativo' },
    // Dados adicionais para demonstrar paginação
    ...Array.from({ length: 194 }, (_, i) => ({
      id: i + 7,
      name: `Usuário ${i + 7}`,
      email: 'email@gmail.com',
      status: Math.random() > 0.5 ? 'Ativo' : 'Inativo'
    }))
  ];

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="mt-10 mb-10">
      {role === "admin" && <CardHeader
        title="Usuarios"
        subtitle="Gerencie os usuarios do seu restaurante."
        onNewClick={handleNew}
        buttonTitle="Novo Usuário"
      />}

      <UserListTable
        users={users}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        currentPage={currentPage}
        onPageChange={handlePageChange} />

      <NewUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default UsersPage;