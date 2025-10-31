import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import CardHeader from "@/components/CardHeader";
import CardPromotionEmpty from "@/features/promotions/components/CardPromotionEmpty";
import CardPromotion from "@/features/promotions/components/CardPromotion";
import NewPromotionModal from "@/features/promotions/components/modals/NewPromotionModal";
import EditPromotionModal from "@/features/promotions/components/modals/EditPromotionModal";
import PromotionDetailsModal from "@/features/promotions/components/modals/PromotionDetailsModal";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { create, getAll, remove, update } from "@/services/firebase/firestoreService";
import { useToast } from "@/hooks/useToast";

const PromotionPage = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { idRestaurante } = useAuth();
  const { hasPermission } = usePermissions();
  const { notify } = useToast();

  useEffect(() => {
    if (idRestaurante) {
      const fetchPromotions = async () => {
        try {
          setLoading(true);
          const fetchedPromotions = await getAll(idRestaurante, 'promocoes', { orderByField: 'criadoEm', order: 'desc' });
          setPromotions(fetchedPromotions);
        } catch (error) {
          console.error("Erro ao buscar promoções:", error);
          setError(error);
        } finally {
          setLoading(false);
        }
      };
      fetchPromotions();
    }
  }, [idRestaurante]);

  const handleNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handlePromotionClick = (promotion) => {
    setSelectedPromotion(promotion);
  };

  const handleCloseDetails = () => {
    setSelectedPromotion(null);
  };

  const handleSavePromotion = async (formData) => {
    if (!idRestaurante) {
      notify(t("promotions:messages.notAuthenticated"), "error");
      return;
    }
    try {
      await create(idRestaurante, 'promocoes', formData);
      const fetchedPromotions = await getAll(idRestaurante, 'promocoes', { orderByField: 'criadoEm', order: 'desc' });
      console.log(fetchedPromotions);
      setPromotions(fetchedPromotions);
      handleCloseModal();
    } catch (error) {
      console.error('Error creating promotion:', error);
      notify(t("promotions:messages.createError"), "error");
    }
  };

  const handleEditPromotion = (promotion) => {
    setEditingPromotion(promotion);
    setIsEditModalOpen(true);
  };

  const handleUpdatePromotion = async (updatedPromotion) => {
    try {
      // Update the promotion in Firestore
      await update(idRestaurante, 'promocoes', updatedPromotion.id, updatedPromotion);
      
      // Update the local state
      setPromotions(prev => 
        prev.map(p => p.id === updatedPromotion.id ? updatedPromotion : p)
      );
      
      setIsEditModalOpen(false);
      setEditingPromotion(null);
      notify(t("promotions:messages.updateSuccess"), "success");
    } catch (error) {
      console.error("Error updating promotion:", error);
      notify(t("promotions:messages.updateError"), "error");
    }
  };

  const handleDeletePromotion = async (id) => {
    if (!idRestaurante) {
      notify(t("promotions:messages.notAuthenticated"), "error");
      return;
    }
    if (window.confirm(t("promotions:actions.deleteConfirm"))) {
      try {
        await remove(idRestaurante, 'promocoes', id);
        setPromotions(prev => prev.filter(promo => promo.id !== id));
        notify(t("promotions:messages.deleteSuccess"), "success");
      } catch (error) {
        console.error('Erro ao excluir promoção:', error);
        notify(t("promotions:messages.deleteError"), "error");
      }
    }
  };

  return (
    <div className="sm:px-6 md:px-8 mt-10 mb-10 space-y-10">
      {hasPermission('create_menu_items') && (
        <CardHeader
          title={t("promotions:title")}
          subtitle={t("promotions:subtitle")}
          onNewClick={handleNew}
          buttonTitle={t("promotions:newPromotion")}
        />
      )}

      {loading
        ? (<div className="flex justify-center items-center h-64">{t("promotions:loading")}</div>)
        : (error
          ? (<div className="text-red-500">{error.message}</div>)
          : (promotions.length === 0
            ? (<CardPromotionEmpty />)
            : (<div className="font-inter grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="cursor-pointer"
                  onClick={() => handlePromotionClick(promo)}
                >
                  <CardPromotion
                    id={promo.id}
                    nome={promo.nome}
                    imagemUrl={promo.imagemUrl}
                    precoOriginal={promo.precoOriginal}
                    precoDesconto={promo.precoDesconto}
                    onEdit={() => handleEditPromotion(promo)}
                    onDelete={handleDeletePromotion}
                  />
                </div>
              ))}
            </div>)))}

      <NewPromotionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePromotion}
      />

      <EditPromotionModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPromotion(null);
        }}
        promotion={editingPromotion}
        onSave={handleUpdatePromotion}
      />

      <PromotionDetailsModal
        isOpen={!!selectedPromotion}
        onClose={handleCloseDetails}
        promotion={selectedPromotion}
      />
    </div>
  );
};

export default PromotionPage;
