import { ApiClient } from '../utils/apiClient'
import type { UsageStats, UsageEntry, ProjectUsage } from '../types'

export class UsageApi extends ApiClient {
  /**
   * Gets overall usage statistics
   * @returns Promise resolving to usage statistics
   */
  static async getUsageStats(params?: {
    startDate?: string
    endDate?: string
    projectPath?: string
  }): Promise<UsageStats> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getUsageStats(params)
    }, 'Failed to get usage stats')
  }

  /**
   * Gets usage statistics filtered by date range
   * @param startDate - Start date (ISO format)
   * @param endDate - End date (ISO format)
   * @returns Promise resolving to usage statistics
   */
  static async getUsageByDateRange(startDate: string, endDate: string): Promise<UsageStats> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getUsageByDateRange(startDate, endDate)
    }, 'Failed to get usage by date range')
  }

  /**
   * Gets usage statistics grouped by session
   * @param since - Optional start date (YYYYMMDD)
   * @param until - Optional end date (YYYYMMDD)
   * @param order - Optional sort order ('asc' or 'desc')
   * @returns Promise resolving to an array of session usage data
   */
  static async getSessionStats(
    since?: string,
    until?: string,
    order?: 'asc' | 'desc'
  ): Promise<ProjectUsage[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getSessionStats(since, until, order)
    }, 'Failed to get session stats')
  }

  /**
   * Gets detailed usage entries with optional filtering
   * @param limit - Optional limit for number of entries
   * @returns Promise resolving to array of usage entries
   */
  static async getUsageDetails(limit?: number): Promise<UsageEntry[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getUsageDetails(limit)
    }, 'Failed to get usage details')
  }
}
