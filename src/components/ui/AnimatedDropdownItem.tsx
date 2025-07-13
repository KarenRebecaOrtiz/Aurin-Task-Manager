'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import styles from './AnimatedDropdownItem.module.scss';

interface AnimatedDropdownItemProps {
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
  svgIcon?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  showStatusDot?: boolean;
  statusColor?: string;
  onClick?: (id: string) => void;
  index?: number;
}

const AnimatedDropdownItem: React.FC<AnimatedDropdownItemProps> = ({
  id,
  name,
  subtitle,
  imageUrl,
  svgIcon,
  isSelected = false,
  isDisabled = false,
  showStatusDot = false,
  statusColor = '#178d00',
  onClick,
  index = 0,
}) => {
  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick(id);
    }
  };

  return (
    <motion.div
      className={`${styles.dropdownItem} ${isDisabled ? styles.disabled : ''}`}
      onClick={handleClick}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.2, 
        delay: index * 0.05,
        ease: "easeOut"
      }}
      whileHover={!isDisabled ? {
        scale: 1.02,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        transition: { duration: 0.2, ease: "easeOut" }
      } : {}}
      whileTap={!isDisabled ? {
        scale: 0.98,
        transition: { duration: 0.1 }
      } : {}}
      style={{
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
      }}
    >
      <div className={styles.dropdownItemContent}>
        <div className={styles.avatarContainer}>
          {svgIcon ? (
            <Image
              src={svgIcon}
              alt={name}
              width={32}
              height={32}
              className={styles.svgIcon}
              style={{ objectFit: 'contain' }}
            />
          ) : imageUrl ? (
            <Image
              src={imageUrl || '/empty-image.png'}
              alt={name}
              width={32}
              height={32}
              className={styles.avatarImage}
              onError={(e) => {
                e.currentTarget.src = '/empty-image.png';
              }}
            />
          ) : null}
          {showStatusDot && (
            <div 
              className={styles.statusDot} 
              style={{ backgroundColor: statusColor }}
            />
          )}
        </div>
        <div className={styles.itemText}>
          <span className={styles.itemName}>{name}</span>
          {subtitle && <span className={styles.itemSubtitle}>({subtitle})</span>}
        </div>
      </div>
      {isSelected && " (Seleccionado)"}
    </motion.div>
  );
};

export default AnimatedDropdownItem; 