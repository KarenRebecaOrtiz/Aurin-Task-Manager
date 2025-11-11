/**
 * @module config/types/locations
 * @description Tipos relacionados con ubicaciones personalizadas del usuario
 */

/**
 * Representa una ubicación personal del usuario
 * Las ubicaciones se cifran con AES-256 para privacidad
 */
export interface PersonalLocation {
  /** Nombre descriptivo de la ubicación (ej: "Casa", "Oficina") */
  name: string;
  /** Dirección completa de la ubicación */
  address: string;
  /** Latitud de la ubicación */
  lat: number;
  /** Longitud de la ubicación */
  lng: number;
  /** Radio de geofencing en metros */
  radius: number;
}

/**
 * Contenedor para las ubicaciones personalizadas del usuario
 */
export interface PersonalLocations {
  /** Ubicación principal (casa) */
  home?: PersonalLocation;
  /** Ubicación secundaria (oficina, etc.) */
  secondary?: PersonalLocation;
}

/**
 * Props para componentes de ubicación
 */
export interface LocationProps {
  /** Ubicación actual */
  location?: PersonalLocation;
  /** Callback cuando cambia la ubicación */
  onChange: (location: PersonalLocation) => void;
  /** Callback cuando se elimina la ubicación */
  onRemove?: () => void;
  /** Si el componente está en modo de solo lectura */
  readOnly?: boolean;
  /** Etiqueta para el campo */
  label?: string;
}

/**
 * Props para el mapa de ubicación
 */
export interface LocationMapProps {
  /** Ubicación a mostrar en el mapa */
  location: PersonalLocation;
  /** Si el mapa permite edición */
  editable?: boolean;
  /** Callback cuando cambia la ubicación en el mapa */
  onChange?: (location: PersonalLocation) => void;
  /** Altura del mapa en píxeles */
  height?: number;
}
