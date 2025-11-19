/**
 * Task by ID API Route
 *
 * GET /api/tasks/[id] - Get a specific task
 * PUT /api/tasks/[id] - Update a specific task
 * DELETE /api/tasks/[id] - Delete a specific task
 *
 * Requires authentication for all operations
 * PUT and DELETE require ownership (creator or admin)
 */

import { NextRequest } from 'next/server';
import { doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { withAuth } from '@/lib/api/auth';
import { apiSuccess, apiNoContent, apiBadRequest, apiNotFound, apiForbidden, handleApiError } from '@/lib/api/response';
import { updateTaskSchema, patchTaskSchema, Task } from '@/lib/validations/task.schema';
import { emailNotificationService } from '@/services/emailNotificationService';
import { updateTaskActivity } from '@/lib/taskUtils';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Helper to check if user is admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.publicMetadata?.role === 'admin' || user.publicMetadata?.role === 'Admin';
  } catch (error) {
    console.error('[API] Error checking admin status:', error);
    return false;
  }
}

/**
 * Helper to get task by ID
 */
async function getTaskById(taskId: string) {
  const taskDoc = await getDoc(doc(db, 'tasks', taskId));

  if (!taskDoc.exists()) {
    return null;
  }

  const data = taskDoc.data() as Task;
  return {
    id: taskDoc.id,
    ...data,
    startDate: data.startDate?.toDate?.() ? data.startDate.toDate().toISOString() : null,
    endDate: data.endDate?.toDate?.() ? data.endDate.toDate().toISOString() : null,
    createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
  };
}

/**
 * GET /api/tasks/[id]
 *
 * Get a specific task by ID.
 * User must have access to the task (be assigned to it, created it, or be admin).
 *
 * @param id - Task ID from URL
 * @returns 200 with task data or 404 if not found
 */
export const GET = withAuth(async (userId, request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: taskId } = await context.params;
    console.log('[API] GET /api/tasks/[id] - Fetching task:', taskId, 'for user:', userId);

    const task = await getTaskById(taskId);

    if (!task) {
      return apiNotFound('Task');
    }

    // Check if user has access to this task
    const userIsAdmin = await isAdmin(userId);
    const hasAccess =
      userIsAdmin ||
      task.CreatedBy === userId ||
      task.LeadedBy?.includes(userId) ||
      task.AssignedTo?.includes(userId);

    if (!hasAccess) {
      return apiForbidden('You do not have access to this task');
    }

    console.log('[API] Task found:', taskId);
    return apiSuccess(task);
  } catch (error: unknown) {
    return handleApiError(error, 'GET /api/tasks/[id]');
  }
});

/**
 * PUT /api/tasks/[id]
 *
 * Update a specific task.
 * Only the creator or admin can update a task.
 * Sends email notifications for significant changes.
 *
 * @param id - Task ID from URL
 * @body Same fields as POST /api/tasks (all optional)
 * @returns 200 with updated task data
 */
export const PUT = withAuth(async (userId, request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: taskId } = await context.params;
    console.log('[API] PUT /api/tasks/[id] - Updating task:', taskId, 'by user:', userId);

    // Get existing task
    const existingTaskDoc = await getDoc(doc(db, 'tasks', taskId));

    if (!existingTaskDoc.exists()) {
      return apiNotFound('Task');
    }

    const existingTask = existingTaskDoc.data() as Task;

    // Check permissions (creator or admin only)
    const userIsAdmin = await isAdmin(userId);
    if (existingTask.CreatedBy !== userId && !userIsAdmin) {
      return apiForbidden('Only the task creator or admin can update this task');
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateTaskSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[API] Validation failed:', validationResult.error.errors);
      return apiBadRequest('Invalid task data', validationResult.error.errors);
    }

    const updateData = validationResult.data;

    // Validate date range if both dates are provided
    if (updateData.startDate && updateData.endDate && updateData.startDate > updateData.endDate) {
      return apiBadRequest('Start date must be before end date');
    }

    // Prepare updated task data
    const updatedTask: Task = {
      ...existingTask,
      ...updateData,
      id: taskId,
      CreatedBy: existingTask.CreatedBy, // Preserve creator
      createdAt: existingTask.createdAt, // Preserve creation date
      updatedAt: Timestamp.fromDate(new Date()),
      // Convert dates to Firestore Timestamps
      startDate: updateData.startDate ? Timestamp.fromDate(updateData.startDate) : existingTask.startDate,
      endDate: updateData.endDate ? Timestamp.fromDate(updateData.endDate) : existingTask.endDate,
    } as Task;

    // Save updated task
    await setDoc(doc(db, 'tasks', taskId), updatedTask);

    // Update task activity
    await updateTaskActivity(taskId, 'edit');

    // Detect changes and send targeted notifications
    const recipients = new Set<string>([
      ...(updatedTask.LeadedBy || []),
      ...(updatedTask.AssignedTo || [])
    ]);
    recipients.delete(userId); // Don't notify the user making the change

    if (recipients.size > 0) {
      try {
        // Determine notification type based on changes
        let notificationType = 'task_status_changed';
        let notificationMessage = `Se actualizó la tarea "${updatedTask.name}"`;

        if (updateData.priority && updateData.priority !== existingTask.priority) {
          notificationType = 'task_priority_changed';
          notificationMessage = `La prioridad de "${updatedTask.name}" cambió a ${updateData.priority}`;
        } else if (updateData.startDate !== existingTask.startDate || updateData.endDate !== existingTask.endDate) {
          notificationType = 'task_dates_changed';
          notificationMessage = `Las fechas de "${updatedTask.name}" fueron actualizadas`;
        } else if (JSON.stringify(updateData.AssignedTo) !== JSON.stringify(existingTask.AssignedTo)) {
          notificationType = 'task_assignment_changed';
          notificationMessage = `La asignación de "${updatedTask.name}" fue modificada`;
        }

        await emailNotificationService.createEmailNotificationsForRecipients({
          userId,
          message: notificationMessage,
          type: notificationType as any,
          taskId,
        }, Array.from(recipients));

        console.log('[API] Sent', notificationType, 'notifications to:', recipients.size, 'recipients');
      } catch (notificationError) {
        console.warn('[API] Failed to send notifications:', notificationError);
        // Don't fail the request if notifications fail
      }
    }

    console.log('[API] Task updated successfully:', taskId);

    // Return updated task with ISO date strings
    return apiSuccess({
      id: taskId,
      ...updatedTask,
      startDate: updatedTask.startDate?.toDate?.() ? updatedTask.startDate.toDate().toISOString() : null,
      endDate: updatedTask.endDate?.toDate?.() ? updatedTask.endDate.toDate().toISOString() : null,
      createdAt: updatedTask.createdAt?.toDate?.() ? updatedTask.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: updatedTask.updatedAt?.toDate?.() ? updatedTask.updatedAt.toDate().toISOString() : new Date().toISOString(),
    });
  } catch (error: unknown) {
    return handleApiError(error, 'PUT /api/tasks/[id]');
  }
});

