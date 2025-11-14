// This is a placeholder for the actual task service.
// The user would need to implement the real backend logic here.

export const taskService = {
  archive: async (taskId: string): Promise<void> => {
    console.log(`[taskService] Archiving task: ${taskId}`);
    
    // Simulate a network request
    await new Promise(resolve => setTimeout(resolve, 500));

    // To test the rollback logic, you can uncomment the following line:
    // throw new Error("Failed to archive task on the server.");

    console.log(`[taskService] Successfully archived task: ${taskId}`);
    return Promise.resolve();
  },
};
