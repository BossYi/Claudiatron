import { ApiClient } from '../utils/apiClient'

export class SetupWizardApi extends ApiClient {
  /**
   * Gets the current setup wizard state
   * @returns Promise resolving to the wizard state
   */
  static async setupWizardGetState(): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardGetState()
    }, 'Failed to get setup wizard state')
  }

  /**
   * Saves the setup wizard state
   * @param state - The wizard state to save
   * @returns Promise resolving to save result
   */
  static async setupWizardSaveState(state: any): Promise<{ success: boolean; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardSaveState(state)
    }, 'Failed to save setup wizard state')
  }

  /**
   * Resets the setup wizard state
   * @returns Promise resolving to reset result
   */
  static async setupWizardReset(): Promise<{ success: boolean; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardReset()
    }, 'Failed to reset setup wizard')
  }

  /**
   * Detects environment for setup wizard
   * @param request - Optional detection request parameters
   * @returns Promise resolving to environment detection result
   */
  static async setupWizardDetectEnvironment(
    request?: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardDetectEnvironment(request)
    }, 'Failed to detect environment')
  }

  /**
   * Validates Claude configuration
   * @param request - Claude configuration validation request
   * @returns Promise resolving to validation result
   */
  static async setupWizardValidateClaudeConfig(
    request: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardValidateClaudeConfig(request)
    }, 'Failed to validate Claude config')
  }

  /**
   * Clones a repository for setup wizard
   * @param request - Repository clone request
   * @returns Promise resolving to clone result
   */
  static async setupWizardCloneRepository(
    request: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardCloneRepository(request)
    }, 'Failed to clone repository')
  }

  /**
   * Completes the setup wizard
   * @returns Promise resolving to completion result
   */
  static async setupWizardCompleteSetup(): Promise<{ success: boolean; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardCompleteSetup()
    }, 'Failed to complete setup wizard')
  }

  /**
   * Installs dependencies for setup wizard
   * @param software - Software to install
   * @returns Promise resolving to installation result
   */
  static async setupWizardInstallDependencies(
    software: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardInstallDependencies(software)
    }, 'Failed to install dependencies')
  }

  /**
   * Checks if setup wizard should be shown
   * @returns Promise resolving to whether wizard should be shown
   */
  static async setupWizardShouldShow(): Promise<{
    success: boolean
    data?: boolean
    error?: string
  }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardShouldShow()
    }, 'Failed to check if setup wizard should show')
  }

  /**
   * Gets setup wizard progress
   * @returns Promise resolving to progress information
   */
  static async setupWizardGetProgress(): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardGetProgress()
    }, 'Failed to get setup wizard progress')
  }

  /**
   * Clears setup wizard cache
   * @returns Promise resolving to cache clear result
   */
  static async setupWizardClearCache(): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardClearCache()
    }, 'Failed to clear setup wizard cache')
  }

  /**
   * Batch installs multiple software packages
   * @param softwareList - List of software to install
   * @param options - Optional installation options
   * @returns Promise resolving to batch installation result
   */
  static async setupWizardBatchInstall(
    softwareList: string[],
    options?: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardBatchInstall(softwareList, options)
    }, 'Failed to batch install dependencies')
  }

  /**
   * Validates a repository URL
   * @param url - Repository URL to validate
   * @returns Promise resolving to validation result
   */
  static async setupWizardValidateRepository(
    url: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardValidateRepository(url)
    }, 'Failed to validate repository')
  }

  /**
   * Imports a local project
   * @param localPath - Local path to the project
   * @returns Promise resolving to import result
   */
  static async setupWizardImportProject(
    localPath: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()
      return await api.setupWizardImportProject(localPath)
    }, 'Failed to import project')
  }
}