/**
 * DELETE /api/tasks/[id]
 *
 * Delete a specific task.
 * Only the creator or admin can delete a task.
 *
 * @param id - Task ID from URL
 * @returns 204 No Content on success
 */
export const DELETE = withAuth(async (userId, request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: taskId } = await context.params;
    console.log('[API] DELETE /api/tasks/[id] - Deleting task:', taskId, 'by user:', userId);

    // Get existing task
    const existingTaskDoc = await getDoc(doc(db, 'tasks', taskId));

    if (!existingTaskDoc.exists()) {
      return apiNotFound('Task');
    }

    const existingTask = existingTaskDoc.data() as Task;

    // Check permissions (creator or admin only)
    const userIsAdmin = await isAdmin(userId);
    if (existingTask.CreatedBy !== userId && !userIsAdmin) {
      return apiForbidden('Only the task creator or admin can delete this task');
    }

    // Delete task
    await deleteDoc(doc(db, 'tasks', taskId));

    console.log('[API] Task deleted successfully:', taskId);
    return apiNoContent();
  } catch (error: unknown) {
    return handleApiError(error, 'DELETE /api/tasks/[id]');
  }
});

/**
 * PATCH /api/tasks/[id]
 *
 * Partial update of a task (for quick status/priority changes).
 * Only the creator or admin can update a task.
 *
 * @param id - Task ID from URL
 * @body Partial task fields
 * @returns 200 with updated task data
 */
export const PATCH = withAuth(async (userId, request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: taskId } = await context.params;
    console.log('[API] PATCH /api/tasks/[id] - Partially updating task:', taskId, 'by user:', userId);

    // Get existing task
    const existingTaskDoc = await getDoc(doc(db, 'tasks', taskId));

    if (!existingTaskDoc.exists()) {
      return apiNotFound('Task');
    }

    const existingTask = existingTaskDoc.data() as Task;

    // Check permissions (creator or admin only)
    const userIsAdmin = await isAdmin(userId);
    if (existingTask.CreatedBy !== userId && !userIsAdmin) {
      return apiForbidden('Only the task creator or admin can update this task');
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = patchTaskSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[API] Validation failed:', validationResult.error.errors);
      return apiBadRequest('Invalid task data', validationResult.error.errors);
    }

    const patchData = validationResult.data;

    // Merge with existing data
    const updatedTask = {
      ...existingTask,
      ...patchData,
      updatedAt: Timestamp.fromDate(new Date()),
      // Convert dates to Timestamps if provided
      ...(patchData.startDate !== undefined && { startDate: patchData.startDate ? Timestamp.fromDate(patchData.startDate) : null }),
      ...(patchData.endDate !== undefined && { endDate: patchData.endDate ? Timestamp.fromDate(patchData.endDate) : null }),
    };

    // Save updated task
    await setDoc(doc(db, 'tasks', taskId), updatedTask);

    // Update task activity
    await updateTaskActivity(taskId, 'edit');

    console.log('[API] Task partially updated:', taskId);

    return apiSuccess({
      id: taskId,
      ...updatedTask,
      startDate: updatedTask.startDate?.toDate?.() ? updatedTask.startDate.toDate().toISOString() : null,
      endDate: updatedTask.endDate?.toDate?.() ? updatedTask.endDate.toDate().toISOString() : null,
      createdAt: updatedTask.createdAt?.toDate?.() ? updatedTask.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: updatedTask.updatedAt?.toDate?.() ? updatedTask.updatedAt.toDate().toISOString() : new Date().toISOString(),
    });
  } catch (error: unknown) {
    return handleApiError(error, 'PATCH /api/tasks/[id]');
  }
});
