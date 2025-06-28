import { useState, useEffect } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { ArrowDownUp } from "react-coolicons";
import NewPromotionForm from "../forms/NewPromotionForm";
import { useToast } from "@/hooks/useToast";

const initialFormData = {
  nome: "",
  itens: [],
  valor: "",
};

const NewPromotionModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
    }
  }, [isOpen]);

  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      await onSave(formData);
      onClose();
      notify("Promoção criada com sucesso!", "success");
    } catch (error) {
      console.error("Error saving promotion:", error);
      notify("Erro ao salvar a promoção. Tente novamente.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Promoção"
      subTitle="Preencha as informações para adicionar"
      icon={ArrowDownUp}
      iconClassName="text-yellow-500"
    >
      <NewPromotionForm
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleFormSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
      />
    </BaseModalWithHeader>
  );
};

export default NewPromotionModal;
