/**
 * Windows Claude 检测器 (原生 Windows 环境)
 * 直接在 PowerShell/CMD 中检测，Claude Code 会自行管理 Git Bash 环境
 */

import { ChildProcess } from 'child_process'
import { PlatformClaudeDetector } from '../base/PlatformClaudeDetector'
import { executeCommand, spawnProcess, verifyExecutable } from '../utils/execUtils'
import type { ClaudeDetectionResult, ProcessResult, ExecutionOptions } from '../types'

export class WindowsClaudeDetector extends PlatformClaudeDetector {
  /**
   * 执行 Claude 检测
   */
  async detect(): Promise<ClaudeDetectionResult> {
    console.log('Starting Windows Claude detection in native environment...')

    // 1. 直接检测 Claude 命令
    const directResult = await this.detectDirectly()
    if (directResult.success) {
      this.claudePath = directResult.claudePath
      this.version = directResult.version
      return directResult
    }

    // 2. 通过包管理器检测
    const packageManagerResult = await this.detectViaPackageManagers()
    if (packageManagerResult.success) {
      this.claudePath = packageManagerResult.claudePath
      this.version = packageManagerResult.version
      return packageManagerResult
    }

    // 3. 检查用户配置
    const userResult = await this.checkUserConfig()
    if (userResult.success) {
      this.claudePath = userResult.claudePath
      this.version = userResult.version
      return userResult
    }

    // 4. 未找到 Claude
    console.log('Claude not found on Windows system')
    const notFoundResult = this.createNotFoundResult()
    return notFoundResult
  }

  /**
   * 直接检测 Claude 命令
   */
  private async detectDirectly(): Promise<ClaudeDetectionResult> {
    console.log('Detecting Claude directly in Windows environment...')

    try {
      // 使用 where 命令查找 claude
      const result = await executeCommand('where claude', { timeout: 5000 })

      if (result.exitCode === 0 && result.stdout.trim()) {
        const claudePath = result.stdout.trim().split('\n')[0]

        if (await this.verify(claudePath)) {
          const version = await this.getClaudeVersion(claudePath)
          console.log(`Found Claude via direct detection: ${claudePath}, version: ${version}`)

          return {
            success: true,
            platform: 'win32',
            executionMethod: 'native',
            claudePath,
            version: version || 'unknown',
            detectionMethod: 'direct',
            metadata: {
              environment: 'native',
              environmentDescription: 'Windows Native'
            }
          }
        }
      }
    } catch (error) {
      console.warn('Direct detection failed:', error)
    }

    // 尝试使用 PowerShell
    try {
      const psResult = await executeCommand(
        'powershell -Command "Get-Command claude -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source"',
        { timeout: 5000 }
      )

      if (psResult.exitCode === 0 && psResult.stdout.trim()) {
        const claudePath = psResult.stdout.trim()

        if (await this.verify(claudePath)) {
          const version = await this.getClaudeVersion(claudePath)
          console.log(`Found Claude via PowerShell: ${claudePath}, version: ${version}`)

          return {
            success: true,
            platform: 'win32',
            executionMethod: 'native',
            claudePath,
            version: version || 'unknown',
            detectionMethod: 'powershell',
            metadata: {
              environment: 'native',
              environmentDescription: 'Windows Native'
            }
          }
        }
      }
    } catch (error) {
      console.warn('PowerShell detection failed:', error)
    }

    return { success: false, platform: 'win32', executionMethod: 'native' }
  }

