/**
 * Claude Code CLI 安装管理器
 *
 * 专门负责 Claude Code CLI 的自动安装和配置，包括：
 * - 通过 npm 全局安装 @anthropic-ai/claude-code
 * - Node.js 和 npm 依赖检查
 * - API 密钥配置和验证
 * - 安装后功能验证
 * - 版本管理和升级支持
 */

import { promises as fs } from 'fs'
import { join } from 'path'
import * as os from 'os'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import {
  BaseInstallationManager,
  InstallationPackage,
  InstallationOptions,
  InstallationResult
} from './BaseInstallationManager'
import { nodeJsDetectionService } from '../detection/NodeJsDetectionService'
import { ClaudeDetectionManager } from '../detection/ClaudeDetectionManager'
import type { InstallationProgress, SoftwareStatus } from '../types/setupWizard'

const execAsync = promisify(exec)

/**
 * Claude Code 特定的安装选项
 */
export interface ClaudeCodeInstallOptions extends InstallationOptions {
  /** API 密钥 */
  apiKey?: string
  /** API URL (默认为官方 API) */
  apiUrl?: string
  /** npm 镜像源 */
  registry?: string
  /** 跳过API密钥配置 */
  skipApiConfiguration?: boolean
  /** 安装前清理已有版本 */
  cleanInstall?: boolean
}

/**
 * Claude Code 安装结果
 */
export interface ClaudeCodeInstallResult extends InstallationResult {
  /** 是否配置了API密钥 */
  apiConfigured?: boolean
  /** Claude CLI 命令路径 */
  claudeCommand?: string
  /** 配置文件位置 */
  configPath?: string
}

/**
 * API 配置结果
 */
export interface ApiConfigurationResult {
  success: boolean
  configPath?: string
  error?: string
}

/**
 * Claude Code CLI 安装管理器
 *
 * 通过 npm 全局安装 Claude Code CLI，不是传统的二进制安装包
 */
export class ClaudeCodeInstallationManager extends BaseInstallationManager {
  private readonly claudeDetectionManager: ClaudeDetectionManager

  constructor() {
    super()
    this.claudeDetectionManager = new ClaudeDetectionManager()
  }

  /**
   * 获取软件名称
   */
  protected getSoftwareName(): InstallationProgress['software'] {
    return 'claude-code'
  }

  /**
   * 获取安装包信息
   * Claude Code 通过 npm 安装，不需要下载包
   */
  protected async getPackageInfo(version?: string): Promise<InstallationPackage> {
    // 获取最新版本信息
    const packageVersion = version || (await this.getLatestVersion())

    return {
      name: '@anthropic-ai/claude-code',
      version: packageVersion,
      downloadUrl: '', // npm 安装不需要下载URL
      filename: '',
      checksumType: 'sha256',
      checksum: '', // npm 会自动处理包验证
      platform: this.platform,
      arch: this.arch
    }
  }

