import { useState, useEffect } from 'react';

const STORAGE_KEY = 'mesafacil.applyObservationToItem';

export default function useItemObservationPreference() {
  const [applyObservationToItem, setApplyObservationToItem] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return false; // por padrão NÃO aplicar observação geral aos itens
      return raw === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, applyObservationToItem ? '1' : '0');
    } catch {
      // ignore
    }
  }, [applyObservationToItem]);

  return [applyObservationToItem, setApplyObservationToItem];
}
