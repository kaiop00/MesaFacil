import { useState, useEffect } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { ArrowDownUp } from "react-coolicons";
import NewPromotionForm from "../forms/NewPromotionForm";

const initialFormData = {
  nome: "",
  itens: [],
  precoOriginal: "",
  precoDesconto: "",
};

const NewPromotionModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
    }
  }, [isOpen]);

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Promoção"
      subTitle="Preencha as informações para adicionar"
      icon={ArrowDownUp}
    >
      <NewPromotionForm
        formData={formData}
        setFormData={setFormData}
      ></NewPromotionForm>
    </BaseModalWithHeader>
  );
};

export default NewPromotionModal;
