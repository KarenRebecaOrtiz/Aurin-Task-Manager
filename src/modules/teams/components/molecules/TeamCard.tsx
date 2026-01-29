'use client';

import { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import { useDataStore } from '@/stores/dataStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useShallow } from 'zustand/react/shallow';
import { Building2, Globe, Lock, MessageSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/buttons';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CreateTeamDialog } from '../organisms/CreateTeamDialog';
import type { TeamCardProps } from '../../types';
import styles from './TeamCard.module.scss';

// Generate consistent gradient colors from a string ID
const getGradientFromId = (id: string): { color1: string; color2: string; color3: string } => {
  // Create a hash from the ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 60 + (Math.abs(hash >> 8) % 60)) % 360;
  const hue3 = (hue2 + 60 + (Math.abs(hash >> 16) % 60)) % 360;

  return {
    color1: `hsl(${hue1}, 85%, 60%)`,
    color2: `hsl(${hue2}, 85%, 60%)`,
    color3: `hsl(${hue3}, 85%, 60%)`,
  };
};

export function TeamCard({ team }: TeamCardProps) {
  const { user } = useUser();

  // Get clients to display account info
  const clients = useDataStore(useShallow((state) => state.clients));

  // State for edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Check if current user is admin (creator of the team)
  const isAdmin = user?.id === team.createdBy;

  // Get team initials
  const teamInitials = useMemo(() => {
    const name = team.name.trim();
    if (!name) return 'T';
    const words = name.split(' ').filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [team.name]);

  // Get client data (name and image)
  const clientData = useMemo(() => {
    const client = clients.find((c) => c.id === team.clientId);
    return {
      name: client?.name || 'Sin cuenta',
      imageUrl: client?.imageUrl || null,
      initials: client?.name ? client.name.charAt(0).toUpperCase() : 'S',
    };
  }, [clients, team.clientId]);

  // Keep clientName for backward compatibility
  const clientName = clientData.name;


  // Open team chat sidebar - Usa openTeamSidebar para chats de equipo
  const handleOpenChat = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const { openTeamSidebar } = useSidebarStateStore.getState();

      // Pasar el team directamente sin convertir a task
      openTeamSidebar(team, clientName);
    },
    [team, clientName]
  );

  // Open edit dialog
  const handleOpenEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditDialogOpen(true);
  }, []);

  return (
    <>
      <motion.div
        className={styles.card}
        whileHover={{ y: -2 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {/* Header with badge and edit button */}
        <div className={styles.header}>
          <div
            className={styles.badge}
            data-public={team.isPublic}
          >
            {team.isPublic ? (
              <>
                <Globe className="w-3 h-3" />
                <span>Público</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" />
                <span>Privado</span>
              </>
            )}
          </div>
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={styles.editButton}
                  onClick={handleOpenEdit}
                  aria-label="Editar equipo"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className={styles.tooltipContent}>
                Editar equipo
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Avatar and title */}
          <div className={styles.titleSection}>
            <div className={styles.teamAvatar}>
              {team.avatarUrl ? (
                // Custom uploaded image
                <Image
                  src={team.avatarUrl}
                  alt={team.name}
                  fill
                  className={styles.customAvatarImage}
                />
              ) : (
                // Gradient fallback
                <>
                  {(() => {
                    const colors = getGradientFromId(team.gradientId || team.id);
                    return (
                      <div
                        className={styles.avatarGradient}
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${colors.color1}, ${colors.color2}, ${colors.color3})`,
                          backgroundSize: '200% 200%',
                        }}
                      />
                    );
                  })()}
                  <svg className={styles.avatarNoise}>
                    <filter id={`noise-card-${team.id}`}>
                      <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.9"
                        numOctaves="4"
                        stitchTiles="stitch"
                      />
                      <feColorMatrix type="saturate" values="0" />
                      <feBlend mode="multiply" in="SourceGraphic" />
                    </filter>
                    <rect
                      width="100%"
                      height="100%"
                      filter={`url(#noise-card-${team.id})`}
                    />
                  </svg>
                  <span className={styles.teamInitials}>{teamInitials}</span>
                </>
              )}
            </div>
            <div className={styles.titleInfo}>
              <h3 className={styles.name}>{team.name}</h3>
              {team.description && (
                <p className={styles.description}>{team.description}</p>
              )}
            </div>
          </div>

          {/* Account section - Para todos los equipos */}
          <div className={styles.contributors}>
            <div className={styles.contributorsHeader}>
              <Building2 className="w-4 h-4" />
              <span>Cuenta</span>
            </div>
            <div className={styles.accountInfo}>
              <Avatar className={styles.contributorAvatar}>
                {clientData.imageUrl ? (
                  <AvatarImage
                    src={clientData.imageUrl}
                    alt={clientData.name}
                  />
                ) : null}
                <AvatarFallback className={styles.avatarFallback}>
                  {clientData.initials}
                </AvatarFallback>
              </Avatar>
              <span className={styles.accountName}>{clientData.name}</span>
            </div>
          </div>

          {/* Full width chat button */}
          <Button
            intent="primary"
            size="md"
            fullWidth
            leftIcon={MessageSquare}
            onClick={handleOpenChat}
          >
            Abrir Chat
          </Button>
        </div>
      </motion.div>

      {/* Edit Team Dialog */}
      <CreateTeamDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        mode="edit"
        teamId={team.id}
        clientId={team.clientId}
      />
    </>
  );
}

export default TeamCard;
