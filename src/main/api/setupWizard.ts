import { ipcMain } from 'electron'
import { setupWizardService } from '../database/services'
import { ClaudeDetectionManager } from '../detection/ClaudeDetectionManager'
import { GitInstallationManager } from '../installation/GitInstallationManager'
import { NodeJsInstallationManager } from '../installation/NodeJsInstallationManager'
import { ClaudeCodeInstallationManager } from '../installation/ClaudeCodeInstallationManager'
import {
  BaseInstallationManager,
  type InstallationOptions
} from '../installation/BaseInstallationManager'
import { RepositoryImportService } from '../services/RepositoryImportService'
import { getAoneCredentialsService } from '../database/services/AoneCredentialsService'
import { gitDetectionService } from '../detection/GitDetectionService'
import { nodeJsDetectionService } from '../detection/NodeJsDetectionService'
import type {
  SetupWizardState,
  DetailedEnvironmentStatus,
  SoftwareStatus,
  EnvironmentDetectionRequest,
  EnvironmentDetectionResponse,
  ClaudeConfigValidationRequest,
  ClaudeConfigValidationResponse,
  InstallationProgress
} from '../types/setupWizard'
import { ERROR_CODES } from '../types/setupWizard'
import * as os from 'os'

// Import shutdown flag
import { isShuttingDown } from '../index'

// Import required modules for Claude settings
import { homedir } from 'os'
import { join } from 'path'
import { promises as fs } from 'fs'

// Utility function to check if app is shutting down
function checkShutdownState(operationName: string): void {
  if (isShuttingDown) {
    console.log(`[SetupWizard] Rejecting ${operationName} - application is shutting down`)
    throw new Error(`Operation rejected: Application is shutting down`)
  }
}

/**
 * Format API configuration for Claude Code settings.json
 * Creates the required format for ~/.claude/settings.json
 */
function formatClaudeSettings(apiUrl: string, apiKey: string): any {
  return {
    env: {
      ANTHROPIC_BASE_URL: apiUrl,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1
    },
    apiKeyHelper: `echo '${apiKey}'`
  }
}

/**
 * Save Claude configuration to ~/.claude/settings.json
 * Ensures the directory exists and writes the formatted settings
 */
async function saveClaudeConfiguration(apiUrl: string, apiKey: string): Promise<void> {
  const claudeDir = join(homedir(), '.claude')
  const claudeSettingsPath = join(claudeDir, 'settings.json')

  try {
    console.log(`Saving Claude configuration to: ${claudeSettingsPath}`)

    // Validate inputs
    if (!apiUrl || !apiKey) {
      throw new Error('API URL and API key are required')
    }

    // Ensure .claude directory exists
    try {
      await fs.mkdir(claudeDir, { recursive: true })
      console.log(`Created/verified Claude directory: ${claudeDir}`)
    } catch (dirError) {
      const errorMsg = dirError instanceof Error ? dirError.message : String(dirError)
      throw new Error(`Failed to create ~/.claude directory: ${errorMsg}`)
    }

    // Format settings according to Claude Code requirements
    const settings = formatClaudeSettings(apiUrl, apiKey)
    console.log('Formatted Claude settings:', JSON.stringify(settings, null, 2))

    // Write settings to file with proper error handling
    try {
      await fs.writeFile(claudeSettingsPath, JSON.stringify(settings, null, 2), 'utf-8')
      console.log('Successfully saved Claude configuration to ~/.claude/settings.json')
    } catch (fileError) {
      const errorMsg = fileError instanceof Error ? fileError.message : String(fileError)
      throw new Error(`Failed to write settings file: ${errorMsg}`)
    }

    // Verify the file was written correctly
    try {
      const writtenContent = await fs.readFile(claudeSettingsPath, 'utf-8')
      const parsedContent = JSON.parse(writtenContent)

      // Basic validation of written content
      if (!parsedContent.env?.ANTHROPIC_BASE_URL || !parsedContent.apiKeyHelper) {
        throw new Error('Verification failed: written content is incomplete')
      }

      console.log('Verification successful: settings file written correctly')
    } catch (verifyError) {
      const errorMsg = verifyError instanceof Error ? verifyError.message : String(verifyError)
      console.warn(`Settings file verification failed: ${errorMsg}`)
      // Don't throw here as the main write succeeded
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Failed to save Claude configuration:', errorMessage)
    throw new Error(
      `Failed to save Claude configuration to ~/.claude/settings.json: ${errorMessage}`
    )
  }
}

// 缓存环境检测结果
const environmentCache = new Map<string, { data: DetailedEnvironmentStatus; timestamp: number }>()
const CACHE_DURATION = 60 * 1000 // 1分钟缓存

// 互斥锁以防止并发操作
const operationLocks = new Map<string, Promise<any>>()

// 活动安装管理器
const activeInstallations = new Map<string, BaseInstallationManager>()

// WebContent引用用于进度通信
let mainWindow: Electron.BrowserWindow | null = null

// 设置主窗口引用
export function setMainWindow(window: Electron.BrowserWindow) {
  mainWindow = window
}

// 创建带锁的操作
function withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  if (operationLocks.has(key)) {
    return operationLocks.get(key)!
  }

  const promise = operation().finally(() => {
    operationLocks.delete(key)
  })

  operationLocks.set(key, promise)
  return promise
}

