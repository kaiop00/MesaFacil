import { useState } from "react";
import { EditPencil01 } from "react-coolicons";
import { useToast } from "@/hooks/useToast";
import UserModal from "./UserModal";

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }) => {
  const { notify } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async ({ formData, permissions }) => {
    try {
      setIsLoading(true);
      // TODO: Add update logic here
      notify('Usuário atualizado com sucesso', 'success');
      onClose();
      if (onUserUpdated) onUserUpdated();
    } catch (error) {
      notify(error.message, 'error');
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
      title="Editar Usuário"
      subTitle="Atualize as informações do usuário."
      icon={EditPencil01}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      onSuccess={onUserUpdated}
    />
  );
};

export default EditUserModal;
