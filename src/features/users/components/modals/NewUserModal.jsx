import { useState } from "react";
import { UserAdd } from "react-coolicons";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import UserModal from "./UserModal";
import registerUserOnFirebase from "./handlers/registerUserOnFirebase";
import addUserToFirestore from "../../services/addUserToFirestore";

const NewUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const { idRestaurante } = useAuth();
  const { notify } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async ({ formData, permissions }) => {
    try {
      setIsLoading(true);
      
      if (!idRestaurante) throw new Error('ID do restaurante não encontrado');
      
      const response = await registerUserOnFirebase(formData);
      const data = await response.json();

      if (response.ok) {
        const uid = data.localId;
        await addUserToFirestore(uid, formData.name, formData.email, permissions, idRestaurante);
        notify('Usuário adicionado com sucesso', 'success');
        onClose();
        if (onUserAdded) onUserAdded();
      } else {
        if (response.status === 400 && data.error.message === 'EMAIL_EXISTS') {
          throw new Error('Email já cadastrado');
        }
        throw new Error(JSON.stringify(`${response.status} ${response.statusText}`));
      }
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
      mode="create"
      title="Novo Usuário"
      subTitle="Preencha as informações para adicionar."
      icon={UserAdd}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      onSuccess={onUserAdded}
    />
  );
};

export default NewUserModal;