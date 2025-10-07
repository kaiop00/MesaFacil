import { useState } from "react";
import { UserAdd } from "react-coolicons";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";
import UserModal from "./UserModal";
import registerUserOnFirebase from "./handlers/registerUserOnFirebase";
import addUserToFirestore from "../../services/addUserToFirestore";

const NewUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const { t } = useTranslation();
  const { idRestaurante } = useAuth();
  const { notify } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async ({ formData, permissions }) => {
    try {
      setIsLoading(true);
      
      if (!idRestaurante) throw new Error(t("users:messages.error"));
      
      const response = await registerUserOnFirebase(formData);
      const data = await response.json();

      if (response.ok) {
        const uid = data.localId;
        await addUserToFirestore(uid, formData.name, formData.email, permissions, idRestaurante);
        notify(t("users:messages.addSuccess"), 'success');
        onClose();
        if (onUserAdded) onUserAdded();
      } else {
        if (response.status === 400 && data.error.message === 'EMAIL_EXISTS') {
          throw new Error(t("users:messages.emailExists"));
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
      title={t("users:modal.new.title")}
      subTitle={t("users:modal.new.subtitle")}
      icon={UserAdd}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      onSuccess={onUserAdded}
    />
  );
};

export default NewUserModal;