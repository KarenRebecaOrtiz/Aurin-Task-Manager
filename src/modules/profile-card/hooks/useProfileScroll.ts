// TODO: Hook para manejar scroll lock cuando modal está abierto
// TODO: Extraer lógica de useEffect de ProfileCard.tsx (líneas 36-52)
// TODO: Input: isOpen (boolean)
// TODO: Guardar scrollY position, aplicar fixed positioning al body
// TODO: Restaurar scroll position al cerrar

import { useEffect } from 'react';

export const useProfileScroll = (isOpen: boolean) => {
  useEffect(() => {
    if (isOpen) {
      // TODO: Guardar posición actual de scroll
      const scrollY = window.scrollY;

      // TODO: Aplicar estilos para bloquear scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // TODO: Cleanup - restaurar estilos y scroll position
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);
};
