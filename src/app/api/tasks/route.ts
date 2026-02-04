/**
 * Tasks API Route
 *
 * POST /api/tasks - Create a new task
 * GET /api/tasks - List tasks with optional filters
 *
 * Requires authentication for all operations
 */

import { NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/api/auth';
import { apiSuccess, apiCreated, apiBadRequest, handleApiError } from '@/lib/api/response';
import { createTaskSchema, taskQuerySchema } from '@/lib/validations/task.schema';
import { mailer } from '@/modules/mailer';

/**
 * POST /api/tasks
 *
 * Create a new task with the provided data.
 * Automatically adds the authenticated user as the creator.
 * Sends email notifications to assigned team members.
 *
 * @body clientId - Client/Account ID
 * @body project - Project/Folder name
 * @body name - Task name
 * @body description - Task description
 * @body objectives - Task objectives (optional)
 * @body startDate - Start date (ISO string)
 * @body endDate - End date (ISO string)
 * @body status - Task status
 * @body priority - Task priority
 * @body LeadedBy - Array of user IDs (leaders)
 * @body AssignedTo - Array of user IDs (collaborators, optional)
 *
 * @returns 201 with created task data
 */
// @ts-expect-error - withAuth type inference issue with multiple return types
export const POST = withAuth(async (userId, request: NextRequest) => {
  try {
    console.log('[API] POST /api/tasks - Creating task for user:', userId);

    // Parse and validate request body
    const body = await request.json();
    console.log('[API] Request body:', JSON.stringify(body, null, 2));

    const validationResult = createTaskSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[API] Validation failed:', JSON.stringify(validationResult.error.errors, null, 2));
      return apiBadRequest('Invalid task data', validationResult.error.errors);
    }

    const taskData = validationResult.data;

    // Validate date range
    if (taskData.startDate && taskData.endDate && taskData.startDate > taskData.endDate) {
      return apiBadRequest('Start date must be before end date');
    }

    // Create task document with generated ID
    const adminDb = getAdminDb();
    const taskDocRef = adminDb.collection('tasks').doc();
    const taskId = taskDocRef.id;

    const taskToSave = {
      ...taskData,
      id: taskId,
      CreatedBy: userId,
      createdAt: FieldValue.serverTimestamp(),
      lastActivity: FieldValue.serverTimestamp(),
      hasUnreadUpdates: false,
      // Convert dates to Firestore Timestamps
      startDate: taskData.startDate ? Timestamp.fromDate(taskData.startDate) : null,
      endDate: taskData.endDate ? Timestamp.fromDate(taskData.endDate) : null,
    };

    // Save to Firestore
    console.log('[API] Saving task to Firestore with Admin SDK');
    await taskDocRef.set(taskToSave);
    console.log('[API] Task saved successfully');

    // Update task activity
    // TODO: Migrate updateTaskActivity to use Admin SDK
    // console.log('[API] Updating task activity...');
    // await updateTaskActivity(taskId, 'edit');
    // console.log('[API] Task activity updated');

    // Send email notifications to assigned team members (using new mailer module)
    const recipients = [
      ...taskData.LeadedBy,
      ...(taskData.AssignedTo || [])
    ];

    if (recipients.length > 0) {
      try {
        console.log('[API] Sending email notifications to:', recipients);
        const result = await mailer.notifyTaskCreated({
          recipientIds: recipients,
          taskId,
          actorId: userId,
        });

        console.log('[API] Email notifications sent:', result.sent, 'successful,', result.failed, 'failed');
      } catch (notificationError) {
        console.error('[API] Failed to send notifications:', notificationError);
        // Don't fail the request if notifications fail
      }
    }

    console.log('[API] Task created successfully:', taskId);

    return apiCreated(
      {
        id: taskId,
        ...taskToSave,
        startDate: taskData.startDate?.toISOString(),
        endDate: taskData.endDate?.toISOString(),
      },
      `/api/tasks/${taskId}`
    );
  } catch (error: unknown) {
    console.error('[API] Error in POST /api/tasks:', error);
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }
    return handleApiError(error, 'POST /api/tasks');
  }
});

/**
 * GET /api/tasks
 *
 * List tasks with optional filtering and pagination.
 * Returns tasks the user has access to.
 *
 * @query clientId - Filter by client ID (optional)
 * @query status - Filter by status (optional)
 * @query priority - Filter by priority (optional)
 * @query userId - Filter by assigned user (optional)
 * @query limit - Max number of results (default: 50, max: 100)
 * @query offset - Number of results to skip (default: 0)
 *
 * @returns 200 with array of tasks
 */
// @ts-expect-error - withAuth type inference issue with multiple return types
export const GET = withAuth(async (userId, request: NextRequest) => {
  try {
    console.log('[API] GET /api/tasks - Fetching tasks for user:', userId);

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      clientId: searchParams.get('clientId') || undefined,
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      userId: searchParams.get('userId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const validationResult = taskQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      console.error('[API] Query validation failed:', validationResult.error.errors);
      return apiBadRequest('Invalid query parameters', validationResult.error.errors);
    }

    const { clientId, status, priority, userId: filterUserId, limit, offset } = validationResult.data;

    // Build Firestore Admin query
    const adminDb = getAdminDb();
    let tasksQuery = adminDb.collection('tasks')
      .orderBy('createdAt', 'desc')
      .limit(limit + offset);

    // Apply filters if provided
    if (clientId) {
      tasksQuery = tasksQuery.where('clientId', '==', clientId);
    }
    if (status) {
      tasksQuery = tasksQuery.where('status', '==', status);
    }
    if (priority) {
      tasksQuery = tasksQuery.where('priority', '==', priority);
    }
    if (filterUserId) {
      // Filter tasks where user is either leader or collaborator
      tasksQuery = tasksQuery.where('LeadedBy', 'array-contains', filterUserId);
    }

    // Execute query
    const snapshot = await tasksQuery.get();

    // Convert to array and apply offset
    const tasks = snapshot.docs
      .slice(offset)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamps to ISO strings for JSON
          startDate: data.startDate?.toDate().toISOString() || null,
          endDate: data.endDate?.toDate().toISOString() || null,
          createdAt: data.createdAt?.toDate().toISOString(),
        };
      });

    console.log('[API] Found tasks:', tasks.length);

    return apiSuccess({
      tasks,
      total: snapshot.size,
      limit,
      offset,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'GET /api/tasks');
  }
});
