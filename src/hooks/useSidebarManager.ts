import { useEffect } from 'react';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';

interface UseSidebarManagerProps {
  isOpen: boolean;
  sidebarType: 'chat' | 'message';
  sidebarId: string;
  onClose: () => void;
}

export const useSidebarManager = ({
  isOpen,
  sidebarType,
  sidebarId,
  onClose,
}: UseSidebarManagerProps) => {
  const { openChatSidebar, openMessageSidebar, closeSidebar, getOpenSidebar } = useSidebarStore();
  const { openSidebar: openStateSidebar, closeSidebar: closeStateSidebar, getSidebarState } = useSidebarStateStore();

  useEffect(() => {
    if (isOpen) {
      // Verificar si hay otro sidebar abierto
      const openSidebar = getOpenSidebar();
      
      if (openSidebar.type && openSidebar.type !== sidebarType) {
        // Cerrar el sidebar anterior antes de abrir este
        // Debug logging disabled to reduce console spam
        closeSidebar();
        closeStateSidebar();
        // Pequeño delay para asegurar que el sidebar anterior se cierre
        setTimeout(() => {
          if (sidebarType === 'chat') {
            openChatSidebar(sidebarId);
          } else {
            openMessageSidebar(sidebarId);
          }
          openStateSidebar(sidebarType, sidebarId);
        }, 100);
      } else if (openSidebar.type === sidebarType && openSidebar.id !== sidebarId) {
        // Si es el mismo tipo pero diferente ID, cerrar el anterior y abrir el nuevo
        // Debug logging disabled to reduce console spam
        closeSidebar();
        closeStateSidebar();
        setTimeout(() => {
          if (sidebarType === 'chat') {
            openChatSidebar(sidebarId);
          } else {
            openMessageSidebar(sidebarId);
          }
          openStateSidebar(sidebarType, sidebarId);
        }, 100);
      } else if (!openSidebar.type) {
        // No hay sidebar abierto, abrir este
        // Debug logging disabled to reduce console spam
        if (sidebarType === 'chat') {
          openChatSidebar(sidebarId);
        } else {
          openMessageSidebar(sidebarId);
        }
        openStateSidebar(sidebarType, sidebarId);
      }
    } else {
      // Si se está cerrando, verificar si este es el sidebar actual
      const openSidebar = getOpenSidebar();
      if (openSidebar.type === sidebarType && openSidebar.id === sidebarId) {
        // Debug logging disabled to reduce console spam
        closeSidebar();
        closeStateSidebar();
      }
    }
  }, [
    isOpen,
    sidebarType,
    sidebarId,
    openChatSidebar,
    openMessageSidebar,
    closeSidebar,
    getOpenSidebar,
    openStateSidebar,
    closeStateSidebar,
    getSidebarState,
  ]);

  // Función para cerrar el sidebar actual
  const handleClose = () => {
    const openSidebar = getOpenSidebar();
    if (openSidebar.type === sidebarType && openSidebar.id === sidebarId) {
      closeSidebar();
    }
    onClose();
  };

  return { handleClose };
}; 