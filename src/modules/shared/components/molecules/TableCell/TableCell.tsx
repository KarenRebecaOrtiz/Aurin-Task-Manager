'use client';

import React from 'react';
import styles from './TableCell.module.scss';

export interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  onClick?: () => void;
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className = '',
  align = 'left',
  onClick,
}) => {
  const cellClasses = [
    styles.cell,
    styles[align],
    onClick && styles.clickable,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cellClasses} onClick={onClick}>
      {children}
    </div>
  );
};
