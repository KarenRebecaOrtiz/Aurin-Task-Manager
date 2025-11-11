export const getLogoFilter = (isDarkMode: boolean, isHover: boolean): string => {
  if (isHover) {
    return isDarkMode 
      ? 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5)) brightness(1.1)' 
      : 'drop-shadow(0 6px 12px rgba(255, 255, 255, 0.5)) brightness(1.1)';
  }
  return isDarkMode 
    ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
    : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))';
};

export const getDefaultLogoFilter = (isDarkMode: boolean): string => {
  return getLogoFilter(isDarkMode, false);
};

export const getHoverLogoFilter = (isDarkMode: boolean): string => {
  return getLogoFilter(isDarkMode, true);
};
