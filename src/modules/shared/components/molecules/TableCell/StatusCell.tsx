'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import styles from './TableCell.module.scss';

export interface StatusCellProps {
  status: string;
  showIcon?: boolean;
  className?: string;
}

const normalizeStatus = (status: string): string => {
  if (!status) return 'Por Iniciar';

  const normalized = status.trim();

  const statusMap: { [key: string]: string } = {
    'por iniciar': 'Por Iniciar',
    'por-iniciar': 'Por Iniciar',
    'pendiente': 'Por Iniciar',
    'pending': 'Por Iniciar',
    'to do': 'Por Iniciar',
    'todo': 'Por Iniciar',
    'en proceso': 'En Proceso',
    'en-proceso': 'En Proceso',
    'in progress': 'En Proceso',
    'progreso': 'En Proceso',
    'por finalizar': 'Por Finalizar',
    'por-finalizar': 'Por Finalizar',
    'to finish': 'Por Finalizar',
    'finalizado': 'Finalizado',
    'finalizada': 'Finalizado',
    'completed': 'Finalizado',
    'completado': 'Finalizado',
    'completada': 'Finalizado',
    'done': 'Finalizado',
    'terminado': 'Finalizado',
    'terminada': 'Finalizado',
    'finished': 'Finalizado',
    'backlog': 'Backlog',
    'cancelado': 'Cancelado',
    'cancelada': 'Cancelado',
    'cancelled': 'Cancelado',
  };

  return statusMap[normalized.toLowerCase()] || normalized;
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'En Proceso':
      return '/timer.svg';
    case 'Backlog':
      return '/circle-help.svg';
    case 'Por Iniciar':
      return '/circle.svg';
    case 'Cancelado':
      return '/circle-x.svg';
    case 'Por Finalizar':
      return '/circle-check.svg';
    case 'Finalizado':
      return '/check-check.svg';
    default:
      return '/circle.svg';
  }
};

export const StatusCell: React.FC<StatusCellProps> = ({
  status,
  showIcon = true,
  className = '',
}) => {
  const normalizedStatus = useMemo(() => normalizeStatus(status), [status]);
  const icon = useMemo(() => getStatusIcon(normalizedStatus), [normalizedStatus]);

  return (
    <div className={`${styles.statusCell} ${className}`}>
      {showIcon && (
        <Image
          src={icon}
          alt={normalizedStatus}
          width={16}
          height={16}
          className={styles.statusIcon}
        />
      )}
      <span className={styles[`status-${normalizedStatus.replace(/\s/g, '-')}`]}>
        {normalizedStatus}
      </span>
    </div>
  );
};
