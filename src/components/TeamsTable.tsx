'use client';

import { useState } from 'react';
import Image from 'next/image';
import Table from './Table';
import styles from './TeamsTable.module.scss';

interface User {
  id: string;
  fullName: string;
  role?: string;
  profilePhoto?: string;
}

interface Team {
  name: string;
  members: User[];
}

interface TeamsTableProps {
  teams: Team[];
  currentUserId?: string;
  onRemoveTeam?: (teamName: string) => void;
  isEditing?: boolean;
}

const TeamsTable = ({ teams, currentUserId, onRemoveTeam, isEditing }: TeamsTableProps) => {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleTeamExpansion = (teamName: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamName)) {
      newExpanded.delete(teamName);
    } else {
      newExpanded.add(teamName);
    }
    setExpandedTeams(newExpanded);
  };

  const teamTableColumns = [
    {
      key: 'profilePhoto',
      label: 'Foto',
      width: '15%',
      mobileVisible: true,
      render: (member: User) => (
        <div className={styles.avatarWrapper}>
          <Image
            src={member.profilePhoto || '/empty-image.png'}
            alt={member.fullName}
            width={40}
            height={40}
            className={styles.teamAvatar}
            onError={(e) => {
              e.currentTarget.src = '/empty-image.png';
            }}
          />
        </div>
      ),
    },
    {
      key: 'fullName',
      label: 'Nombre',
      width: '50%',
      mobileVisible: true,
    },
    {
      key: 'role',
      label: 'Rol',
      width: '35%',
      mobileVisible: true,
    },
  ];

  if (!teams || teams.length === 0) {
    return (
      <div className={styles.noTeamsMessage}>
        No pertenece a ningún equipo
      </div>
    );
  }

  return (
    <div className={styles.teamsContainer}>
      {teams.map((team) => {
        const filteredMembers = team.members.filter(member => member.id !== currentUserId);
        const memberCount = filteredMembers.length;
        
        return (
          <div key={team.name} className={styles.teamCard}>
            <div className={styles.teamHeader}>
              <h3 className={styles.teamTitle}>{team.name}</h3>
              <div className={styles.teamMemberCount}>
                {memberCount} miembro{memberCount !== 1 ? 's' : ''}
              </div>
              {isEditing && onRemoveTeam && (
                <button
                  className={styles.removeTeamButton}
                  onClick={() => onRemoveTeam(team.name)}
                  title="Eliminar equipo"
                >
                  ✕
                </button>
              )}
            </div>
            
            {memberCount > 0 && (
              <div className={styles.teamContent}>
                <button
                  className={styles.expandButton}
                  onClick={() => toggleTeamExpansion(team.name)}
                  aria-expanded={expandedTeams.has(team.name)}
                >
                  {expandedTeams.has(team.name) ? 'Ocultar miembros' : 'Ver miembros'}
                </button>
                
                {expandedTeams.has(team.name) && (
                  <div className={styles.teamTableWrapper}>
                    <Table
                      data={filteredMembers}
                      columns={teamTableColumns}
                      itemsPerPage={5}
                      emptyStateType="team"
                    />
                  </div>
                )}
              </div>
            )}
            
            {memberCount === 0 && (
              <div className={styles.noMembersMessage}>
                No hay otros miembros visibles en este equipo
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TeamsTable; 