// 增强的错误处理
function createErrorResponse(error: any, code: string = ERROR_CODES.UNKNOWN_ERROR) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Setup wizard error [${code}]:`, message)

  return {
    success: false,
    error: message,
    errorCode: code,
    timestamp: new Date().toISOString()
  }
}

/**
 * Setup Wizard IPC handlers
 */
export function setupSetupWizardHandlers() {
  // Get wizard state with enhanced error handling
  ipcMain.handle('setup-wizard-get-state', async () => {
    console.log('Main: setup-wizard-get-state called')

    return withLock('get-state', async () => {
      try {
        let state = await setupWizardService.getState()

        // If no state exists, create initial state
        if (!state) {
          console.log('No existing state found, creating initial state')
          state = await setupWizardService.createInitialState()
        }

        // Validate state integrity
        if (!validateStateIntegrity(state)) {
          console.warn('State integrity check failed, recreating state')
          state = await setupWizardService.createInitialState()
        }

        return {
          success: true,
          data: state,
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        return createErrorResponse(error, ERROR_CODES.UNKNOWN_ERROR)
      }
    })
  })

  // Save wizard state with validation and retry
  ipcMain.handle('setup-wizard-save-state', async (_, state: SetupWizardState) => {
    console.log('Main: setup-wizard-save-state called')

    return withLock('save-state', async () => {
      try {
        checkShutdownState('setup-wizard-save-state')

        // Validate state before saving
        if (!validateStateIntegrity(state)) {
          throw new Error('Invalid state data cannot be saved')
        }

        // Add timestamp
        const stateWithTimestamp = {
          ...state,
          lastUpdated: new Date().toISOString()
        }

        await setupWizardService.saveState(stateWithTimestamp)

        return {
          success: true,
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        return createErrorResponse(error, ERROR_CODES.VALIDATION_FAILED)
      }
    })
  })

  // Detect environment with caching and enhanced error handling
  ipcMain.handle(
    'setup-wizard-detect-environment',
    async (_, request?: EnvironmentDetectionRequest) => {
      console.log('Main: setup-wizard-detect-environment called', request)

      const checkGit = request?.checkGit ?? true
      const checkNodejs = request?.checkNodejs ?? true
      const checkClaudeCli = request?.checkClaudeCli ?? true

      return withLock('detect-environment', async () => {
        try {
          // Create cache key
          const cacheKey = `${checkGit}-${checkNodejs}-${checkClaudeCli}`
          const cached = environmentCache.get(cacheKey)

          // Check cache validity
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('Using cached environment detection result')
            const response: EnvironmentDetectionResponse = {
              status: cached.data,
              recommendations: generateRecommendations(cached.data),
              fromCache: true
            }
            return { success: true, data: response }
          }

          console.log('Performing fresh environment detection')

          // Parallel detection for better performance
          const detectionPromises: Promise<any>[] = []

          if (checkGit) {
            // 使用新的GitDetectionService
            detectionPromises.push(
              gitDetectionService
                .performComprehensiveDetection()
                .then((result) => ({ git: convertGitToSoftwareStatus(result) }))
                .catch(() => ({ git: { installed: false, error: 'Git检测失败' } }))
            )
          }
          if (checkNodejs) {
            // 使用新的NodeJsDetectionService
            detectionPromises.push(
              nodeJsDetectionService
                .getDetailedStatus()
                .then((result) => {
                  console.log('NodeJS detection result:', result.installation)
                  return {
                    nodejs: convertNodeJsInstallationToSoftwareStatus(result.installation),
                    npm: convertNpmToSoftwareStatus(result.installation)
                  }
                })
                .catch((error) => {
                  console.error('NodeJS detection failed completely:', error)
                  // 即使整体检测失败，也尝试单独检测Node.js和npm
                  return nodeJsDetectionService
                    .detectNodeJsInstallation()
                    .then((installation) => {
                      console.log('Fallback NodeJS detection result:', installation)
                      return {
                        nodejs: convertNodeJsInstallationToSoftwareStatus(installation),
                        npm: convertNpmToSoftwareStatus(installation)
                      }
                    })
                    .catch(() => ({
                      nodejs: { installed: false, error: 'Node.js检测失败' },
                      npm: { installed: false, error: 'npm检测失败' }
                    }))
                })
            )
          }
          if (checkClaudeCli) {
            detectionPromises.push(detectClaudeCli(true).then((result) => ({ claudeCli: result })))
          }

          // Add system info
          detectionPromises.push(
            Promise.resolve({
              systemInfo: {
                platform: process.platform,
                arch: process.arch,
                version: os.release(),
                homeDir: os.homedir(),
                tempDir: os.tmpdir()
              }
            })
          )

          const detectionResults = await Promise.allSettled(detectionPromises)

          // Merge results and handle failures
          const status: DetailedEnvironmentStatus = {
            git: { installed: false },
            nodejs: { installed: false },
            npm: { installed: false },
            claudeCli: { installed: false },
            systemInfo: {
              platform: process.platform,
              arch: process.arch,
              version: os.release(),
              homeDir: os.homedir(),
              tempDir: os.tmpdir()
            }
          }

          detectionResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              Object.assign(status, result.value)
            } else {
              console.warn(`Detection failed for promise ${index}:`, result.reason)
            }
          })

          const recommendations = generateRecommendations(status)

          const response: EnvironmentDetectionResponse = {
            status,
            recommendations,
            fromCache: false
          }

          // Cache the result
          environmentCache.set(cacheKey, {
            data: status,
            timestamp: Date.now()
          })

          // Save environment status
          try {
            await setupWizardService.saveEnvironmentStatus(status)
          } catch (saveError) {
            console.warn('Failed to save environment status:', saveError)
            // Don't fail the whole operation if saving fails
          }

          return {
            success: true,
            data: response,
            timestamp: new Date().toISOString()
          }
        } catch (error) {
          return createErrorResponse(error, ERROR_CODES.NETWORK_ERROR)
        }
      })
    }
  )

  // Validate Claude configuration with enhanced validation
  ipcMain.handle(
    'setup-wizard-validate-claude-config',
    async (_, request: ClaudeConfigValidationRequest) => {
      console.log('Main: setup-wizard-validate-claude-config called')

      return withLock('validate-claude-config', async () => {
        try {
          // Input validation
          if (!request || !request.apiKey || !request.apiUrl) {
            const response: ClaudeConfigValidationResponse = {
              valid: false,
              error: 'API key and URL are required'
            }
            return { success: true, data: response }
          }

          // Basic format validation
          if (!request.apiKey.startsWith('sk-')) {
            const response: ClaudeConfigValidationResponse = {
              valid: false,
              error: 'Invalid API key format - must start with sk-'
            }
            return { success: true, data: response }
          }

          // URL validation
          try {
            new URL(request.apiUrl)
          } catch {
            const response: ClaudeConfigValidationResponse = {
              valid: false,
              error: 'Invalid API URL format'
            }
            return { success: true, data: response }
          }

          // TODO: Implement actual API validation
          // For now, we'll simulate a validation call
          await new Promise((resolve) => setTimeout(resolve, 1000))

          const response: ClaudeConfigValidationResponse = {
            valid: true,
            apiInfo: {
              version: '1.0.0',
              capabilities: ['chat', 'code', 'analysis']
            }
          }

          // Save configuration if valid
          let wizardStateSaved = false
          let claudeSettingsSaved = false
          let saveErrors: string[] = []

          // Try to save to wizard state (for UI management)
          try {
            await setupWizardService.saveApiConfiguration({
              apiUrl: request.apiUrl,
              apiKey: request.apiKey,
              lastValidated: new Date().toISOString()
            })
            wizardStateSaved = true
            console.log('Successfully saved configuration to wizard state')
          } catch (wizardError) {
            const errorMsg =
              wizardError instanceof Error ? wizardError.message : String(wizardError)
            console.error('Failed to save to wizard state:', errorMsg)
            saveErrors.push(`Wizard state: ${errorMsg}`)
          }

          // Try to save to ~/.claude/settings.json (for Claude Code)
          try {
            await saveClaudeConfiguration(request.apiUrl, request.apiKey)
            claudeSettingsSaved = true
            console.log('Successfully saved configuration to ~/.claude/settings.json')
          } catch (claudeError) {
            const errorMsg =
              claudeError instanceof Error ? claudeError.message : String(claudeError)
            console.error('Failed to save to ~/.claude/settings.json:', errorMsg)
            saveErrors.push(`Claude settings: ${errorMsg}`)
          }

          // Determine response based on save results
          if (!claudeSettingsSaved) {
            // Claude settings save is critical - without it Claude Code won't work
            const response: ClaudeConfigValidationResponse = {
              valid: false,
              error: `Configuration validation succeeded but failed to save to ~/.claude/settings.json: ${saveErrors.join('; ')}`
            }
            return { success: true, data: response }
          }

          if (!wizardStateSaved) {
            // Wizard state save failed but Claude settings succeeded
            // This is less critical - show warning but continue
            console.warn(
              `Configuration saved to ~/.claude/settings.json but wizard state save failed: ${saveErrors.join('; ')}`
            )
          }

          if (wizardStateSaved && claudeSettingsSaved) {
            console.log('Claude configuration saved successfully to both locations')
          }

          return {
            success: true,
            data: response,
            timestamp: new Date().toISOString()
          }
        } catch (error) {
          return createErrorResponse(error, ERROR_CODES.INVALID_API_KEY)
        }
      })
    }
  )

  // Clone repository with real implementation
  ipcMain.handle('setup-wizard-clone-repository', async (_, request) => {
    console.log('Main: setup-wizard-clone-repository called', request)

    return withLock('clone-repository', async () => {
      try {
        // Input validation
        if (!request || !request.url) {
          return createErrorResponse(
            new Error('Repository URL is required'),
            ERROR_CODES.VALIDATION_FAILED
          )
        }

        // Create repository import service
        const repoService = new RepositoryImportService()

        // Set up progress reporting
        repoService.on('progress', (progress) => {
          console.log('Repository clone progress:', progress)
          // You can emit this to the renderer process if needed
        })

        // Perform repository cloning
        const result = await repoService.cloneRepository(request)

        if (result.success) {
          return {
            success: true,
            data: {
              status: 'completed',
              message: 'Repository cloned and imported successfully',
              localPath: result.localPath,
              projectInfo: result.projectInfo
            },
            timestamp: new Date().toISOString()
          }
        } else {
          return createErrorResponse(
            new Error(result.error || 'Repository cloning failed'),
            ERROR_CODES.CLONE_FAILED
          )
        }
      } catch (error) {
        console.error('Repository cloning error:', error)
        return createErrorResponse(error, ERROR_CODES.CLONE_FAILED)
      }
    })
  })

  // Validate repository URL
  ipcMain.handle('setup-wizard-validate-repository', async (_, url: string) => {
    console.log('Main: setup-wizard-validate-repository called', url)

    try {
      const repoService = new RepositoryImportService()
      const validation = await repoService.validateRepositoryUrl(url)

      return {
        success: true,
        data: validation,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return createErrorResponse(error, ERROR_CODES.VALIDATION_FAILED)
    }
  })

  // Import existing project
  ipcMain.handle('setup-wizard-import-project', async (_, projectPath: string) => {
    console.log('Main: setup-wizard-import-project called', projectPath)

    try {
      const repoService = new RepositoryImportService()
      const result = await repoService.importProject(projectPath)

      if (result.success) {
        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        }
      } else {
        return createErrorResponse(
          new Error(result.error || 'Project import failed'),
          ERROR_CODES.VALIDATION_FAILED
        )
      }
    } catch (error) {
      console.error('Project import error:', error)
      return createErrorResponse(error, ERROR_CODES.VALIDATION_FAILED)
    }
  })

  // Complete setup with cleanup
  ipcMain.handle('setup-wizard-complete-setup', async () => {
    console.log('Main: setup-wizard-complete-setup called')

    return withLock('complete-setup', async () => {
      try {
        await setupWizardService.markAsCompleted()

        // Clear caches after completion
        clearEnvironmentCache()

        return {
          success: true,
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        return createErrorResponse(error, ERROR_CODES.UNKNOWN_ERROR)
      }
    })
  })

  // Reset wizard with comprehensive cleanup
  ipcMain.handle('setup-wizard-reset', async () => {
    console.log('Main: setup-wizard-reset called')

    return withLock('reset-wizard', async () => {
      try {
        await setupWizardService.resetState()

        // Clear all caches
        clearEnvironmentCache()
        operationLocks.clear()

        return {
          success: true,
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        return createErrorResponse(error, ERROR_CODES.UNKNOWN_ERROR)
      }
    })
  })

  // Install dependencies with real installation managers
  ipcMain.handle(
    'setup-wizard-install-dependencies',
    async (_, software: string, options?: any) => {
      console.log('Main: setup-wizard-install-dependencies called for', software)

      return withLock(`install-${software}`, async () => {
        try {
          // Validation
          const validSoftware = ['git', 'nodejs', 'claude-code']
          if (!validSoftware.includes(software)) {
            return createErrorResponse(
              new Error(`Unsupported software: ${software}`),
              ERROR_CODES.VALIDATION_FAILED
            )
          }

          // 检查是否已有相同软件的安装正在进行
          if (activeInstallations.has(software)) {
            return createErrorResponse(
              new Error(`${software} 安装已在进行中`),
              ERROR_CODES.INSTALLATION_FAILED
            )
          }

          let installationManager: BaseInstallationManager | null = null

          // 选择对应的安装管理器
          switch (software) {
            case 'git':
              installationManager = new GitInstallationManager()
              break
            case 'nodejs':
              installationManager = new NodeJsInstallationManager(options)
              break
            case 'claude-code':
              installationManager = new ClaudeCodeInstallationManager()
              break
            default:
              return createErrorResponse(
                new Error(`不支持的软件: ${software}`),
                ERROR_CODES.VALIDATION_FAILED
              )
          }

          if (installationManager) {
            // 添加到活动安装列表
            activeInstallations.set(software, installationManager)

            // 设置进度回调 - 通过IPC实时发送到渲染进程
            const progressCallback = (progress: InstallationProgress) => {
              console.log(`Installation progress for ${software}:`, progress)

              // 通过IPC发送进度更新到UI
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('setup-wizard-installation-progress', {
                  software,
                  progress
                })
              }
            }

            // 监听各种事件
            installationManager.on('progress', progressCallback)
            installationManager.on('download-progress', (downloadProgress) => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('setup-wizard-download-progress', {
                  software,
                  downloadProgress
                })
              }
            })

            try {
              // 执行安装
              const result = await installationManager.install(
                options?.version,
                options?.installOptions
              )

              if (result.success) {
                console.log(`${software} 安装成功完成`)

                // 清理环境缓存
                clearEnvironmentCache()

                // 发送完成通知
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('setup-wizard-installation-completed', {
                    software,
                    result
                  })
                }

                return {
                  success: true,
                  data: {
                    installed: true,
                    message: `${software} 安装完成`,
                    software,
                    installPath: result.installPath,
                    executablePath: result.executablePath,
                    version: result.installedVersion,
                    logs: result.logs
                  },
                  timestamp: new Date().toISOString()
                }
              } else {
                return createErrorResponse(
                  new Error(result.error || `${software} 安装失败`),
                  ERROR_CODES.INSTALLATION_FAILED
                )
              }
            } catch (installError) {
              console.error(`${software} 安装过程中出错:`, installError)
              return createErrorResponse(installError, ERROR_CODES.INSTALLATION_FAILED)
            } finally {
              // 从活动安装列表中移除
              activeInstallations.delete(software)
            }
          }

          return createErrorResponse(
            new Error('无可用的安装管理器'),
            ERROR_CODES.INSTALLATION_FAILED
          )
        } catch (error) {
          console.error(`Installation error for ${software}:`, error)
          return createErrorResponse(error, ERROR_CODES.INSTALLATION_FAILED)
        }
      })
    }
  )

  // Check if wizard should be shown
  ipcMain.handle('setup-wizard-should-show', async () => {
    console.log('Main: setup-wizard-should-show called')

    try {
      const shouldShow = await setupWizardService.shouldShowWizard()
      return {
        success: true,
        data: shouldShow,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return createErrorResponse(error, ERROR_CODES.UNKNOWN_ERROR)
    }
  })

  // Get wizard progress
  ipcMain.handle('setup-wizard-get-progress', async () => {
    console.log('Main: setup-wizard-get-progress called')

    try {
      const progress = await setupWizardService.getProgress()
      return {
        success: true,
        data: progress,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return createErrorResponse(error, ERROR_CODES.UNKNOWN_ERROR)
    }
  })

  // 取消安装
  ipcMain.handle('setup-wizard-cancel-installation', async (_, software: string) => {
    console.log('Main: setup-wizard-cancel-installation called for', software)

    try {
      const installationManager = activeInstallations.get(software)
      if (installationManager) {
        // 尝试取消安装（具体实现需要安装管理器支持）
        installationManager.removeAllListeners()
        activeInstallations.delete(software)

        console.log(`${software} 安装已取消`)
        return {
          success: true,
          message: `${software} 安装已取消`,
          timestamp: new Date().toISOString()
        }
      } else {
        return createErrorResponse(
          new Error(`没有找到正在安装的 ${software}`),
          ERROR_CODES.VALIDATION_FAILED
        )
      }
    } catch (error) {
      return createErrorResponse(error, ERROR_CODES.UNKNOWN_ERROR)
    }
  })

  // 获取安装进度
  ipcMain.handle('setup-wizard-get-installation-progress', async (_, software: string) => {
    console.log('Main: setup-wizard-get-installation-progress called for', software)

    try {
      const installationManager = activeInstallations.get(software)
      const isInstalling = !!installationManager

      return {
        success: true,
        data: {
          isInstalling,
          software,
          logs: installationManager?.getLogs() || []
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return createErrorResponse(error, ERROR_CODES.UNKNOWN_ERROR)
    }
  })

  // 批量自动安装
  ipcMain.handle('setup-wizard-batch-install', async (_, softwareList: string[], options?: any) => {
    console.log('Main: setup-wizard-batch-install called', softwareList)

    return withLock('batch-install', async () => {
      try {
        const results: Record<string, any> = {}

        // 按依赖顺序安装：git -> nodejs -> claude-code
        const sortedSoftware = sortByDependencies(softwareList)

        for (const software of sortedSoftware) {
          try {
            console.log(`开始安装 ${software}`)
            const installResult = await installSingleDependency(software, options?.[software])

            results[software] = installResult

            if (!installResult.success) {
              console.error(`${software} 安装失败:`, installResult.error)
              // 继续安装其他软件，不因一个失败而全部停止
            }
          } catch (error) {
            results[software] = createErrorResponse(error, ERROR_CODES.INSTALLATION_FAILED)
          }
        }

        return {
          success: true,
          data: results,
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        return createErrorResponse(error, ERROR_CODES.INSTALLATION_FAILED)
      }
    })
  })

  // Add cache management endpoints
  ipcMain.handle('setup-wizard-clear-cache', async () => {
    console.log('Main: setup-wizard-clear-cache called')

    try {
      clearEnvironmentCache()
      return {
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return createErrorResponse(error, ERROR_CODES.UNKNOWN_ERROR)
    }
  })
}

// State validation function
function validateStateIntegrity(state: any): state is SetupWizardState {
  try {
    if (!state || typeof state !== 'object') return false

    const requiredFields = [
      'currentStep',
      'stepStatus',
      'userData',
      'errors',
      'canProceed',
      'isFirstRun'
    ]
    for (const field of requiredFields) {
      if (!(field in state)) return false
    }

    // Validate step status structure
    if (!state.stepStatus || typeof state.stepStatus !== 'object') return false

    // Validate user data structure
    if (!state.userData || typeof state.userData !== 'object') return false

    // Validate errors structure
    if (!state.errors || typeof state.errors !== 'object') return false

    return true
  } catch (error) {
    console.error('State validation error:', error)
    return false
  }
}

// Generate recommendations based on environment status
function generateRecommendations(status: DetailedEnvironmentStatus): string[] {
  const recommendations: string[] = []

  if (!status.git.installed) {
    recommendations.push('Install Git to enable version control features')
  }

  if (!status.nodejs.installed) {
    recommendations.push('Install Node.js (LTS version) to enable Claude Code installation')
  } else if (status.nodejs.needsUpdate) {
    recommendations.push('Update Node.js to a newer LTS version for better performance')
  } else if (!status.npm.installed) {
    recommendations.push('npm is not available. Please reinstall Node.js')
  }

  if (!status.claudeCli.installed) {
    if (status.nodejs.installed && status.npm.installed) {
      recommendations.push(
        'Install Claude Code CLI using: npm install -g @anthropic-ai/claude-code'
      )
    } else {
      recommendations.push('Install Node.js first, then install Claude Code CLI')
    }
  }

  return recommendations
}

// Clear environment cache
function clearEnvironmentCache() {
  environmentCache.clear()
  console.log('Environment detection cache cleared')
}

// 按依赖顺序排序软件列表
function sortByDependencies(softwareList: string[]): string[] {
  const dependencyOrder = ['git', 'nodejs', 'claude-code']
  return dependencyOrder.filter((software) => softwareList.includes(software))
}

// 转换检测结果为SoftwareStatus格式

// 转换函数
function convertGitToSoftwareStatus(gitStatus: any): SoftwareStatus {
  return {
    installed: gitStatus.installation?.installed || false,
    version: gitStatus.installation?.version,
    path: gitStatus.installation?.gitPath,
    error: gitStatus.installation?.installed ? undefined : '未安装Git',
    needsUpdate: gitStatus.compatibility?.updateRecommended || false
  }
}

function convertNodeJsInstallationToSoftwareStatus(installation: any): SoftwareStatus {
  return {
    installed: installation?.installed || false,
    version: installation?.version,
    path: installation?.nodePath,
    error: installation?.installed ? undefined : '未安装Node.js',
    needsUpdate: installation?.needsUpdate || false
  }
}

function convertNpmToSoftwareStatus(installation: any): SoftwareStatus {
  // 基于npmVersion的存在来判断npm是否安装，而不是依赖不存在的npmInstalled字段
  console.log('installation', installation)
  const isInstalled = !!installation?.npmVersion

  return {
    installed: isInstalled,
    version: installation?.npmVersion,
    path: installation?.npmPath,
    error: isInstalled ? undefined : '未安装npm',
    needsUpdate: false
  }
}

// 单独安装依赖的函数
async function installSingleDependency(
  software: string,
  options?: InstallationOptions
): Promise<any> {
  let installer: BaseInstallationManager

  switch (software) {
    case 'git':
      installer = new GitInstallationManager()
      break
    case 'nodejs':
      installer = new NodeJsInstallationManager()
      break
    case 'claude-code':
      installer = new ClaudeCodeInstallationManager()
      break
    default:
      return createErrorResponse(
        new Error(`Unsupported software: ${software}`),
        ERROR_CODES.VALIDATION_FAILED
      )
  }

  // 设置进度监听
  installer.on('progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('setup-wizard-installation-progress', {
        software,
        progress
      })
    }
  })

  try {
    const result = await installer.install(undefined, options)
    return {
      success: true,
      data: result,
      software,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return createErrorResponse(error, ERROR_CODES.INSTALLATION_FAILED)
  }
}

// Helper functions for environment detection

async function detectClaudeCli(check: boolean): Promise<SoftwareStatus> {
  if (!check) {
    return { installed: false }
  }

  try {
    // Use Claude detection manager
    const detectionManager = new ClaudeDetectionManager()
    const result = await detectionManager.detectClaude()

    if (result.success && result.claudePath) {
      return {
        installed: true,
        version: result.version || 'unknown',
        path: result.claudePath
      }
    } else {
      return {
        installed: false,
        error: result.error?.message || 'Claude Code CLI not found'
      }
    }
  } catch (error) {
    return {
      installed: false,
      error: 'Error detecting Claude Code CLI'
    }
  }
}

// Aone 认证管理 API
const aoneCredentialsService = getAoneCredentialsService()

// 获取全局 Aone 认证信息
ipcMain.handle('get-aone-credentials', async () => {
  try {
    const credentials = await aoneCredentialsService.getGlobalCredentials()
    return {
      success: true,
      data: credentials
    }
  } catch (error) {
    console.error('Failed to get Aone credentials:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get credentials'
    }
  }
})

// 保存全局 Aone 认证信息
ipcMain.handle('save-aone-credentials', async (_, authInfo) => {
  try {
    const credentials = await aoneCredentialsService.saveGlobalCredentials(authInfo)
    return {
      success: true,
      data: credentials
    }
  } catch (error) {
    console.error('Failed to save Aone credentials:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save credentials'
    }
  }
})

// 删除全局 Aone 认证信息
ipcMain.handle('delete-aone-credentials', async () => {
  try {
    const deleted = await aoneCredentialsService.deleteGlobalCredentials()
    return {
      success: true,
      data: { deleted }
    }
  } catch (error) {
    console.error('Failed to delete Aone credentials:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete credentials'
    }
  }
})

// 检查是否已配置 Aone 认证信息
ipcMain.handle('has-aone-credentials', async () => {
  try {
    const hasCredentials = await aoneCredentialsService.hasCredentials()
    return {
      success: true,
      data: { hasCredentials }
    }
  } catch (error) {
    console.error('Failed to check Aone credentials:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check credentials'
    }
  }
})

// 获取 Aone 认证信息（不包含私钥）
ipcMain.handle('get-aone-credentials-info', async () => {
  try {
    const credentialsInfo = await aoneCredentialsService.getCredentialsInfo()
    return {
      success: true,
      data: credentialsInfo
    }
  } catch (error) {
    console.error('Failed to get Aone credentials info:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get credentials info'
    }
  }
})
