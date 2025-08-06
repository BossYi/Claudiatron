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

  /**
   * Gets preset repository configuration
   * @returns Promise resolving to preset repository config
   */
  static async getPresetRepositoryConfig(): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    return this.handleApiCall(async () => {
      // 从 public 或者使用 fetch 加载配置文件
      try {
        const response = await fetch('/config/preset-repositories.json')
        if (!response.ok) {
          throw new Error('Failed to fetch preset repository config')
        }
        const config = await response.json()
        return {
          success: true,
          data: config
        }
      } catch (error) {
        console.warn('Failed to load preset repository config from /config/, using fallback data')
        const defaultConfig = {}
        return {
          success: true,
          data: defaultConfig
        }
      }
    }, 'Failed to load preset repository configuration')
  }

  /**
   * Searches preset repositories
   * @param query - Search query string
   * @param teamId - Optional team ID to filter by
   * @param tags - Optional tags to filter by
   * @returns Promise resolving to search results
   */
  static async searchPresetRepositories(
    query: string,
    teamId?: string,
    tags?: string[]
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleApiCall(async () => {
      const configResult = await this.getPresetRepositoryConfig()
      if (!configResult.success || !configResult.data) {
        throw new Error('Failed to load preset repository configuration')
      }

      const config = configResult.data
      let allRepositories: any[] = []
      let filteredTeams = config.businessTeams

      // 按团队筛选
      if (teamId) {
        filteredTeams = config.businessTeams.filter((team: any) => team.teamId === teamId)
      }

      // 收集所有仓库
      filteredTeams.forEach((team: any) => {
        team.repositories.forEach((repo: any) => {
          allRepositories.push({
            ...repo,
            teamId: team.teamId,
            teamName: team.teamName
          })
        })
      })

      // 文本搜索
      if (query.trim()) {
        const queryLower = query.toLowerCase()
        allRepositories = allRepositories.filter(
          (repo: any) =>
            repo.name.toLowerCase().includes(queryLower) ||
            repo.description.toLowerCase().includes(queryLower) ||
            repo.teamName.toLowerCase().includes(queryLower) ||
            (repo.tags && repo.tags.some((tag: string) => tag.toLowerCase().includes(queryLower)))
        )
      }

      // 标签筛选
      if (tags && tags.length > 0) {
        allRepositories = allRepositories.filter(
          (repo: any) => repo.tags && tags.some((tag: string) => repo.tags.includes(tag))
        )
      }

      return {
        success: true,
        data: {
          repositories: allRepositories,
          teams: filteredTeams,
          totalCount: allRepositories.length,
          searchQuery: query,
          appliedTags: tags || []
        }
      }
    }, 'Failed to search preset repositories')
  }

  /**
   * Gets global authentication status
   * @returns Promise resolving to auth status
   */
  static async getGlobalAuthStatus(): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.handleApiCall(async () => {
      const api = this.getApi()

      // 检查是否有保存的Aone认证
      const aoneResult = await api.hasAoneCredentials()
      if (aoneResult.success && aoneResult.data?.hasCredentials) {
        const credentialsInfo = await api.getAoneCredentialsInfo()
        return {
          success: true,
          data: {
            hasCredentials: true,
            authType: 'aone',
            accountInfo: credentialsInfo.success
              ? {
                  domainAccount: credentialsInfo.data?.domain_account
                }
              : undefined,
            lastSaved: credentialsInfo.data?.updated_at
          }
        }
      }

      // 未来可以扩展其他认证类型检查...

      return {
        success: true,
        data: {
          hasCredentials: false,
          authType: null
        }
      }
    }, 'Failed to get global auth status')
  }
}
