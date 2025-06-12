import UserModal from "./UserModal";

const UserDetailsModal = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  return (
    <UserModal
      isOpen={isOpen}
      onClose={onClose}
      user={user}
      mode="view"
      title="Detalhes do Usuário"
    />
  );
};

export default UserDetailsModal;
