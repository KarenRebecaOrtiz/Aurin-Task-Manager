import { ContainerType } from '../types';
import { SUBTITLES, ARCHIVE_SUBTITLE } from '../constants';

export const getSubtitleByContainer = (
  container: ContainerType,
  isArchiveOpen: boolean
): string => {
  if (isArchiveOpen) {
    return ARCHIVE_SUBTITLE;
  }
  return SUBTITLES[container];
};
