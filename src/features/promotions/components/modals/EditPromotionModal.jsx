import { useState, useEffect } from "react";
import { ArrowDownUp } from "react-coolicons";
import BaseModalWithHeader from "@/components/BaseModalWithHeader";
import EditPromotionForm from "../forms/EditPromotionForm";
import { useToast } from "@/hooks/useToast";

const EditPromotionModal = ({ isOpen, onClose, promotion, onSave }) => {
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    valor: 0,
  });
  
  const { notify } = useToast();

  useEffect(() => {
    if (isOpen && promotion) {
      setFormData({
        nome: promotion.nome || "",
        descricao: promotion.descricao || "",
        valor: promotion.precoDesconto || 0,
      });
    }
  }, [isOpen, promotion]);

  const handleFormSubmit = async (formData) => {
    try {
      await onSave({
        ...promotion,
        ...formData,
        id: promotion.id,
      });
      onClose();
    } catch (error) {
      console.error("Error updating promotion:", error);
      notify("Erro ao atualizar a promoção. Tente novamente.", "error");
    }
  };

  if (!promotion) return null;

  return (
    <BaseModalWithHeader
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Promoção"
      subTitle="Atualize as informações da promoção"
      icon={ArrowDownUp}
      iconClassName="text-yellow-500"
    >
      <EditPromotionForm
        promotion={promotion}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleFormSubmit}
        onCancel={onClose}
      />
    </BaseModalWithHeader>
  );
};

export default EditPromotionModal;
