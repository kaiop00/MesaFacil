import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import CardHeader from "@/components/CardHeader";
import UserListTable from "@/features/users/components/UserListTable";
import NewUserModal from "@/features/users/components/modals/NewUserModal";
import UserDetailsModal from "@/features/users/components/modals/UserDetailsModal";
import EditUserModal from "@/features/users/components/modals/EditUserModal";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

const UsersPage = () => {
  const { idRestaurante, role } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleNew = () => {
    setIsModalOpen(true);
  };

  const handleUserDetails = (user) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
  };

  const handleUserEdit = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!idRestaurante) return;

    setLoading(true);
    setError(null);

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('idRestaurante', '==', idRestaurante));

    const unsubscribe = onSnapshot(q,
      (querySnapshot) => {
        try {
          const usersData = [];
          querySnapshot.forEach((doc) => {
            usersData.push({ id: doc.id, ...doc.data() });
          });
          setUsers(usersData);
          setLoading(false);
        } catch (err) {
          console.error(err);
          setError("Erro ao carregar usuários. Tente novamente.");
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setError("Erro ao carregar usuários. Verifique sua conexão.");
        setLoading(false);
      }
    );

    // Limpar
    return () => unsubscribe();
  }, [idRestaurante]);

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
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onUserDetails={handleUserDetails}
        onEditClick={handleUserEdit} />

      <NewUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserAdded={() => {
          setIsModalOpen(false);
          // Recarregar a lista de usuários
          setCurrentPage(1);
        }}
      />

      <UserDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        user={selectedUser}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={selectedUser}
        onUserUpdated={() => {
          setIsEditModalOpen(false);
          // Recarregar a lista de usuários
          setCurrentPage(1);
        }}
      />
    </div>
  );
};

export default UsersPage;