/**
 * API client for backend communication
 * Handles HTTP requests to the Go Gin backend
 */

import axios from 'axios'

export interface ApiResponse<T = any> {
  data: T
  status: number
  message?: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

class ApiClient {
  private client: any
  private baseURL: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
        // Add auth token if available. The backend now derives identity
        // solely from this signed token — it no longer reads X-User-ID
        // (previously an unsigned header any client could set to any value).
        const token = this.getToken()
        if (token) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`,
          }
        }

        return config
      },
      (error: any) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          this.clearToken()
          if (typeof window !== 'undefined') {
            window.location.href = '/'
          }
        }
        return Promise.reject(this.handleError(error))
      }
    )
  }

  private getToken(): string | null {
    return localStorage.getItem('authToken')
  }

  private clearToken(): void {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
  }

  private handleError(error: any): ApiError {
    if (error.response?.data) {
      const data = error.response.data as any
      return {
        code: data.code || 'UNKNOWN_ERROR',
        message: data.message || data.error || 'An error occurred',
        details: data.details,
      }
    }
    return {
      code: 'NETWORK_ERROR',
      message: error.message || 'Network error occurred',
    }
  }

  // Auth endpoints
  async register(data: { username: string; email?: string; password?: string; isGuest?: boolean }) {
    return this.post('/auth/register', data)
  }

  async login(data: { username: string; password: string }) {
    return this.post('/auth/login', data)
  }

  async guestLogin(data: { username: string }) {
    return this.post('/auth/guest', data)
  }

  async getProfile() {
    return this.get('/auth/profile')
  }

  // Room endpoints
  async createRoom(data: { name: string; isPrivate?: boolean; maxUsers?: number }) {
    return this.post('/rooms', data)
  }

  async getRooms() {
    return this.get('/rooms')
  }

  async getRoom(id: string) {
    return this.get(`/rooms/${id}`)
  }

  async updateRoom(id: string, data: { name?: string; maxUsers?: number }) {
    return this.put(`/rooms/${id}`, data)
  }

  async deleteRoom(id: string) {
    return this.delete(`/rooms/${id}`)
  }

  async joinRoom(id: string, data?: { inviteCode?: string }) {
    // The backend's JoinRoomRequest DTO requires `roomId` in the body
    // (`binding:"required"`) even though it's also the URL param — omitting
    // it fails validation and the join 400s unconditionally.
    return this.post(`/rooms/${id}/join`, { roomId: id, ...data })
  }

  async leaveRoom(id: string) {
    return this.post(`/rooms/${id}/leave`, {})
  }

  async getRoomUsers(id: string) {
    return this.get(`/rooms/${id}/users`)
  }

  // Canvas object endpoints
  async createObject(roomId: string, data: any) {
    return this.post(`/rooms/${roomId}/objects`, data)
  }

  async getObjects(roomId: string, params?: { type?: string }) {
    return this.get(`/rooms/${roomId}/objects`, { params })
  }

  async getObject(roomId: string, objectId: string) {
    return this.get(`/rooms/${roomId}/objects/${objectId}`)
  }

  async updateObject(roomId: string, objectId: string, data: any) {
    return this.put(`/rooms/${roomId}/objects/${objectId}`, data)
  }

  async deleteObject(roomId: string, objectId: string) {
    return this.delete(`/rooms/${roomId}/objects/${objectId}`)
  }

  async batchCreateObjects(roomId: string, data: { objects: any[] }) {
    return this.post(`/rooms/${roomId}/objects/batch`, data)
  }

  async clearObjects(roomId: string) {
    return this.post(`/rooms/${roomId}/objects/clear`, {})
  }

  // Generic HTTP methods
  async get(url: string, config?: any): Promise<ApiResponse> {
    const response = await this.client.get(url, config)
    return { data: response.data, status: response.status }
  }

  async post(url: string, data?: any, config?: any): Promise<ApiResponse> {
    const response = await this.client.post(url, data, config)
    return { data: response.data, status: response.status }
  }

  async put(url: string, data?: any, config?: any): Promise<ApiResponse> {
    const response = await this.client.put(url, data, config)
    return { data: response.data, status: response.status }
  }

  async delete(url: string, config?: any): Promise<ApiResponse> {
    const response = await this.client.delete(url, config)
    return { data: response.data, status: response.status }
  }

  // Health check
  async health() {
    try {
      const response = await axios.get(`${this.baseURL.replace('/api/v1', '')}/health`)
      return response.data
    } catch (error) {
      return { status: 'error' }
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
export default apiClient
