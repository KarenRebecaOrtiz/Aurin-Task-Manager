// Componente principal
export { default as Header } from './components/Header';

// Componentes UI (exportados para uso externo si es necesario)
export { default as AdviceInput } from './components/ui/AdviceInput';
export { default as AvailabilityToggle } from './components/ui/AvailabilityToggle';
export { default as GeoClock } from './components/ui/GeoClock';
export { TextShimmer } from './components/ui/TextShimmer';
export { default as AvatarDropdown } from './components/ui/AvatarDropdown';
// ToDoDynamic (submódulo completo)
export { ToDoDynamic } from './components/ui/ToDoDynamic';
export * from './components/ui/ToDoDynamic';

// Theme Toggler (submódulo completo)
export { default as ThemeToggler } from './components/theme-toggler';
export * from './components/theme-toggler/types';
export * from './components/theme-toggler/hooks';
export * from './components/theme-toggler/utils';
export * from './components/theme-toggler/constants';

// Hooks (exportados para reutilización)
export * from './hooks';

// Types (exportados para uso externo)
export * from './types';

// Utils (exportados para uso externo)
export * from './utils';

// Constants (exportados para uso externo)
export * from './constants';
