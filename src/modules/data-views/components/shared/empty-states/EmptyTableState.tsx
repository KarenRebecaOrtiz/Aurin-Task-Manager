import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './EmptyTableState.module.scss';

export type EmptyStateType = 'tasks' | 'archive' | 'clients' | 'members' | 'team';

interface EmptyTableStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  /** When true, removes background/border for use inside Table component */
  embedded?: boolean;
}

const defaultContent: Record<EmptyStateType, { title: string; description: string }> = {
  archive: {
    title: 'No hay tareas archivadas',
    description: 'Las tareas que archives aparecerán aquí para mantener un historial organizado de tu trabajo.'
  },
  clients: {
    title: 'No hay cuentas registradas',
    description: 'Crea tu primera cuenta para comenzar a organizar tus proyectos y tareas.'
  },
  members: {
    title: 'No hay miembros en el equipo',
    description: 'Invita a tu equipo para colaborar en proyectos y tareas de manera eficiente.'
  },
  team: {
    title: 'No hay miembros en el equipo',
    description: 'Agrega miembros a tu equipo para mejorar la colaboración y productividad.'
  },
  tasks: {
    title: 'No hay tareas asignadas',
    description: 'Crea tu primera tarea para comenzar a organizar tu trabajo y proyectos.'
  }
};

export const EmptyTableState: React.FC<EmptyTableStateProps> = ({
  type = 'tasks',
  title,
  description,
  action,
  className = '',
  embedded = false,
}) => {
  const content = defaultContent[type];
  const displayTitle = title || content.title;
  const displayDescription = description || content.description;

  return (
    <motion.div
      className={`${styles.emptyState} ${embedded ? styles.embedded : ''} ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.imageContainer}>
        <Image
          src="/emptyStateImage.png"
          alt="No hay datos"
          width={189}
          height={190}
          className={styles.image}
          style={{ width: 'auto', height: 'auto' }}
        />
      </div>

      <div className={styles.textContainer}>
        <h3 className={styles.title}>{displayTitle}</h3>
        <p className={styles.description}>{displayDescription}</p>
      </div>

      {action && (
        <motion.button
          className={styles.actionButton}
          onClick={action.onClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
};