  /**
   * 通过 Node.js 包管理器检测 Claude
   */
  private async detectViaPackageManagers(): Promise<ClaudeDetectionResult> {
    console.log('Detecting Claude via Node.js package managers...')

    // Windows 环境下常见的包管理器检测
    const managers = [
      { name: 'npm', cmd: 'npm list -g claude --depth=0' },
      { name: 'fnm', cmd: 'fnm exec --using=default -- where claude' },
      { name: 'volta', cmd: 'volta run where claude' }
    ]

    for (const manager of managers) {
      try {
        console.log(`Trying ${manager.name}...`)

        let result: ProcessResult

        if (manager.name === 'npm') {
          // 对于 npm，先检查是否安装，然后获取路径
          result = await executeCommand(manager.cmd, { timeout: 10000 })
          if (result.exitCode === 0 && result.stdout.includes('claude@')) {
            // npm 找到了，现在获取实际路径
            const whereResult = await executeCommand('where claude', { timeout: 5000 })
            if (whereResult.exitCode === 0 && whereResult.stdout.trim()) {
              const claudePath = whereResult.stdout.trim().split('\n')[0]

              if (await this.verify(claudePath)) {
                const version = await this.getClaudeVersion(claudePath)
                console.log(`Found Claude via ${manager.name}: ${claudePath}, version: ${version}`)

                return {
                  success: true,
                  platform: 'win32',
                  executionMethod: 'native',
                  claudePath,
                  version: version || 'unknown',
                  detectionMethod: manager.name,
                  metadata: {
                    packageManager: manager.name,
                    environment: 'native',
                    environmentDescription: 'Windows Native'
                  }
                }
              }
            }
          }
        } else {
          // 对于其他包管理器，直接尝试获取路径
          result = await executeCommand(manager.cmd, { timeout: 8000 })
          if (result.exitCode === 0 && result.stdout.trim()) {
            const claudePath = result.stdout.trim().split('\n')[0]

            if (await this.verify(claudePath)) {
              const version = await this.getClaudeVersion(claudePath)
              console.log(`Found Claude via ${manager.name}: ${claudePath}, version: ${version}`)

              return {
                success: true,
                platform: 'win32',
                executionMethod: 'native',
                claudePath,
                version: version || 'unknown',
                detectionMethod: manager.name,
                metadata: {
                  packageManager: manager.name,
                  environment: 'native',
                  environmentDescription: 'Windows Native'
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`${manager.name} detection failed:`, error)
        continue
      }
    }

    return {
      success: false,
      platform: 'win32',
      executionMethod: 'native'
    }
  }

  /**
   * 获取 Claude 版本
   */
  private async getClaudeVersion(claudePath: string): Promise<string | null> {
    try {
      const result = await executeCommand(`"${claudePath}" --version`, { timeout: 5000 })

      if (result.exitCode === 0) {
        return this.parseVersion(result.stdout)
      }
    } catch (error) {
      console.warn(`Failed to get Claude version: ${error}`)
    }

    return null
  }

  /**
   * 检查用户配置的 Claude 路径
   */
  private async checkUserConfig(): Promise<ClaudeDetectionResult> {
    try {
      const { appSettingsService } = await import('../../database/services')
      const customPath = await appSettingsService.getClaudeBinaryPath()

      if (customPath && (await this.verify(customPath))) {
        const version = await this.getClaudeVersion(customPath)
        console.log(`Found Claude via user config: ${customPath}, version: ${version}`)

        return {
          success: true,
          platform: 'win32',
          executionMethod: 'native',
          claudePath: customPath,
          version: version || 'unknown',
          detectionMethod: 'user',
          metadata: {
            environment: 'native',
            environmentDescription: 'User configured'
          }
        }
      }
    } catch (error) {
      console.warn('Failed to check user config:', error)
    }

    return {
      success: false,
      platform: 'win32',
      executionMethod: 'native'
    }
  }

  /**
   * 验证 Claude 可执行文件
   */
  async verify(path: string): Promise<boolean> {
    try {
      const isExecutable = await verifyExecutable(path, '--version')

      if (!isExecutable) {
        return false
      }

      // 进一步验证是否确实是 Claude
      const version = await this.getClaudeVersion(path)
      return version !== null
    } catch (error) {
      console.warn(`Failed to verify Claude at ${path}:`, error)
      return false
    }
  }

  /**
   * 执行 Claude 命令
   */
  async execute(
    args: string[],
    workingDir: string,
    options: ExecutionOptions = {}
  ): Promise<ProcessResult> {
    if (!this.claudePath) {
      throw new Error('Claude not detected. Please run detection first.')
    }

    const command = `"${this.claudePath}" ${args.join(' ')}`
    console.log(`Executing Claude command: ${command}`)

    return executeCommand(command, {
      cwd: workingDir,
      timeout: 300000, // 5 分钟默认超时
      ...options
    })
  }

  /**
   * 启动交互式 Claude 会话
   */
  async startInteractiveSession(workingDir: string, args: string[] = []): Promise<ChildProcess> {
    if (!this.claudePath) {
      throw new Error('Claude not detected. Please run detection first.')
    }

    console.log(`Starting interactive Claude session in ${workingDir}`)

    // 直接启动 Claude，它会自己处理 Git Bash 环境
    return spawnProcess(this.claudePath, args, {
      cwd: workingDir
    })
  }

  /**
   * 生成平台特定的安装建议
   */
  protected generateInstallationSuggestions(): string[] {
    return [
      'Install Node.js from https://nodejs.org/',
      'Install Claude Code: npm install -g @anthropic-ai/claude-code',
      'Restart the application after installation',
      'Verify installation: open PowerShell and run "claude --version"'
    ]
  }
}