  /**
   * 获取最新版本号
   */
  private async getLatestVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync('npm view @anthropic-ai/claude-code version')
      return stdout.trim()
    } catch (error) {
      this.log('无法获取最新版本，使用默认版本', 'warning')
      return 'latest'
    }
  }

  /**
   * 验证系统兼容性
   */
  protected async validateSystemCompatibility(): Promise<{
    compatible: boolean
    requirements: string[]
    issues: string[]
  }> {
    const requirements: string[] = ['Node.js >= 16.0.0', 'npm >= 8.0.0', '网络连接 (用于下载包)']
    const issues: string[] = []

    try {
      // 检查 Node.js 环境
      const nodeStatus = await nodeJsDetectionService.getEnvironmentStatus()

      if (!nodeStatus.nodejs.installed) {
        issues.push('Node.js 未安装')
      } else {
        const version = nodeStatus.nodejs.version || '0.0.0'
        const majorVersion = parseInt(version.split('.')[0])
        if (majorVersion < 16) {
          issues.push(`Node.js 版本过低 (${version})，需要 >= 16.0.0`)
        }
      }

      if (!nodeStatus.npm.installed) {
        issues.push('npm 未安装')
      } else {
        const npmVersion = nodeStatus.npm.version || '0.0.0'
        const majorVersion = parseInt(npmVersion.split('.')[0])
        if (majorVersion < 8) {
          issues.push(`npm 版本过低 (${npmVersion})，需要 >= 8.0.0`)
        }
      }

      // 检查网络连接
      try {
        await this.checkNetworkConnectivity()
      } catch (error) {
        issues.push('无法连接到 npm 镜像源')
      }

      // 检查是否已安装
      const existingInstallation = await this.checkExistingInstallation()
      if (existingInstallation.installed) {
        this.log(`检测到已安装的 Claude Code CLI: ${existingInstallation.version}`, 'info')
      }
    } catch (error) {
      issues.push(`系统兼容性检查失败: ${error}`)
    }

    return {
      compatible: issues.length === 0,
      requirements,
      issues
    }
  }

  /**
   * 检查网络连接性
   */
  private async checkNetworkConnectivity(): Promise<void> {
    try {
      await execAsync('npm ping', { timeout: 5000 })
    } catch (error) {
      throw new Error('无法连接到 npm 镜像源')
    }
  }

  /**
   * 检查现有安装
   */
  private async checkExistingInstallation(): Promise<SoftwareStatus> {
    try {
      const result = await this.claudeDetectionManager.detectClaude()
      if (result.success && result.claudePath) {
        return {
          installed: true,
          version: result.version || 'unknown',
          path: result.claudePath
        }
      }
    } catch (error) {
      this.log(`检查现有安装时出错: ${error}`, 'debug')
    }

    return { installed: false }
  }

  /**
   * 执行安装
   */
  protected async performInstallation(
    _packagePath: string, // 对于 npm 安装，此参数无效
    options: ClaudeCodeInstallOptions = {}
  ): Promise<ClaudeCodeInstallResult> {
    try {
      // 1. 准备安装命令
      const installCommand = this.buildInstallCommand(options)
      this.log(`准备执行安装命令: ${installCommand}`, 'info')

      // 2. 清理现有安装（如果需要）
      if (options.cleanInstall) {
        this.reportProgress('configuring', 5, '清理现有安装...')
        await this.cleanExistingInstallation()
      }

      // 3. 执行 npm 安装
      this.reportProgress('downloading', 10, '开始安装 Claude Code CLI...')
      const installResult = await this.executeNpmInstall(installCommand, options)

      if (!installResult.success) {
        throw new Error(installResult.error || 'npm 安装失败')
      }

      // 4. 验证安装
      this.reportProgress('verifying', 80, '验证安装结果...')
      const verification = await this.verifyInstallation('')

      if (!verification.valid) {
        throw new Error(`安装验证失败: ${verification.issues.join(', ')}`)
      }

      // 5. 配置 API 密钥（如果提供）
      let apiConfigured = false
      let configPath: string | undefined

      if (options.apiKey && !options.skipApiConfiguration) {
        this.reportProgress('configuring', 90, '配置 API 密钥...')
        const configResult = await this.configureApi(options.apiKey, options.apiUrl)
        apiConfigured = configResult.success
        configPath = configResult.configPath

        if (!apiConfigured) {
          this.log(`API 配置失败: ${configResult.error}`, 'warning')
        }
      }

      return {
        success: true,
        installPath: await this.getGlobalNpmPath(),
        executablePath: verification.executablePath,
        installedVersion: verification.version,
        apiConfigured,
        claudeCommand: verification.executablePath,
        configPath
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.log(`Claude Code 安装失败: ${errorMessage}`, 'error')

      return {
        success: false,
        error: errorMessage,
        details: error
      }
    }
  }

  /**
   * 构建安装命令
   */
  private buildInstallCommand(options: ClaudeCodeInstallOptions): string {
    const parts = ['npm', 'install', '-g']

    // 添加镜像源
    if (options.registry) {
      parts.push('--registry', options.registry)
    }

    // 添加包名
    const packageName = options.customArgs?.includes('--version')
      ? `@anthropic-ai/claude-code@${options.customArgs[options.customArgs.indexOf('--version') + 1]}`
      : '@anthropic-ai/claude-code'

    parts.push(packageName)

    return parts.join(' ')
  }

  /**
   * 执行 npm 安装
   */
  private async executeNpmInstall(
    command: string,
    options: ClaudeCodeInstallOptions
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ')
      const child = spawn(cmd, args, {
        stdio: 'pipe',
        env: { ...process.env, ...options.envVars }
      })

      let stdout = ''
      let stderr = ''
      let lastProgress = 10

      child.stdout?.on('data', (data) => {
        const output = data.toString()
        stdout += output

        // 解析 npm 输出以报告进度
        if (output.includes('downloading')) {
          lastProgress = Math.min(lastProgress + 10, 60)
          this.reportProgress('downloading', lastProgress, '下载依赖包...')
        } else if (output.includes('installing')) {
          lastProgress = Math.min(lastProgress + 10, 75)
          this.reportProgress('installing', lastProgress, '安装中...')
        }
      })

      child.stderr?.on('data', (data) => {
        const output = data.toString()
        stderr += output

        // npm 的一些警告信息是正常的
        if (!output.includes('WARN') && !output.includes('deprecated')) {
          this.log(`npm stderr: ${output}`, 'debug')
        }
      })

      child.on('close', (code) => {
        if (code === 0) {
          this.log('npm 安装完成', 'info')
          resolve({ success: true })
        } else {
          const error = stderr || `npm 安装失败，退出代码: ${code}`
          this.log(`npm 安装失败: ${error}`, 'error')
          resolve({ success: false, error })
        }
      })

      child.on('error', (error) => {
        this.log(`npm 安装进程错误: ${error}`, 'error')
        resolve({ success: false, error: error.message })
      })
    })
  }

  /**
   * 清理现有安装
   */
  private async cleanExistingInstallation(): Promise<void> {
    try {
      await execAsync('npm uninstall -g @anthropic-ai/claude-code')
      this.log('已清理现有安装', 'info')
    } catch (error) {
      // 如果卸载失败，可能是没有安装，继续执行
      this.log('清理现有安装时出现警告（可能没有现有安装）', 'debug')
    }
  }

  /**
   * 获取全局 npm 路径
   */
  private async getGlobalNpmPath(): Promise<string> {
    try {
      const { stdout } = await execAsync('npm root -g')
      return stdout.trim()
    } catch {
      // 如果无法获取，返回默认路径
      return process.platform === 'win32'
        ? join(os.homedir(), 'AppData', 'Roaming', 'npm')
        : '/usr/local/lib/node_modules'
    }
  }

  /**
   * 验证安装
   */
  protected async verifyInstallation(_installPath: string): Promise<{
    valid: boolean
    version?: string
    executablePath?: string
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // 1. 检查 claude 命令是否可用
      const { stdout: versionOutput } = await execAsync('claude --version')
      const version = versionOutput.trim()

      // 2. 检查命令路径
      const executablePath = await this.findClaudeExecutable()

      // 3. 基本功能测试
      try {
        await execAsync('claude --help', { timeout: 5000 })
      } catch (error) {
        issues.push('claude --help 命令执行失败')
      }

      if (issues.length === 0) {
        this.log(`Claude Code CLI 验证成功: ${version}`, 'info')
        return {
          valid: true,
          version,
          executablePath,
          issues: []
        }
      } else {
        return {
          valid: false,
          issues
        }
      }
    } catch (error) {
      issues.push('无法执行 claude 命令')
      issues.push(`错误详情: ${error}`)

      return {
        valid: false,
        issues
      }
    }
  }

  /**
   * 查找 Claude 可执行文件
   */
  private async findClaudeExecutable(): Promise<string | undefined> {
    try {
      const cmd = process.platform === 'win32' ? 'where claude' : 'which claude'
      const { stdout } = await execAsync(cmd)
      return stdout.trim().split('\n')[0]
    } catch {
      return undefined
    }
  }

  /**
   * 配置 API 密钥
   */
  public async configureApi(
    apiKey: string,
    apiUrl: string = 'https://api.anthropic.com'
  ): Promise<ApiConfigurationResult> {
    try {
      this.log('开始配置 API 密钥', 'info')

      // 1. 验证 API 密钥格式
      if (!apiKey.startsWith('sk-')) {
        return {
          success: false,
          error: 'API 密钥格式无效，必须以 sk- 开头'
        }
      }

      // 2. 创建配置文件目录
      const configDir = join(os.homedir(), '.claude')
      await fs.mkdir(configDir, { recursive: true })

      // 3. 写入配置文件
      const configPath = join(configDir, 'config.json')
      const config = {
        api_key: apiKey,
        api_url: apiUrl,
        configured_at: new Date().toISOString()
      }

      await fs.writeFile(configPath, JSON.stringify(config, null, 2))

      // 4. 设置文件权限（仅所有者可读写）
      if (process.platform !== 'win32') {
        await fs.chmod(configPath, 0o600)
      }

      // 5. 验证配置
      try {
        // 这里可以添加 API 连接测试
        // const testResult = await execAsync('claude test-connection', { timeout: 10000 })
        this.log('API 配置完成', 'info')
      } catch (error) {
        this.log('API 配置写入成功，但连接测试失败', 'warning')
      }

      return {
        success: true,
        configPath
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.log(`API 配置失败: ${errorMessage}`, 'error')

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * 检查是否需要更新
   */
  public async checkForUpdates(): Promise<{
    updateAvailable: boolean
    currentVersion?: string
    latestVersion?: string
    updateCommand?: string
  }> {
    try {
      const currentInstallation = await this.checkExistingInstallation()
      if (!currentInstallation.installed) {
        return { updateAvailable: false }
      }

      const latestVersion = await this.getLatestVersion()
      const currentVersion = currentInstallation.version

      const updateAvailable =
        currentVersion !== latestVersion &&
        currentVersion !== 'unknown' &&
        latestVersion !== 'latest'

      return {
        updateAvailable,
        currentVersion,
        latestVersion,
        updateCommand: updateAvailable ? `npm update -g @anthropic-ai/claude-code` : undefined
      }
    } catch (error) {
      this.log(`检查更新时出错: ${error}`, 'warning')
      return { updateAvailable: false }
    }
  }

  /**
   * 卸载 Claude Code CLI
   */
  public async uninstall(): Promise<{ success: boolean; error?: string }> {
    try {
      this.log('开始卸载 Claude Code CLI', 'info')

      await execAsync('npm uninstall -g @anthropic-ai/claude-code')

      // 可选：清理配置文件
      try {
        const configPath = join(os.homedir(), '.claude', 'config.json')
        await fs.unlink(configPath)
        this.log('已清理配置文件', 'info')
      } catch {
        // 配置文件可能不存在，忽略错误
      }

      this.log('Claude Code CLI 卸载完成', 'info')
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.log(`卸载失败: ${errorMessage}`, 'error')
      return { success: false, error: errorMessage }
    }
  }
}
