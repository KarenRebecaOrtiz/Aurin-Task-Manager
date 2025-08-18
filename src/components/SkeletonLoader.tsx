'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import styles from './SkeletonLoader.module.scss';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonLoaderProps {
  type: 'tasks' | 'clients' | 'members' | 'kanban' | 'config' | 'archive';
  rows?: number;
  isEmpty?: boolean; // Nuevo prop para indicar si la tabla está vacía
  emptyMessage?: string; // Mensaje personalizado para tablas vacías
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = memo(({ 
  type, 
  rows = 5, 
  isEmpty = false, 
  emptyMessage 
}) => {
  const { isDarkMode } = useTheme();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const tableVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      y: -20,
      transition: { duration: 0.3 }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  };

  const cellVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.2 }
    }
  };

  const shimmerVariants = {
    animate: {
      x: ['-100%', '100%'],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear' as const
      }
    }
  };

  const baseShimmerStyle = {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    backgroundColor: isDarkMode ? 'rgba(60, 60, 60, 0.6)' : 'rgba(240, 240, 240, 0.6)',
    borderRadius: '4px',
  };

  const shimmerOverlay = (
    <motion.div
      className={styles.shimmerOverlay}
      variants={shimmerVariants}
      animate="animate"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: isDarkMode 
          ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
        transform: 'translateX(-100%)',
      }}
    />
  );

  const getColumns = () => {
    switch (type) {
      case 'tasks':
        return [
          { key: 'name', label: 'Tarea', width: '30%' },
          { key: 'client', label: 'Cuenta', width: '15%' },
          { key: 'priority', label: 'Prioridad', width: '10%' },
          { key: 'status', label: 'Estado', width: '10%' },
          { key: 'assigned', label: 'Asignados', width: '20%' },
          { key: 'action', label: 'Acciones', width: '15%' },
        ];
      case 'clients':
        return [
          { key: 'image', label: '', width: '20%' },
          { key: 'name', label: 'Cuentas', width: '50%' },
          { key: 'projects', label: 'Proyectos Asignados', width: '20%' },
          { key: 'action', label: 'Acciones', width: '10%' },
        ];
      case 'members':
        return [
          { key: 'avatar', label: '', width: '15%' },
          { key: 'name', label: 'Nombre', width: '25%' },
          { key: 'role', label: 'Rol', width: '20%' },
          { key: 'status', label: 'Estado', width: '15%' },
          { key: 'tasks', label: 'Tareas', width: '15%' },
          { key: 'action', label: 'Acciones', width: '10%' },
        ];
      case 'kanban':
        return [
          { key: 'card', label: 'Tarjetas', width: '100%' },
        ];
      case 'config':
        return [
          { key: 'avatar', label: '', width: '15%' },
          { key: 'name', label: 'Nombre', width: '25%' },
          { key: 'role', label: 'Rol', width: '20%' },
          { key: 'teams', label: 'Equipos', width: '25%' },
          { key: 'action', label: 'Acciones', width: '15%' },
        ];
      case 'archive':
        return [
          { key: 'name', label: 'Tarea', width: '30%' },
          { key: 'client', label: 'Cuenta', width: '15%' },
          { key: 'priority', label: 'Prioridad', width: '10%' },
          { key: 'status', label: 'Estado', width: '10%' },
          { key: 'assigned', label: 'Asignados', width: '20%' },
          { key: 'action', label: 'Acciones', width: '15%' },
        ];
      default:
        return [];
    }
  };

  const renderSkeletonCell = (column: { key: string; width: string }) => {
    switch (column.key) {
      case 'image':
      case 'avatar':
        return (
          <motion.div 
            className={styles.skeletonAvatar}
            style={baseShimmerStyle}
            variants={rowVariants}
          >
            {shimmerOverlay}
          </motion.div>
        );
      case 'assigned':
        return (
          <motion.div 
            className={styles.skeletonAvatarGroup}
            variants={rowVariants}
          >
            <motion.div className={styles.skeletonAvatar} style={baseShimmerStyle}>
              {shimmerOverlay}
            </motion.div>
            <motion.div className={styles.skeletonAvatar} style={baseShimmerStyle}>
              {shimmerOverlay}
            </motion.div>
            <motion.div className={styles.skeletonAvatar} style={baseShimmerStyle}>
              {shimmerOverlay}
            </motion.div>
          </motion.div>
        );
      case 'action':
        return (
          <motion.div 
            className={styles.skeletonAction}
            style={baseShimmerStyle}
            variants={rowVariants}
          >
            {shimmerOverlay}
          </motion.div>
        );
      case 'priority':
        return (
          <motion.div 
            className={styles.skeletonBadge}
            style={baseShimmerStyle}
            variants={rowVariants}
          >
            {shimmerOverlay}
          </motion.div>
        );
      case 'status':
        return (
          <motion.div 
            className={styles.skeletonStatus}
            style={baseShimmerStyle}
            variants={rowVariants}
          >
            {shimmerOverlay}
          </motion.div>
        );
      case 'card':
        return (
          <motion.div 
            className={styles.skeletonKanbanCard}
            style={baseShimmerStyle}
            variants={rowVariants}
          >
            <motion.div className={styles.skeletonCardHeader} style={baseShimmerStyle}>
              {shimmerOverlay}
            </motion.div>
            <motion.div className={styles.skeletonCardContent} style={baseShimmerStyle}>
              {shimmerOverlay}
            </motion.div>
            <motion.div className={styles.skeletonCardFooter} style={baseShimmerStyle}>
              {shimmerOverlay}
            </motion.div>
          </motion.div>
        );
      case 'teams':
        return (
          <motion.div 
            className={styles.skeletonTeams}
            variants={rowVariants}
          >
            <motion.div className={styles.skeletonBadge} style={baseShimmerStyle}>
              {shimmerOverlay}
            </motion.div>
            <motion.div className={styles.skeletonBadge} style={baseShimmerStyle}>
              {shimmerOverlay}
            </motion.div>
          </motion.div>
        );
      default:
        return (
          <motion.div 
            className={styles.skeletonText}
            style={baseShimmerStyle}
            variants={rowVariants}
          >
            {shimmerOverlay}
          </motion.div>
        );
    }
  };

  // Si está vacío, mostrar estado vacío elegante
  if (isEmpty) {
    const getEmptyMessage = () => {
      if (emptyMessage) return emptyMessage;
      
      switch (type) {
        case 'tasks':
          return 'No hay tareas disponibles';
        case 'clients':
          return 'No hay clientes registrados';
        case 'members':
          return 'No hay miembros en el equipo';
        case 'kanban':
          return 'No hay tareas para mostrar';
        case 'config':
          return 'No hay configuraciones disponibles';
        case 'archive':
          return 'No hay tareas archivadas';
        default:
          return 'No hay datos disponibles';
      }
    };

    return (
      <motion.div
        className={styles.skeletonContainer}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className={styles.emptyState}
          variants={sectionVariants}
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: isDarkMode ? '#e5e7eb' : '#6b7280'
          }}
        >
          <motion.div
            style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 24px',
              borderRadius: '50%',
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(60, 60, 60, 0.8), rgba(80, 80, 80, 0.6))'
                : 'linear-gradient(135deg, rgba(240, 240, 240, 0.8), rgba(220, 220, 220, 0.6))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
            variants={cellVariants}
          >
            {shimmerOverlay}
            <motion.div
              style={{
                fontSize: '48px',
                opacity: 0.3
              }}
            >
              📭
            </motion.div>
          </motion.div>
          
          <motion.h3
            style={{
              fontSize: '24px',
              fontWeight: '600',
              margin: '0 0 12px',
              color: isDarkMode ? '#f3f4f6' : '#374151'
            }}
            variants={cellVariants}
          >
            {getEmptyMessage()}
          </motion.h3>
          
          <motion.p
            style={{
              fontSize: '16px',
              margin: '0',
              opacity: 0.7,
              maxWidth: '400px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}
            variants={cellVariants}
          >
            {type === 'tasks' && 'Crea tu primera tarea para comenzar a organizar tu trabajo'}
            {type === 'clients' && 'Agrega clientes para gestionar tus proyectos'}
            {type === 'members' && 'Invita miembros a tu equipo para colaborar'}
            {type === 'kanban' && 'Las tareas aparecerán aquí cuando las crees'}
            {type === 'config' && 'Configura tu perfil y preferencias'}
            {type === 'archive' && 'Las tareas archivadas aparecerán aquí'}
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={styles.skeletonContainer}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {type === 'kanban' ? (
        // Special rendering for kanban with multiple columns
        <div className={styles.kanbanSkeleton}>
          {['Pendiente', 'En Progreso', 'Revisión', 'Completado'].map((column) => (
            <motion.div
              key={column}
              className={styles.kanbanColumn}
              variants={sectionVariants}
            >
              <div className={styles.columnHeader}>
                <motion.div className={styles.columnTitle} style={baseShimmerStyle}>
                  {shimmerOverlay}
                </motion.div>
                <motion.div className={styles.columnCount} style={baseShimmerStyle}>
                  {shimmerOverlay}
                </motion.div>
              </div>
              <div className={styles.columnCards}>
                {Array.from({ length: Math.floor(Math.random() * 3) + 2 }).map((_, cardIndex) => (
                  <motion.div
                    key={cardIndex}
                    className={styles.skeletonKanbanCard}
                    style={baseShimmerStyle}
                    variants={rowVariants}
                  >
                    <motion.div className={styles.skeletonCardHeader} style={baseShimmerStyle}>
                      {shimmerOverlay}
                    </motion.div>
                    <motion.div className={styles.skeletonCardContent} style={baseShimmerStyle}>
                      {shimmerOverlay}
                    </motion.div>
                    <motion.div className={styles.skeletonCardFooter} style={baseShimmerStyle}>
                      {shimmerOverlay}
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        // Regular table rendering for other types
        <motion.div className={styles.skeletonTable} variants={tableVariants}>
          <motion.div className={styles.skeletonHeader} variants={rowVariants}>
            {getColumns().map((column) => (
              <motion.div
                key={column.key}
                className={styles.skeletonHeaderCell}
                style={{ width: column.width }}
                variants={cellVariants}
              >
                <motion.div className={styles.skeletonText} style={baseShimmerStyle}>
                  {shimmerOverlay}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
          <motion.div className={styles.skeletonBody}>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <motion.div
                key={rowIndex}
                className={styles.skeletonRow}
                variants={rowVariants}
              >
                {getColumns().map((column) => (
                  <motion.div
                    key={column.key}
                    className={styles.skeletonCell}
                    style={{ width: column.width }}
                    variants={cellVariants}
                  >
                    {renderSkeletonCell(column)}
                  </motion.div>
                ))}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';

export default SkeletonLoader; 