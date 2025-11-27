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
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/api/auth';
import { apiSuccess, apiNoContent, apiBadRequest, apiNotFound, apiForbidden, handleApiError } from '@/lib/api/response';
import { updateTaskSchema, patchTaskSchema, Task } from '@/lib/validations/task.schema';
import { mailer } from '@/modules/mailer';
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
  const adminDb = getAdminDb();
  const taskDoc = await adminDb.collection('tasks').doc(taskId).get();

  if (!taskDoc.exists) {
    return null;
  }

  const data = taskDoc.data() as any;
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
// @ts-expect-error - withAuth type inference issue with multiple return types
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
// @ts-expect-error - withAuth type inference issue with multiple return types
export const PUT = withAuth(async (userId, request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: taskId } = await context.params;
    console.log('[API] PUT /api/tasks/[id] - Updating task:', taskId, 'by user:', userId);

    // Get existing task
    const adminDb = getAdminDb();
    const existingTaskDoc = await adminDb.collection('tasks').doc(taskId).get();

    if (!existingTaskDoc.exists) {
      return apiNotFound('Task');
    }

    const existingTask = existingTaskDoc.data() as any;

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
    const updatedTask: any = {
      ...existingTask,
      ...updateData,
      id: taskId,
      CreatedBy: existingTask.CreatedBy, // Preserve creator
      createdAt: existingTask.createdAt, // Preserve creation date
      updatedAt: Timestamp.fromDate(new Date()),
      // Convert dates to Firestore Timestamps
      startDate: updateData.startDate ? Timestamp.fromDate(updateData.startDate) : existingTask.startDate,
      endDate: updateData.endDate ? Timestamp.fromDate(updateData.endDate) : existingTask.endDate,
    };

    // Save updated task
    await adminDb.collection('tasks').doc(taskId).set(updatedTask);

    // Update task activity - skipped (TODO: migrate to Admin SDK)
    // await updateTaskActivity(taskId, 'edit');

    // Detect changes and send targeted notifications (using new mailer module)
    const recipients = [
      ...(updatedTask.LeadedBy || []),
      ...(updatedTask.AssignedTo || [])
    ];

    if (recipients.length > 0) {
      try {
        // Determine notification type based on changes
        let result;

        if (updateData.status && updateData.status !== existingTask.status) {
          // Status changed
          result = await mailer.notifyTaskStatusChanged({
            recipientIds: recipients,
            taskId,
            actorId: userId,
            oldStatus: existingTask.status,
            newStatus: updateData.status,
          });
        } else if (updateData.priority && updateData.priority !== existingTask.priority) {
          // Priority changed
          result = await mailer.notifyTaskPriorityChanged({
            recipientIds: recipients,
            taskId,
            actorId: userId,
            oldPriority: existingTask.priority,
            newPriority: updateData.priority,
          });
        } else if (updateData.startDate !== existingTask.startDate || updateData.endDate !== existingTask.endDate) {
          // Dates changed
          result = await mailer.notifyTaskDatesChanged({
            recipientIds: recipients,
            taskId,
            actorId: userId,
          });
        } else if (JSON.stringify(updateData.AssignedTo) !== JSON.stringify(existingTask.AssignedTo) ||
                   JSON.stringify(updateData.LeadedBy) !== JSON.stringify(existingTask.LeadedBy)) {
          // Assignment changed
          result = await mailer.notifyTaskAssignmentChanged({
            recipientIds: recipients,
            taskId,
            actorId: userId,
          });
        } else {
          // General update
          result = await mailer.notifyTaskUpdated({
            recipientIds: recipients,
            taskId,
            actorId: userId,
          });
        }

        console.log('[API] Email notifications sent:', result.sent, 'successful,', result.failed, 'failed');
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
    const adminDb = getAdminDb();
    const existingTaskDoc = await adminDb.collection('tasks').doc(taskId).get();

    if (!existingTaskDoc.exists) {
      return apiNotFound('Task');
    }

    const existingTask = existingTaskDoc.data() as any;

    // Check permissions (creator or admin only)
    const userIsAdmin = await isAdmin(userId);
    if (existingTask.CreatedBy !== userId && !userIsAdmin) {
      return apiForbidden('Only the task creator or admin can delete this task');
    }

    // Send email notifications BEFORE deleting (so we can access task data)
    const recipients = [
      ...(existingTask.LeadedBy || []),
      ...(existingTask.AssignedTo || [])
    ];

    if (recipients.length > 0) {
      try {
        const result = await mailer.notifyTaskDeleted({
          recipientIds: recipients,
          taskId,
          actorId: userId,
        });

        console.log('[API] DELETE - Email notifications sent:', result.sent, 'successful,', result.failed, 'failed');
      } catch (notificationError) {
        console.warn('[API] DELETE - Failed to send notifications:', notificationError);
        // Don't fail the request if notifications fail
      }
    }

    // CASCADE DELETE: Delete all timers for this task (subcollection cleanup)
    // This prevents orphaned timers when a task is deleted
    try {
      const timersSnapshot = await adminDb
        .collection('tasks')
        .doc(taskId)
        .collection('timers')
        .get();

      if (!timersSnapshot.empty) {
        const deletePromises = timersSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);
        console.log('[API] DELETE - Deleted', timersSnapshot.size, 'timer(s) for task:', taskId);
      }
    } catch (timerError) {
      console.warn('[API] DELETE - Failed to delete timers:', timerError);
      // Don't fail the request if timer cleanup fails
    }

    // Delete task
    await adminDb.collection('tasks').doc(taskId).delete();

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
// @ts-expect-error - withAuth type inference issue with multiple return types
export const PATCH = withAuth(async (userId, request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: taskId } = await context.params;
    console.log('[API] PATCH /api/tasks/[id] - Partially updating task:', taskId, 'by user:', userId);

    // Get existing task
    const adminDb = getAdminDb();
    const existingTaskDoc = await adminDb.collection('tasks').doc(taskId).get();

    if (!existingTaskDoc.exists) {
      return apiNotFound('Task');
    }

    const existingTask = existingTaskDoc.data() as any;

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
    const updatedTask: any = {
      ...existingTask,
      ...patchData,
      updatedAt: Timestamp.fromDate(new Date()),
      // Convert dates to Timestamps if provided
      ...(patchData.startDate !== undefined && { startDate: patchData.startDate ? Timestamp.fromDate(patchData.startDate) : null }),
      ...(patchData.endDate !== undefined && { endDate: patchData.endDate ? Timestamp.fromDate(patchData.endDate) : null }),
    };

    // Save updated task
    await adminDb.collection('tasks').doc(taskId).set(updatedTask);

    // Update task activity - skipped (TODO: migrate to Admin SDK)
    // await updateTaskActivity(taskId, 'edit');

    // Send email notifications to assigned team members (using new mailer module)
    const recipients = [
      ...(updatedTask.LeadedBy || []),
      ...(updatedTask.AssignedTo || [])
    ];

    if (recipients.length > 0) {
      try {
        // Determine notification type based on changes
        let result;

        if (patchData.status !== undefined && patchData.status !== existingTask.status) {
          // Status changed
          result = await mailer.notifyTaskStatusChanged({
            recipientIds: recipients,
            taskId,
            actorId: userId,
            oldStatus: existingTask.status,
            newStatus: patchData.status,
          });
        } else if (patchData.priority !== undefined && patchData.priority !== existingTask.priority) {
          // Priority changed
          result = await mailer.notifyTaskPriorityChanged({
            recipientIds: recipients,
            taskId,
            actorId: userId,
            oldPriority: existingTask.priority,
            newPriority: patchData.priority,
          });
        } else if (patchData.startDate !== existingTask.startDate || patchData.endDate !== existingTask.endDate) {
          // Dates changed
          result = await mailer.notifyTaskDatesChanged({
            recipientIds: recipients,
            taskId,
            actorId: userId,
          });
        } else if (JSON.stringify(patchData.AssignedTo) !== JSON.stringify(existingTask.AssignedTo) ||
                   JSON.stringify(patchData.LeadedBy) !== JSON.stringify(existingTask.LeadedBy)) {
          // Assignment changed
          result = await mailer.notifyTaskAssignmentChanged({
            recipientIds: recipients,
            taskId,
            actorId: userId,
          });
        } else {
          // General update
          result = await mailer.notifyTaskUpdated({
            recipientIds: recipients,
            taskId,
            actorId: userId,
          });
        }

        console.log('[API] PATCH - Email notifications sent:', result.sent, 'successful,', result.failed, 'failed');
      } catch (notificationError) {
        console.warn('[API] PATCH - Failed to send notifications:', notificationError);
        // Don't fail the request if notifications fail
      }
    }

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
