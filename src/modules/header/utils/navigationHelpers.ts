export const canNavigate = (
  hasUnsavedChanges: boolean,
  isModalOpen: boolean
): boolean => {
  if (!isModalOpen) {
    return true;
  }
  return !hasUnsavedChanges;
};

export const shouldShowConfirmation = (
  isModalOpen: boolean,
  hasUnsavedChanges: boolean
): boolean => {
  return isModalOpen && hasUnsavedChanges;
};
