import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/useToast";

const ActivateUserModal = ({ isOpen, user, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleActivate = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        status: 'Ativo',
        updatedAt: new Date().toISOString()
      });
      
      notify(t('users:messages.activateSuccess'), 'success');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error activating user:', error);
      notify(t('users:messages.activateError'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('users:modal.activate.title')}
          </h3>
          <p className="text-gray-600 mb-2">
            {t('users:modal.activate.message')} <span className="font-semibold">{user?.name}</span>?
          </p>
          <p className="text-gray-600 mb-6">
            {t('users:modal.activate.info')}
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              onClick={handleActivate}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isLoading ? t('users:modal.activate.processing') : t('users:modal.activate.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivateUserModal;
