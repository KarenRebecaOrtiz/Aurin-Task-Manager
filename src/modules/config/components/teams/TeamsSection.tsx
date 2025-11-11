'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ConfigDropdown from '../ui/ConfigDropdown';
import TeamsTable from '../ui/TeamsTable';
import { useProfileForm, useTeamsManagement } from '../../hooks';
import { TEAMS_OPTIONS, TEAM_DESCRIPTIONS } from '../../constants';
import styles from './TeamsSection.module.scss';

interface TeamsSectionProps {
  userId: string;
  isOwnProfile: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string, error?: string) => void;
}

const tableVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: -20,
    transition: { duration: 0.3 }
  }
};

export const TeamsSection: React.FC<TeamsSectionProps> = ({
  userId,
  isOwnProfile,
  onSuccess,
  onError,
}) => {
  const { formData, handleTeamsChange } = useProfileForm({ userId, onSuccess, onError });
  const { teamMembers, loading } = useTeamsManagement(formData?.teams || []);

  if (!formData) return null;

  const handleRemoveTeam = (team: string) => {
    const newTeams = formData.teams?.filter((t) => t !== team) || [];
    handleTeamsChange(newTeams);
  };

  // Transformar datos para TeamsTable
  const teamsData = (formData.teams || []).map(teamName => ({
    name: teamName,
    members: teamMembers[teamName] || []
  }));

  console.log('[TeamsSection] formData.teams:', formData.teams);
  console.log('[TeamsSection] teamMembers:', teamMembers);
  console.log('[TeamsSection] teamsData:', teamsData);
  console.log('[TeamsSection] teamsData[0]:', teamsData[0]);
  console.log('[TeamsSection] loading:', loading);
  console.log('[TeamsSection] Should show table?', formData.teams && formData.teams.length > 0);

  return (
    <>
      {/* Selector de Equipos */}
      <section className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Image src="/users-round.svg" alt="Equipos" width={20} height={20} className={styles.sectionIcon} />
              Mis Equipos
            </h2>
            <div className={styles.stackDescription}>
              Selecciona hasta 3 equipos a los que perteneces.
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <ConfigDropdown
              options={TEAMS_OPTIONS}
              value={formData.teams || []}
              onChange={handleTeamsChange}
              placeholder="Selecciona tus equipos..."
              disabled={!isOwnProfile}
              isMulti={true}
            />
          </div>
          
          {/* Chips de equipos seleccionados */}
          {formData.teams && formData.teams.length > 0 && (
            <div className={styles.selectedTeamsContainer}>
              {formData.teams.map((team) => (
                <div key={team} className={styles.teamChip}>
                  <span>{team}</span>
                  {isOwnProfile && (
                    <button
                      onClick={() => handleRemoveTeam(team)}
                      className={styles.removeButton}
                      aria-label={`Eliminar ${team}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Descripción de Equipos */}
      {formData.teams && formData.teams.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionContent}>
            <h3 className={styles.subsectionTitle}>Descripción de Equipos</h3>
            <div className={styles.teamsDescriptionGrid}>
              {formData.teams.map((team) => (
                <div key={team} className={styles.teamDescriptionCard}>
                  <h4 className={styles.teamName}>{team}</h4>
                  <p className={styles.teamDescription}>
                    {TEAM_DESCRIPTIONS[team] || 'Equipo de trabajo colaborativo.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tabla de Miembros */}
      <AnimatePresence mode="wait">
        {formData.teams && formData.teams.length > 0 && (
          <motion.section
            key="teams-table"
            variants={tableVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={styles.section}
          >
            <div className={styles.sectionContent}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <Image src="/users-round.svg" alt="Miembros" width={20} height={20} className={styles.sectionIcon} />
                  Miembros de los Equipos
                </h2>
                <div className={styles.stackDescription}>
                  Visualiza los miembros de cada equipo al que perteneces.
                </div>
              </div>
              <TeamsTable
                teams={teamsData}
                currentUserId={userId}
                isEditing={isOwnProfile}
                onRemoveTeam={handleRemoveTeam}
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Mensaje cuando no hay equipos */}
      {(!formData.teams || formData.teams.length === 0) && (
        <section className={styles.section}>
          <div className={styles.sectionContent}>
            <div className={styles.emptyState}>
              <Image src="/users-round.svg" alt="Sin equipos" width={48} height={48} opacity={0.3} />
              <p className={styles.emptyStateText}>
                No perteneces a ningún equipo aún. Selecciona hasta 3 equipos arriba.
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
};
