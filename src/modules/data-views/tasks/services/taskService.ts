// Task service that integrates with the global services layer
import { archiveTask as archiveTaskGlobal, unarchiveTask as unarchiveTaskGlobal } from '@/services/taskService';

export const taskService = {
  /**
   * Archives a task using the global task service
   * @param taskId - The ID of the task to archive
   * @param userId - The ID of the user performing the archive action
   */
  archive: async (taskId: string, userId: string): Promise<void> => {
    return archiveTaskGlobal(taskId, userId);
  },

  /**
   * Unarchives a task using the global task service
   * @param taskId - The ID of the task to unarchive
   */
  unarchive: async (taskId: string): Promise<void> => {
    return unarchiveTaskGlobal(taskId);
  },
};
