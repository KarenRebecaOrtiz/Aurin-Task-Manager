import { ContainerType } from './header.types';

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

// GeoClockProps is intentionally empty - component accepts no props
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GeoClockProps {}

export interface AvatarDropdownProps {
  onChangeContainer: (container: ContainerType) => void;
}
