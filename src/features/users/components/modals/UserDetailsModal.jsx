import { useTranslation } from "react-i18next";
import UserModal from "./UserModal";

const UserDetailsModal = ({ isOpen, onClose, user }) => {
  const { t } = useTranslation();
  
  if (!user) return null;

  return (
    <UserModal
      isOpen={isOpen}
      onClose={onClose}
      user={user}
      mode="view"
      title={t("users:modal.details.title")}
    />
  );
};

export default UserDetailsModal;
