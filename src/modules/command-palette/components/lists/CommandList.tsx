/**
 * CommandList Component
 *
 * Lista genérica de items del Command Palette con soporte para secciones.
 * Renderiza los items según el nivel de navegación actual.
 *
 * @module command-palette/components/lists/CommandList
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FolderKanban, Users, Building2, UsersRound, ClipboardCheck } from 'lucide-react';
import { CommandItem } from '../items/CommandItem';
import type {
  CommandItem as CommandItemType,
  NavigationLevel,
} from '../../types/commandPalette.types';
import styles from '../../styles/command-palette.module.scss';

export interface CommandSection {
  id: string;
  title: string;
  icon?: React.ReactNode;
  items: CommandItemType[];
}

export interface CommandListProps {
  level: NavigationLevel;
  items: CommandItemType[];
  selectedIndex: number;
  onItemClick: (item: CommandItemType, index: number) => void;
  isLoading?: boolean;
  searchQuery?: string;
}

export function CommandList({
  level,
  items,
  selectedIndex,
  onItemClick,
  isLoading = false,
  searchQuery = '',
}: CommandListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={styles.loading}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={styles.loadingItem}>
            <div
              className={`${styles.loadingSkeleton} ${styles.circle}`}
              style={{ width: 32, height: 32 }}
            />
            <div style={{ flex: 1 }}>
              <div
                className={styles.loadingSkeleton}
                style={{ width: '60%', height: 14, marginBottom: 4 }}
              />
              <div
                className={styles.loadingSkeleton}
                style={{ width: '40%', height: 12 }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Search className={styles.emptyIcon} size={48} />
        <p className={styles.emptyTitle}>
          {searchQuery
            ? `No se encontraron resultados para "${searchQuery}"`
            : 'No hay items disponibles'}
        </p>
        <p className={styles.emptyDescription}>
          {searchQuery
            ? 'Intenta con otros términos de búsqueda'
            : 'Selecciona una cuenta para ver sus proyectos'}
        </p>
      </div>
    );
  }

  // Agrupar items por tipo para mostrar secciones
  const sections = groupItemsBySection(items, level);

  return (
    <div className={styles.content}>
      <AnimatePresence mode="wait">
        {sections.map((section) => (
          <motion.div
            key={section.id}
            className={styles.section}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.1 }}
          >
            {/* Section header */}
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                {section.icon}
                {section.title}
              </span>
              <span className={styles.sectionCount}>
                {section.items.length}
              </span>
            </div>

            {/* Section items */}
            {section.items.map((item) => {
              // Encontrar el índice global del item
              const globalIndex = items.findIndex((i) => i.id === item.id);

              return (
                <CommandItem
                  key={item.id}
                  item={item}
                  index={globalIndex}
                  isSelected={selectedIndex === globalIndex}
                  onClick={() => onItemClick(item, globalIndex)}
                />
              );
            })}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Agrupa los items por sección según el nivel de navegación
 */
function groupItemsBySection(
  items: CommandItemType[],
  level: NavigationLevel
): CommandSection[] {
  const sections: CommandSection[] = [];

  // Agrupar por tipo
  const workspaces = items.filter((i) => i.type === 'workspace');
  const projects = items.filter((i) => i.type === 'project');
  const members = items.filter((i) => i.type === 'member');
  const tasks = items.filter((i) => i.type === 'task');
  const teams = items.filter((i) => i.type === 'team');
  const actions = items.filter((i) => i.type === 'action');

  // Crear secciones según el nivel
  if (level === 'root') {
    // Mostrar tareas primero (son la funcionalidad principal)
    if (tasks.length > 0) {
      sections.push({
        id: 'tasks',
        title: 'Tareas',
        icon: <ClipboardCheck size={12} style={{ marginRight: 4 }} />,
        items: tasks,
      });
    }
    if (workspaces.length > 0) {
      sections.push({
        id: 'workspaces',
        title: 'Cuentas',
        icon: <Building2 size={12} style={{ marginRight: 4 }} />,
        items: workspaces,
      });
    }
    if (teams.length > 0) {
      sections.push({
        id: 'teams',
        title: 'Equipos',
        icon: <UsersRound size={12} style={{ marginRight: 4 }} />,
        items: teams,
      });
    }
  }

  if (level === 'workspace') {
    // Mostrar tareas primero en nivel workspace también
    if (tasks.length > 0) {
      sections.push({
        id: 'tasks',
        title: 'Tareas',
        icon: <ClipboardCheck size={12} style={{ marginRight: 4 }} />,
        items: tasks,
      });
    }
    if (projects.length > 0) {
      sections.push({
        id: 'projects',
        title: 'Proyectos',
        icon: <FolderKanban size={12} style={{ marginRight: 4 }} />,
        items: projects,
      });
    }
    if (members.length > 0) {
      sections.push({
        id: 'members',
        title: 'Miembros con tareas',
        icon: <Users size={12} style={{ marginRight: 4 }} />,
        items: members,
      });
    }
  }

  if (level === 'project' || level === 'member') {
    if (tasks.length > 0) {
      sections.push({
        id: 'tasks',
        title: 'Tareas',
        icon: <ClipboardCheck size={12} style={{ marginRight: 4 }} />,
        items: tasks,
      });
    }
    if (members.length > 0 && level === 'project') {
      sections.push({
        id: 'members',
        title: 'Asignados',
        icon: <Users size={12} style={{ marginRight: 4 }} />,
        items: members,
      });
    }
  }

  if (level === 'task') {
    if (actions.length > 0) {
      sections.push({
        id: 'actions',
        title: 'Acciones',
        items: actions,
      });
    }
  }

  // Si no hay secciones específicas, crear una genérica
  if (sections.length === 0 && items.length > 0) {
    sections.push({
      id: 'all',
      title: 'Resultados',
      items,
    });
  }

  return sections;
}

export default CommandList;
