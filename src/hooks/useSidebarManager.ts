import { useEffect } from 'react';
import { useSidebarStore } from '@/stores/sidebarStore';

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

  useEffect(() => {
    if (isOpen) {
      // Verificar si hay otro sidebar abierto
      const openSidebar = getOpenSidebar();
      
      if (openSidebar.type && openSidebar.type !== sidebarType) {
        // Cerrar el sidebar anterior antes de abrir este
        console.log(`[SidebarManager] Closing ${openSidebar.type} sidebar to open ${sidebarType} sidebar`);
        closeSidebar();
        // Pequeño delay para asegurar que el sidebar anterior se cierre
        setTimeout(() => {
          if (sidebarType === 'chat') {
            openChatSidebar(sidebarId);
          } else {
            openMessageSidebar(sidebarId);
          }
        }, 100);
      } else if (openSidebar.type === sidebarType && openSidebar.id !== sidebarId) {
        // Si es el mismo tipo pero diferente ID, cerrar el anterior y abrir el nuevo
        console.log(`[SidebarManager] Switching ${sidebarType} sidebar from ${openSidebar.id} to ${sidebarId}`);
        closeSidebar();
        setTimeout(() => {
          if (sidebarType === 'chat') {
            openChatSidebar(sidebarId);
          } else {
            openMessageSidebar(sidebarId);
          }
        }, 100);
      } else if (!openSidebar.type) {
        // No hay sidebar abierto, abrir este
        console.log(`[SidebarManager] Opening ${sidebarType} sidebar for ${sidebarId}`);
        if (sidebarType === 'chat') {
          openChatSidebar(sidebarId);
        } else {
          openMessageSidebar(sidebarId);
        }
      }
    } else {
      // Si se está cerrando, verificar si este es el sidebar actual
      const openSidebar = getOpenSidebar();
      if (openSidebar.type === sidebarType && openSidebar.id === sidebarId) {
        console.log(`[SidebarManager] Closing ${sidebarType} sidebar for ${sidebarId}`);
        closeSidebar();
      }
    }
  }, [isOpen, sidebarType, sidebarId, openChatSidebar, openMessageSidebar, closeSidebar, getOpenSidebar]);

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