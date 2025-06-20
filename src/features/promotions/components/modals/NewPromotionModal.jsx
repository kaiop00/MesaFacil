import { useState, useEffect } from "react";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import { useToast } from "@/hooks/useToast";
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
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

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
