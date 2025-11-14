import { ContainerType, PersonalLocations } from './header.types';

export interface LogoSectionProps {
  isDarkMode: boolean;
  onLogoClick: () => void;
  onLogoMouseEnter: (e: React.MouseEvent<HTMLImageElement>) => void;
  onLogoMouseLeave: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export interface WelcomeSectionProps {
  userName: string;
  subtitle: string;
  onChangeContainer: (container: ContainerType) => void;
}

export interface HeaderActionsProps {
  personalLocations?: PersonalLocations;
  onChangeContainer: (container: ContainerType) => void;
}

export interface TextShimmerProps {
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
}

export interface AdviceInputProps {
  isAdmin: boolean;
}

export interface GeoClockProps {
  personalLocations?: PersonalLocations;
}

export interface AvatarDropdownProps {
  onChangeContainer: (container: ContainerType) => void;
}
