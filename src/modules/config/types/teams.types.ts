/**
 * @module config/types/teams
 * @description Tipos relacionados con equipos y miembros
 */

/**
 * Usuario/Miembro de un equipo
 */
export interface User {
  /** ID único del usuario */
  id: string;
  /** Nombre completo del usuario */
  fullName: string;
  /** Equipos a los que pertenece */
  teams?: string[];
  /** Rol o título profesional */
  role?: string;
  /** URL de la foto de perfil */
  profilePhoto?: string;
}

/**
 * Equipo con sus miembros
 */
export interface Team {
  /** Nombre del equipo */
  name: string;
  /** Miembros del equipo */
  members: User[];
  /** Descripción del equipo */
  description?: string;
  /** Color del equipo (para UI) */
  color?: string;
}

/**
 * Mapa de equipos con sus miembros
 */
export interface TeamMembersMap {
  [teamName: string]: User[];
}

/**
 * Props para la sección de equipos
 */
export interface TeamsSectionProps {
  /** Equipos seleccionados del usuario */
  selectedTeams: string[];
  /** Callback cuando cambian los equipos */
  onChange: (teams: string[]) => void;
  /** Máximo de equipos permitidos */
  maxTeams?: number;
  /** Si está deshabilitado */
  disabled?: boolean;
}

/**
 * Props para la tabla de equipos
 */
export interface TeamsTableProps {
  /** Equipos a mostrar */
  teams: string[];
  /** Mapa de miembros por equipo */
  teamMembers: TeamMembersMap;
  /** Si está cargando */
  loading?: boolean;
  /** Callback cuando se selecciona un miembro */
  onMemberClick?: (user: User) => void;
}

/**
 * Props para la tarjeta de equipo
 */
export interface TeamCardProps {
  /** Equipo a mostrar */
  team: Team;
  /** Si el equipo está seleccionado */
  selected: boolean;
  /** Callback cuando se selecciona/deselecciona */
  onToggle: () => void;
  /** Si está deshabilitado */
  disabled?: boolean;
}

/**
 * Opciones de equipo disponibles
 */
export interface TeamOption {
  /** Valor del equipo */
  value: string;
  /** Etiqueta a mostrar */
  label: string;
  /** Descripción del equipo */
  description?: string;
  /** Icono del equipo */
  icon?: string;
}
