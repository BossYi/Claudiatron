import { ipcMain } from 'electron'
import { setupWizardService } from '../database/services'
import { ClaudeDetectionManager } from '../detection/ClaudeDetectionManager'
import type {
  SetupWizardState,
  DetailedEnvironmentStatus,
  SoftwareStatus,
  EnvironmentDetectionRequest,
  EnvironmentDetectionResponse,
  ClaudeConfigValidationRequest,
  ClaudeConfigValidationResponse
} from '../types/setupWizard'
import { ERROR_CODES } from '../types/setupWizard'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'

const execAsync = promisify(exec)

// 缓存环境检测结果
const environmentCache = new Map<string, { data: DetailedEnvironmentStatus; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 互斥锁以防止并发操作
const operationLocks = new Map<string, Promise<any>>()

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

          if (checkGit) detectionPromises.push(detectGit(true).then((result) => ({ git: result })))
          if (checkNodejs) {
            detectionPromises.push(detectNodeJs(true).then((result) => ({ nodejs: result })))
            detectionPromises.push(detectNpm(true).then((result) => ({ npm: result })))
          }
          if (checkClaudeCli)
            detectionPromises.push(detectClaudeCli(true).then((result) => ({ claudeCli: result })))

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
          try {
            await setupWizardService.saveApiConfiguration({
              apiUrl: request.apiUrl,
              apiKey: request.apiKey,
              lastValidated: new Date().toISOString()
            })
          } catch (saveError) {
            console.warn('Failed to save API configuration:', saveError)
            // Don't fail validation if saving fails
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

  // Clone repository (enhanced placeholder)
  ipcMain.handle('setup-wizard-clone-repository', async (_, request) => {
    console.log('Main: setup-wizard-clone-repository called', request)

    return withLock('clone-repository', async () => {
      try {
        // Input validation
        if (!request || !request.url || !request.localPath) {
          return createErrorResponse(
            new Error('Repository URL and local path are required'),
            ERROR_CODES.VALIDATION_FAILED
          )
        }

        // TODO: Implement repository cloning
        // This would integrate with the Git detection and cloning services
        await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate cloning

        return {
          success: true,
          data: {
            status: 'completed',
            message: 'Repository cloned successfully',
            localPath: request.localPath
          },
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        return createErrorResponse(error, ERROR_CODES.CLONE_FAILED)
      }
    })
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

  // Install dependencies (enhanced placeholder)
  ipcMain.handle('setup-wizard-install-dependencies', async (_, software: string) => {
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

        // TODO: Implement actual installation logic
        // This would integrate with the installation managers
        await new Promise((resolve) => setTimeout(resolve, 3000)) // Simulate installation

        // Clear environment cache after installation
        clearEnvironmentCache()

        return {
          success: true,
          data: {
            installed: true,
            message: `${software} installation completed`,
            software
          },
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        return createErrorResponse(error, ERROR_CODES.INSTALLATION_FAILED)
      }
    })
  })

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

// Helper functions for environment detection

async function detectGit(check: boolean): Promise<SoftwareStatus> {
  if (!check) {
    return { installed: false }
  }

  try {
    const { stdout } = await execAsync('git --version')
    const versionMatch = stdout.match(/git version (\d+\.\d+\.\d+)/)

    return {
      installed: true,
      version: versionMatch ? versionMatch[1] : 'unknown',
      path: await findExecutablePath('git')
    }
  } catch (error) {
    return {
      installed: false,
      error: 'Git not found in PATH'
    }
  }
}

async function detectNodeJs(check: boolean): Promise<SoftwareStatus> {
  if (!check) {
    return { installed: false }
  }

  try {
    const { stdout } = await execAsync('node --version')
    const version = stdout.trim().replace('v', '')

    // Check if version is LTS compatible (>= 16)
    const majorVersion = parseInt(version.split('.')[0])
    const needsUpdate = majorVersion < 16

    return {
      installed: true,
      version,
      path: await findExecutablePath('node'),
      needsUpdate
    }
  } catch (error) {
    return {
      installed: false,
      error: 'Node.js not found in PATH'
    }
  }
}

async function detectNpm(check: boolean): Promise<SoftwareStatus> {
  if (!check) {
    return { installed: false }
  }

  try {
    const { stdout } = await execAsync('npm --version')
    const version = stdout.trim()

    return {
      installed: true,
      version,
      path: await findExecutablePath('npm')
    }
  } catch (error) {
    return {
      installed: false,
      error: 'npm not found in PATH'
    }
  }
}

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

async function findExecutablePath(command: string): Promise<string | undefined> {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    const { stdout } = await execAsync(`${cmd} ${command}`)
    return stdout.trim().split('\n')[0]
  } catch {
    return undefined
  }
}
