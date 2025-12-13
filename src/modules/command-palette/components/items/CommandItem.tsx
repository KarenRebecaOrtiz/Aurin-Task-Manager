/**
 * CommandItem Component
 *
 * Item genérico del Command Palette que renderiza diferentes tipos de items.
 * Soporta workspace, project, member, task, team y action.
 *
 * @module command-palette/components/items/CommandItem
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Building2,
  FolderKanban,
  User,
  ClipboardCheck,
  UsersRound,
  ChevronRight,
} from 'lucide-react';
import type { CommandItem as CommandItemType } from '../../types/commandPalette.types';
import { dropdownAnimations } from '@/modules/shared/components/molecules/Dropdown/animations';
import styles from '../../styles/command-palette.module.scss';

export interface CommandItemProps {
  item: CommandItemType;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export function CommandItem({
  item,
  index,
  isSelected,
  onClick,
}: CommandItemProps) {
  // Determinar icono según tipo
  const renderIcon = () => {
    // Para acciones, usar el icono del item
    if (item.type === 'action' && item.icon) {
      return item.icon;
    }

    // Para miembros con avatar
    if (item.type === 'member' && item.avatar) {
      return (
        <Image
          src={item.avatar}
          alt={item.title}
          width={32}
          height={32}
          className={styles.itemAvatar}
          unoptimized
        />
      );
    }

    // Para workspaces con logo
    if (item.type === 'workspace' && item.logo) {
      return (
        <Image
          src={item.logo}
          alt={item.title}
          width={32}
          height={32}
          className={styles.itemAvatar}
          unoptimized
        />
      );
    }

    // Iconos por defecto según tipo
    const iconMap = {
      workspace: <Building2 size={18} />,
      project: <FolderKanban size={18} />,
      member: <User size={18} />,
      task: <ClipboardCheck size={18} />,
      team: <UsersRound size={18} />,
      action: null,
    };

    const IconElement = iconMap[item.type];
    return IconElement ? (
      <div className={styles.itemIcon}>{IconElement}</div>
    ) : null;
  };

  // Determinar si tiene navegación drill-down
  const hasDrillDown = ['workspace', 'project', 'member', 'task', 'team'].includes(item.type);

  // Determinar clase de variante para acciones
  const getActionClass = () => {
    if (item.type !== 'action') return '';
    if (item.variant === 'danger') return styles.danger;
    if (item.variant === 'ai') return styles.ai;
    return '';
  };

  return (
    <motion.button
      type="button"
      data-command-index={index}
      className={`${styles.item} ${isSelected ? styles.selected : ''} ${item.type === 'action' ? styles.itemAction : ''} ${getActionClass()}`}
      onClick={onClick}
      {...dropdownAnimations.item(index)}
    >
      {/* Icon/Avatar */}
      {renderIcon()}

      {/* Content */}
      <div className={styles.itemContent}>
        <span className={styles.itemTitle}>{item.title}</span>
        {item.subtitle && (
          <span className={styles.itemSubtitle}>{item.subtitle}</span>
        )}
      </div>

      {/* Meta (badge, shortcut, priority) */}
      <div className={styles.itemMeta}>
        {/* Priority badge for tasks */}
        {item.type === 'task' && item.priority && (
          <span
            className={`${styles.priorityBadge} ${
              item.priority === 'Alta'
                ? styles.high
                : item.priority === 'Media'
                ? styles.medium
                : styles.low
            }`}
          >
            {item.priority}
          </span>
        )}

        {/* Badge (count or label) */}
        {item.badge && (
          <span className={styles.itemBadge}>{item.badge}</span>
        )}

        {/* Shortcut for actions */}
        {item.type === 'action' && item.shortcut && (
          <span className={styles.itemShortcut}>{item.shortcut}</span>
        )}

        {/* Drill-down indicator */}
        {hasDrillDown && (
          <ChevronRight size={14} className={styles.itemChevron} />
        )}
      </div>
    </motion.button>
  );
}

export default CommandItem;
