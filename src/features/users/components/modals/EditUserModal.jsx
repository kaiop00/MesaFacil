import { useState } from "react";
import { EditPencil01 } from "react-coolicons";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/useToast";
import UserModal from "./UserModal";
import updateUserInFirestore from "../../services/updateUserInFirestore";

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }) => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async ({ formData, permissions }) => {
    if (!user?.id) {
      throw new Error(t("users:messages.userIdNotFound"));
    }

    try {
      setIsLoading(true);

      // Update Firestore (name, email, role, status)
      await updateUserInFirestore(user.id, {
        name: formData.name,
        role: permissions,
        status: formData.status || 'Ativo'
      });

      notify(t("users:messages.updateSuccess"), 'success');
      onClose();
      
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error; // This will be handled by UserModal
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UserModal
      isOpen={isOpen}
      onClose={onClose}
      user={user}
      mode="edit"
      title={t("users:modal.edit.title")}
      subTitle={t("users:modal.edit.subtitle")}
      icon={EditPencil01}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      onSuccess={onUserUpdated}
    />
  );
};

export default EditUserModal;
