/**
 * Client Service
 * API client for client CRUD operations connecting to backend /api/clients
 */

import { Client } from '@/types';

// API Response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  code?: string;
}

interface ClientListResponse {
  clients: Client[];
  total: number;
  limit: number;
  offset: number;
}

// Query parameters for listing clients
interface ClientListParams {
  isActive?: boolean;
  industry?: string;
  limit?: number;
  offset?: number;
}

// Client create/update data
export interface ClientFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  industry?: string;
  website?: string;
  taxId?: string;
  notes?: string;
  imageUrl?: string;
  gradientId?: string;
  gradientColors?: string[];
  projects?: string[];
  isActive?: boolean;
}

class ClientService {
  private baseUrl = '/api/clients';

  /**
   * Create a new client (admin only)
   */
  async createClient(formData: ClientFormData): Promise<ApiResponse<Client>> {
    try {
      console.log('[ClientService] Creating client with data:', formData);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data: ApiResponse<Client> = await response.json();

      if (!response.ok) {
        console.error('[ClientService] API returned error:', data);
        throw new Error(data.error || 'Error al crear el cliente');
      }

      console.log('[ClientService] Client created successfully:', data);
      return data;
    } catch (error) {
      console.error('[ClientService] Error creating client:', error);
      throw error;
    }
  }

  /**
   * Get client by ID
   */
  async getClient(clientId: string): Promise<ApiResponse<Client>> {
    try {
      const response = await fetch(`${this.baseUrl}/${clientId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data: ApiResponse<Client> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener el cliente');
      }

      return data;
    } catch (error) {
      console.error('[ClientService] Error getting client:', error);
      throw error;
    }
  }

  /**
   * List clients with filters and pagination
   */
  async listClients(params?: ClientListParams): Promise<ApiResponse<ClientListResponse>> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.industry) queryParams.append('industry', params.industry);
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
        credentials: 'include',
      });

      const data: ApiResponse<ClientListResponse> = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al listar los clientes');
      }

      return data;
    } catch (error) {
      console.error('[ClientService] Error listing clients:', error);
      throw error;
    }
  }

  /**
   * Update client (admin only)
   */
  async updateClient(clientId: string, formData: Partial<ClientFormData>): Promise<ApiResponse<Client>> {
    try {
      console.log('[ClientService] Updating client with data:', formData);

      const response = await fetch(`${this.baseUrl}/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data: ApiResponse<Client> = await response.json();

      if (!response.ok) {
        console.error('[ClientService] API returned error:', data);
        throw new Error(data.error || 'Error al actualizar el cliente');
      }

      console.log('[ClientService] Client updated successfully:', data);
      return data;
    } catch (error) {
      console.error('[ClientService] Error updating client:', error);
      throw error;
    }
  }

  /**
   * Delete client (admin only)
   */
  async deleteClient(clientId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      // 204 No Content won't have a body
      if (response.status === 204) {
        return { success: true };
      }

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el cliente');
      }

      return data;
    } catch (error) {
      console.error('[ClientService] Error deleting client:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const clientService = new ClientService();
export default clientService;
