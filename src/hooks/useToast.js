import { useCallback } from 'react';
import { toast } from 'react-hot-toast';

export function useToast() {
  const notify = useCallback((message, status = 'success') => {
    const styles = {
      success: {
        style: { background: '#16a34a', color: '#fff', borderRadius: '8px', padding: '12px 16px' },
      },
      error: {
        style: { background: '#dc2626', color: '#fff', borderRadius: '8px', padding: '12px 16px' },
      },
      info: {
        style: { background: '#2563eb', color: '#fff', borderRadius: '8px', padding: '12px 16px' },
      },
      warning: {
        style: { background: '#f59e0b', color: '#fff', borderRadius: '8px', padding: '12px 16px' },
        duration: 6000,
      },
    };

    const config = styles[status] || {};

    if (status === 'success') {
      toast.success(message, config);
    } else if (status === 'error') {
      toast.error(message, config);
    } else {
      toast(message, config);
    }
  }, []);

  return { notify };
}
