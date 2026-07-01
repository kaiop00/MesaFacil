import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import CardHeader from "@/components/CardHeader";
import UserListTable from "@/features/users/components/UserListTable";
import NewUserModal from "@/features/users/components/modals/NewUserModal";
import UserDetailsModal from "@/features/users/components/modals/UserDetailsModal";
import EditUserModal from "@/features/users/components/modals/EditUserModal";
import DeactivateUserModal from "@/features/users/components/modals/DeactivateUserModal";
import ActivateUserModal from "@/features/users/components/modals/ActivateUserModal";
import DeleteUserModal from "@/features/users/components/modals/DeleteUserModal";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

const UsersPage = () => {
  const { t } = useTranslation();
  const { idRestaurante } = useAuth();
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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

  const handleUserDeactivate = (user) => {
    setSelectedUser(user);
    setIsDeactivateModalOpen(true);
  };

  const handleUserActivate = (user) => {
    setSelectedUser(user);
    setIsActivateModalOpen(true);
  };

  const handleUserDelete = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!idRestaurante) return;

    setLoading(true);
    setError(null);

    const usersRef = collection(db, 'users');
    // Nota: usar onSnapshot sem where para todos os users, filtrar em memória
    // Evita exigir índice composto no Firestore
    const unsubscribe = onSnapshot(usersRef,
      (querySnapshot) => {
        try {
          const usersData = [];
          querySnapshot.forEach((doc) => {
            const userData = doc.data();
            // Filtrar em memória por idRestaurante
            if (userData.idRestaurante === idRestaurante) {
              usersData.push({ id: doc.id, ...userData });
            }
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
      {hasPermission('create_users') && <CardHeader
        title={t("users:title")}
        subtitle={t("users:subtitle")}
        onNewClick={handleNew}
        buttonTitle={t("users:newUser")}
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
        onEditClick={handleUserEdit}
        onDeactivateClick={handleUserDeactivate}
        onActivateClick={handleUserActivate}
        onDeleteClick={handleUserDelete}
      />

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

      <DeactivateUserModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        user={selectedUser}
      />

      <ActivateUserModal
        isOpen={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        user={selectedUser}
      />

      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
};

export default UsersPage;