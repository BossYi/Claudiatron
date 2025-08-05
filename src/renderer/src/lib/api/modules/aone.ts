import { ApiClient } from '../utils/apiClient'
import type { AoneAuthInfo } from '../types'

export interface AoneCredentialsInfo {
  id: number
  domain_account: string
  created_at: string
  updated_at: string
}

/**
 * Aone 认证管理 API
 *
 * 提供全局 Aone 认证信息的管理功能
 */
export class AoneApi extends ApiClient {
  /**
   * 获取全局 Aone 认证信息
   */
  static async getAoneCredentials(): Promise<AoneAuthInfo | null> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      const response = await api.getAoneCredentials()

      if (response.success) {
        return response.data
      } else {
        throw new Error(response.error || 'Failed to get Aone credentials')
      }
    }, 'Failed to get Aone credentials')
  }

  /**
   * 保存全局 Aone 认证信息
   */
  static async saveAoneCredentials(authInfo: AoneAuthInfo): Promise<AoneCredentialsInfo> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      const response = await api.saveAoneCredentials(authInfo)

      if (response.success) {
        return response.data
      } else {
        throw new Error(response.error || 'Failed to save Aone credentials')
      }
    }, 'Failed to save Aone credentials')
  }

  /**
   * 删除全局 Aone 认证信息
   */
  static async deleteAoneCredentials(): Promise<boolean> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      const response = await api.deleteAoneCredentials()

      if (response.success) {
        return response.data.deleted
      } else {
        throw new Error(response.error || 'Failed to delete Aone credentials')
      }
    }, 'Failed to delete Aone credentials')
  }

  /**
   * 检查是否已配置 Aone 认证信息
   */
  static async hasAoneCredentials(): Promise<boolean> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      const response = await api.hasAoneCredentials()

      if (response.success) {
        return response.data.hasCredentials
      } else {
        throw new Error(response.error || 'Failed to check Aone credentials')
      }
    }, 'Failed to check Aone credentials')
  }

  /**
   * 获取 Aone 认证信息（不包含私钥）
   */
  static async getAoneCredentialsInfo(): Promise<AoneCredentialsInfo | null> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      const response = await api.getAoneCredentialsInfo()

      if (response.success) {
        return response.data
      } else {
        throw new Error(response.error || 'Failed to get Aone credentials info')
      }
    }, 'Failed to get Aone credentials info')
  }
}
