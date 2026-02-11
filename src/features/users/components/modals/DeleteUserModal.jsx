import { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/useToast";

const DeleteUserModal = ({ isOpen, user, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', user.id));
      
      notify(t('users:messages.deleteSuccess'), 'success');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      notify(t('users:messages.deleteError'), 'error');
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
            {t('users:modal.delete.title')}
          </h3>
          <p className="text-gray-600 mb-2">
            {t('users:modal.delete.message')} <span className="font-semibold">{user?.name}</span>?
          </p>
          <p className="text-red-600 font-medium mb-6">
            {t('users:modal.delete.warning')}
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? t('users:modal.delete.processing') : t('users:modal.delete.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserModal;
