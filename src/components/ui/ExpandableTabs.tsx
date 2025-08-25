"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
// import { useOnClickOutside } from "usehooks-ts";
import { LucideIcon } from "lucide-react";
import styles from "./ExpandableTabs.module.scss";

interface Tab {
  title: string;
  icon: LucideIcon;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;



interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  onChange?: (index: number | null) => void;
  hideTextOnMobile?: boolean;
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".5rem",
    paddingRight: ".5rem",
    scale: 0.95,
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".75rem" : 0,
    paddingLeft: isSelected ? "1.25rem" : ".5rem",
    paddingRight: isSelected ? "1.25rem" : ".5rem",
    scale: isSelected ? 1.02 : 1,
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0, scale: 0.8 },
  animate: { width: "auto", opacity: 1, scale: 1 },
  exit: { width: 0, opacity: 0, scale: 0.8 },
};

const transition = { 
  delay: 0.05, 
  type: "spring" as const, 
  bounce: 0.1, 
  duration: 0.5,
  stiffness: 200,
  damping: 20
};

export function ExpandableTabs({
  tabs,
  className,
  onChange,
  hideTextOnMobile = false,
}: ExpandableTabsProps) {
  const [selected, setSelected] = React.useState<number | null>(0); // Seleccionar el primer tab por defecto
  // const outsideClickRef = React.useRef(null);

  // Notificar el cambio inicial una sola vez
  React.useEffect(() => {
    onChange?.(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Comentado para evitar que se resetee el tab activo al hacer clic en otros elementos
  // useOnClickOutside(outsideClickRef, () => {
  //   setSelected(null);
  //   onChange?.(null);
  // });

  const handleSelect = React.useCallback((index: number) => {
    setSelected(index);
    onChange?.(index);
  }, [onChange]);

  const Separator = () => (
    <div className={styles.separator} aria-hidden="true" />
  );

  return (
    <div
      // ref={outsideClickRef}
      className={`${styles.expandableTabs} ${className || ''}`}
    >
      {/* Título de Configuración */}
      <div className={styles.configTitle}>
        <span className={styles.configTitleText}>Seleccionar configuración:</span>
      </div>
      
      {tabs.map((tab, globalIndex) => {
        if (tab.type === "separator") {
          return <Separator key={`separator-${globalIndex}`} />;
        }

        // Type assertion para asegurar que es un Tab
        const tabItem = tab as Tab;
        const Icon = tabItem.icon;
        
        // Usar el globalIndex directamente para mantener la correspondencia con el array original
        const tabIndex = globalIndex;
        const isSelected = selected === tabIndex;
        
        return (
          <motion.button
            key={`tab-${tabItem.title}-${tabIndex}`}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={isSelected}
            onClick={() => handleSelect(tabIndex)} // eslint-disable-line react/jsx-no-bind
            transition={transition}
            className={`${styles.tabButton} ${isSelected ? styles.selected : styles.unselected}`}
          >
            <Icon size={20} className={styles.tabIcon} />
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className={`${styles.tabTitle} ${hideTextOnMobile ? styles.hideTextOnMobile : ''}`}
                >
                  {tabItem.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
