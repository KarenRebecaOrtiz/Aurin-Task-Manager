import { useCallback } from 'react';
import { ContainerType } from '../types';
import { getHoverLogoFilter, getDefaultLogoFilter } from '../utils';

export const useLogoInteractions = (
  isDarkMode: boolean,
  handleContainerChange: (container: ContainerType) => void
) => {
  const handleLogoClick = useCallback(() => {
    handleContainerChange('tareas');
  }, [handleContainerChange]);

  const handleLogoMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      e.currentTarget.style.filter = getHoverLogoFilter(isDarkMode);
    },
    [isDarkMode]
  );

  const handleLogoMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      e.currentTarget.style.filter = getDefaultLogoFilter(isDarkMode);
    },
    [isDarkMode]
  );

  return {
    handleLogoClick,
    handleLogoMouseEnter,
    handleLogoMouseLeave,
  };
};
