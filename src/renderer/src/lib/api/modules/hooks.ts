import { ApiClient } from '../utils/apiClient'
import type { HooksConfiguration } from '../types'

export class HooksApi extends ApiClient {
  /**
   * Get hooks configuration for a specific scope
   * @param scope - The configuration scope: 'user', 'project', or 'local'
   * @param projectPath - Project path (required for project and local scopes)
   * @returns Promise resolving to the hooks configuration
   */
  static async getHooksConfig(
    scope: 'user' | 'project' | 'local',
    projectPath?: string
  ): Promise<HooksConfiguration> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.getHooksConfig(scope, projectPath)
    }, 'Failed to get hooks config')
  }

  /**
   * Update hooks configuration for a specific scope
   * @param scope - The configuration scope: 'user', 'project', or 'local'
   * @param hooks - The hooks configuration to save
   * @param projectPath - Project path (required for project and local scopes)
   * @returns Promise resolving to success message
   */
  static async updateHooksConfig(
    scope: 'user' | 'project' | 'local',
    hooks: HooksConfiguration,
    projectPath?: string
  ): Promise<string> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.updateHooksConfig(scope, hooks, projectPath)
    }, 'Failed to update hooks config')
  }

  /**
   * Validate a hook command syntax
   * @param command - The shell command to validate
   * @returns Promise resolving to validation result
   */
  static async validateHookCommand(command: string): Promise<{ valid: boolean; message: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.validateHookCommand(command)
    }, 'Failed to validate hook command')
  }

  /**
   * Get merged hooks configuration (respecting priority)
   * @param projectPath - The project path
   * @returns Promise resolving to merged hooks configuration
   */
  static async getMergedHooksConfig(projectPath: string): Promise<HooksConfiguration> {
    try {
      const [userHooks, projectHooks, localHooks] = await Promise.all([
        this.getHooksConfig('user'),
        this.getHooksConfig('project', projectPath),
        this.getHooksConfig('local', projectPath)
      ])

      // Import HooksManager for merging
      const { HooksManager } = await import('@/lib/hooksManager')
      return HooksManager.mergeConfigs(userHooks, projectHooks, localHooks)
    } catch (error) {
      console.error('Failed to get merged hooks config:', error)
      throw error
    }
  }
}
