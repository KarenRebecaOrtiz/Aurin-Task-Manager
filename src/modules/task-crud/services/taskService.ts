/**
 * Task Service
 * API client for task CRUD operations connecting to backend /api/tasks
 */

import { FormValues } from '../types/form';
import { Task } from '../types/domain';

// API Response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  code?: string;
}

interface TaskListResponse {
  tasks: Task[];
  total: number;
  limit: number;
  offset: number;
}

// Query parameters for listing tasks
interface TaskListParams {
  clientId?: string;
  status?: string;
  priority?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

class TaskService {
  private baseUrl = '/api/tasks';

  /**
   * Create a new task
   */
  async createTask(formData: FormValues, userId: string): Promise<ApiResponse<Task>> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData.clientInfo,
          ...formData.basicInfo,
          ...formData.teamInfo,
          CreatedBy: userId,
        }),
      });

      const data: ApiResponse<Task> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la tarea');
      }

      return data;
    } catch (error) {
      console.error('[TaskService] Error creating task:', error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<ApiResponse<Task>> {
    try {
      const response = await fetch(`${this.baseUrl}/${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: ApiResponse<Task> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener la tarea');
      }

      return data;
    } catch (error) {
      console.error('[TaskService] Error getting task:', error);
      throw error;
    }
  }

  /**
   * List tasks with filters and pagination
   */
  async listTasks(params?: TaskListParams): Promise<ApiResponse<TaskListResponse>> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.clientId) queryParams.append('clientId', params.clientId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.priority) queryParams.append('priority', params.priority);
      if (params?.userId) queryParams.append('userId', params.userId);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const url = queryParams.toString()
        ? `${this.baseUrl}?${queryParams.toString()}`
        : this.baseUrl;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: ApiResponse<TaskListResponse> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al listar las tareas');
      }

      return data;
    } catch (error) {
      console.error('[TaskService] Error listing tasks:', error);
      throw error;
    }
  }

  /**
   * Update task completely (PUT)
   */
  async updateTask(taskId: string, formData: FormValues): Promise<ApiResponse<Task>> {
    try {
      const response = await fetch(`${this.baseUrl}/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData.clientInfo,
          ...formData.basicInfo,
          ...formData.teamInfo,
        }),
      });

      const data: ApiResponse<Task> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar la tarea');
      }

      return data;
    } catch (error) {
      console.error('[TaskService] Error updating task:', error);
      throw error;
    }
  }

  /**
   * Update task partially (PATCH)
   */
  async patchTask(taskId: string, updates: Partial<Task>): Promise<ApiResponse<Task>> {
    try {
      const response = await fetch(`${this.baseUrl}/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data: ApiResponse<Task> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar la tarea');
      }

      return data;
    } catch (error) {
      console.error('[TaskService] Error patching task:', error);
      throw error;
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 204 No Content won't have a body
      if (response.status === 204) {
        return { success: true };
      }

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar la tarea');
      }

      return data;
    } catch (error) {
      console.error('[TaskService] Error deleting task:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();
export default taskService;
