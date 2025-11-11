/**
 * @module config/constants/teams
 * @description Constantes relacionadas con equipos disponibles
 */

import { TeamOption } from '../types';

/**
 * Lista de equipos disponibles en la organización (solo nombres)
 */
export const TEAMS_LIST = [
  'Análisis de Datos',
  'Arquitectura',
  'Arte',
  'Desarrollo',
  'Cloud Computing',
  'DevOps',
  'Diseño gráfico',
  'Inteligencia Artificial',
  'No-Code Builders',
  'Project Management',
  'UX/UI',
].sort();

/**
 * Opciones de equipos en formato para ConfigDropdown
 */
export const TEAMS_OPTIONS = TEAMS_LIST.map(team => ({
  value: team,
  label: team,
  region: 'Equipos',
}));

/**
 * Máximo de equipos que un usuario puede unirse
 */
export const MAX_TEAMS = 3;

/**
 * Descripciones detalladas de cada equipo
 */
export const TEAM_DESCRIPTIONS: Record<string, string> = {
  'Análisis de Datos': 'Equipo especializado en análisis, visualización y procesamiento de datos.',
  'Arquitectura': 'Equipo de diseño arquitectónico y modelado 3D de estructuras.',
  'Arte': 'Equipo creativo enfocado en arte digital, animación y diseño visual.',
  'Desarrollo': 'Equipo de desarrollo de software y aplicaciones.',
  'Cloud Computing': 'Equipo especializado en infraestructura cloud y servicios en la nube.',
  'DevOps': 'Equipo de automatización, CI/CD y operaciones de desarrollo.',
  'Diseño gráfico': 'Equipo de diseño gráfico y creación de contenido visual.',
  'Inteligencia Artificial': 'Equipo de machine learning, IA y ciencia de datos.',
  'No-Code Builders': 'Equipo especializado en herramientas no-code y low-code.',
  'Project Management': 'Equipo de gestión de proyectos y coordinación.',
  'UX/UI': 'Equipo de diseño de experiencia e interfaz de usuario.',
};

/**
 * Colores asociados a cada equipo (para UI)
 */
export const TEAM_COLORS: Record<string, string> = {
  'Análisis de Datos': '#3B82F6',
  'Arquitectura': '#8B5CF6',
  'Arte': '#EC4899',
  'Desarrollo': '#10B981',
  'Cloud Computing': '#06B6D4',
  'DevOps': '#F59E0B',
  'Diseño gráfico': '#EF4444',
  'Inteligencia Artificial': '#6366F1',
  'No-Code Builders': '#14B8A6',
  'Project Management': '#F97316',
  'UX/UI': '#A855F7',
};

/**
 * Iconos asociados a cada equipo
 */
export const TEAM_ICONS: Record<string, string> = {
  'Análisis de Datos': '📊',
  'Arquitectura': '🏗️',
  'Arte': '🎨',
  'Desarrollo': '💻',
  'Cloud Computing': '☁️',
  'DevOps': '⚙️',
  'Diseño gráfico': '🖌️',
  'Inteligencia Artificial': '🤖',
  'No-Code Builders': '🔧',
  'Project Management': '📋',
  'UX/UI': '✨',
};

/**
 * Opciones de equipo con metadata completa
 */
export const TEAM_OPTIONS_WITH_METADATA: TeamOption[] = TEAMS_LIST.map(team => ({
  value: team,
  label: team,
  description: TEAM_DESCRIPTIONS[team],
  icon: TEAM_ICONS[team],
}));
