import { useMemo } from 'react';
import { ContainerType } from '../types';
import { getSubtitleByContainer } from '../utils';

export const useSubtitleContent = (
  selectedContainer: ContainerType,
  isArchiveTableOpen: boolean
): string => {
  return useMemo(
    () => getSubtitleByContainer(selectedContainer, isArchiveTableOpen),
    [selectedContainer, isArchiveTableOpen]
  );
};
