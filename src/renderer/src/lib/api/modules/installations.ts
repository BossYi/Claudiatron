import { ApiClient } from '../utils/apiClient'
import type { ClaudeInstallation } from '../types'

export class InstallationsApi extends ApiClient {
  /**
   * Get the stored Claude binary path from settings
   * @returns Promise resolving to the path if set, null otherwise
   */
  static async getClaudeBinaryPath(): Promise<string | null> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getClaudeBinaryPath()
    }, 'Failed to get Claude binary path')
  }

  /**
   * Set the Claude binary path in settings
   * @param path - The absolute path to the Claude binary
   * @returns Promise resolving when the path is saved
   */
  static async setClaudeBinaryPath(path: string): Promise<void> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setClaudeBinaryPath(path)
    }, 'Failed to set Claude binary path')
  }

  /**
   * List all available Claude installations on the system
   * @returns Promise resolving to an array of Claude installations
   */
  static async listClaudeInstallations(): Promise<ClaudeInstallation[]> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.listClaudeInstallations()
    }, 'Failed to list Claude installations')
  }
}
