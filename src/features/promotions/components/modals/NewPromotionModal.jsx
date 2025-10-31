import { useState, useEffect } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { ArrowDownUp } from "react-coolicons";
import { useTranslation } from "react-i18next";
import NewPromotionForm from "../forms/NewPromotionForm";
import { useToast } from "@/hooks/useToast";

const initialFormData = {
  nome: "",
  itens: [],
  valor: "",
};

const NewPromotionModal = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(initialFormData);
  const { notify } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
    }
  }, [isOpen]);

  const handleFormSubmit = async (formData) => {
    try {
      await onSave(formData);
      onClose();
      notify(t("promotions:messages.createSuccess"), "success");
    } catch (error) {
      console.error("Error saving promotion:", error);
      notify(t("promotions:messages.saveError"), "error");
    }
  };

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title={t("promotions:modal.new.title")}
      subTitle={t("promotions:modal.new.subtitle")}
      icon={ArrowDownUp}
      iconClassName="text-yellow-500"
    >
      <NewPromotionForm
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleFormSubmit}
        onCancel={onClose}
      />
    </BaseModalWithHeader>
  );
};

export default NewPromotionModal;
